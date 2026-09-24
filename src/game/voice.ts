/**
 * Chat de voz em tempo real entre os jogadores da sala.
 *
 * O audio vai direto de um jogador para o outro (WebRTC, malha ponto a ponto):
 * o servidor so entrega a apresentacao inicial entre os pares e nunca ve o som.
 * Isso mantem a latencia baixa, mas custa uma conexao por par, entao a malha
 * so faz sentido em salas pequenas -- ver MAX_PARES.
 */

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/** Acima disso a malha vira um problema: N jogadores = N-1 conexoes cada. */
export const MAX_PARES = 6;

/** Volume acima do qual consideramos que a pessoa esta falando. */
const LIMIAR_FALA = 0.045;

interface Par {
  pc: RTCPeerConnection;
  audio: HTMLAudioElement;
  analyser?: AnalyserNode;
  buffer?: Float32Array;
  falando: boolean;
  /** Sinais de ICE que chegaram antes da descricao remota estar pronta. */
  icePendente: RTCIceCandidateInit[];
}

export interface VoiceSignal {
  kind: 'offer' | 'answer' | 'ice';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export class VoiceChat {
  /** O microfone foi liberado e o sistema esta no ar. */
  public ativo = false;
  /** Sem push-to-talk: transmite o tempo todo. */
  public microfoneAberto = false;
  /** Segurando a tecla de falar (ou microfone aberto). */
  public transmitindo = false;
  /** Ultimo erro legivel, para a interface mostrar. */
  public erro: string | null = null;

  private stream: MediaStream | null = null;
  private pares = new Map<string, Par>();
  private audioCtx: AudioContext | null = null;
  private analyserLocal: AnalyserNode | null = null;
  private bufferLocal: Float32Array | null = null;
  private meuId: string | null = null;

  /** Entrega um sinal para outro jogador (vai pelo WebSocket do jogo). */
  public enviarSinal: (para: string, data: VoiceSignal) => void = () => {};
  /** Avisa a interface que algo mudou (ativo, transmitindo, quem fala). */
  public onMudanca?: () => void;

  /** Ids de quem esta falando neste instante, inclusive voce. */
  public falando = new Set<string>();

  public definirMeuId(id: string | null) {
    this.meuId = id;
  }

  /**
   * Pede o microfone e liga o sistema. Retorna false se o usuario negou
   * ou se o navegador bloqueou (origem insegura, por exemplo).
   */
  public async ligar(idsNaSala: string[]): Promise<boolean> {
    if (this.ativo) return true;
    this.erro = null;

    if (!navigator.mediaDevices?.getUserMedia) {
      // getUserMedia so existe em origem segura: https ou localhost.
      this.erro = 'O navegador bloqueou o microfone. Use https ou localhost.';
      this.onMudanca?.();
      return false;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
    } catch (e: any) {
      this.erro =
        e?.name === 'NotAllowedError'
          ? 'Permissao de microfone negada.'
          : 'Nao foi possivel abrir o microfone.';
      this.onMudanca?.();
      return false;
    }

    this.ativo = true;
    this.aplicarTransmissao(); // entra mudo ate apertar para falar
    this.montarAnalisadorLocal();

    for (const id of idsNaSala) this.conectarCom(id);

    this.onMudanca?.();
    return true;
  }

  public desligar() {
    for (const [id] of this.pares) this.encerrarPar(id);
    this.pares.clear();

    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;

    this.analyserLocal = null;
    this.bufferLocal = null;
    this.audioCtx?.close().catch(() => {});
    this.audioCtx = null;

    this.ativo = false;
    this.transmitindo = false;
    this.falando.clear();
    this.onMudanca?.();
  }

  /** Push-to-talk: chamado no keydown/keyup da tecla de falar. */
  public definirTransmissao(ligado: boolean) {
    if (this.transmitindo === ligado) return;
    this.transmitindo = ligado;
    this.aplicarTransmissao();
    this.onMudanca?.();
  }

  public definirMicrofoneAberto(aberto: boolean) {
    this.microfoneAberto = aberto;
    this.aplicarTransmissao();
    this.onMudanca?.();
  }

  private aplicarTransmissao() {
    const enviar = this.microfoneAberto || this.transmitindo;
    this.stream?.getAudioTracks().forEach((t) => {
      t.enabled = enviar;
    });
    if (!enviar && this.meuId) this.falando.delete(this.meuId);
  }

  /** Chamado quando a lista de jogadores da sala muda. */
  public sincronizarPares(idsNaSala: string[]) {
    if (!this.ativo) return;

    const atuais = new Set(idsNaSala);
    for (const id of [...this.pares.keys()]) {
      if (!atuais.has(id)) this.encerrarPar(id);
    }
    for (const id of idsNaSala) {
      if (!this.pares.has(id)) this.conectarCom(id);
    }
  }

  private criarPar(id: string): Par {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.stream?.getTracks().forEach((t) => pc.addTrack(t, this.stream!));

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        this.enviarSinal(id, { kind: 'ice', candidate: ev.candidate.toJSON() });
      }
    };

    pc.ontrack = (ev) => {
      const par = this.pares.get(id);
      if (!par) return;
      par.audio.srcObject = ev.streams[0];
      par.audio.play().catch(() => {
        // Autoplay barrado ate o primeiro gesto do usuario; o clique no botao resolve.
      });
      this.montarAnalisadorRemoto(id, ev.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.encerrarPar(id);
        this.onMudanca?.();
      }
    };

    const audio = document.createElement('audio');
    audio.autoplay = true;

    const par: Par = { pc, audio, falando: false, icePendente: [] };
    this.pares.set(id, par);
    return par;
  }

  private async conectarCom(id: string) {
    if (!this.ativo || this.pares.has(id) || id === this.meuId) return;
    if (this.pares.size >= MAX_PARES) return;

    const par = this.criarPar(id);

    // So um dos lados propoe, senao as duas ofertas colidem. O criterio e
    // arbitrario, mas precisa ser o mesmo nos dois navegadores.
    if (this.meuId && this.meuId < id) {
      try {
        const oferta = await par.pc.createOffer();
        await par.pc.setLocalDescription(oferta);
        this.enviarSinal(id, { kind: 'offer', sdp: oferta });
      } catch {
        this.encerrarPar(id);
      }
    }
  }

  /**
   * Outro jogador acabou de ligar a voz. Quem estava ligado antes ja pode ter
   * ofertado no vazio, e a oferta foi ignorada por quem ainda estava mudo --
   * entao o lado ofertante recomeca a negociacao do zero.
   */
  public async aoSaberQueLigou(id: string) {
    if (!this.ativo || id === this.meuId) return;
    const souOfertante = !!this.meuId && this.meuId < id;
    if (souOfertante) {
      this.encerrarPar(id);
      await this.conectarCom(id);
    } else if (!this.pares.has(id) && this.pares.size < MAX_PARES) {
      this.criarPar(id); // espera a oferta do outro lado
    }
  }

  /** Outro jogador desligou a voz: libera a conexao. */
  public aoSaberQueDesligou(id: string) {
    if (!this.pares.has(id)) return;
    this.encerrarPar(id);
    this.onMudanca?.();
  }

  public async receberSinal(de: string, data: VoiceSignal) {
    if (!this.ativo || de === this.meuId) return;

    let par = this.pares.get(de);
    if (!par) {
      if (data.kind !== 'offer') return; // ice/answer sem par e resto de conexao antiga
      par = this.criarPar(de);
    }

    try {
      if (data.kind === 'offer' && data.sdp) {
        await par.pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await this.drenarIce(de);
        const resposta = await par.pc.createAnswer();
        await par.pc.setLocalDescription(resposta);
        this.enviarSinal(de, { kind: 'answer', sdp: resposta });
      } else if (data.kind === 'answer' && data.sdp) {
        await par.pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await this.drenarIce(de);
      } else if (data.kind === 'ice' && data.candidate) {
        if (par.pc.remoteDescription) {
          await par.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          // Candidato chegou antes da descricao: guarda para depois.
          par.icePendente.push(data.candidate);
        }
      }
    } catch {
      // Sinal fora de ordem ou par ja morto: deixa a conexao seguir sem ele.
    }
  }

  private async drenarIce(id: string) {
    const par = this.pares.get(id);
    if (!par) return;
    for (const c of par.icePendente.splice(0)) {
      try {
        await par.pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {
        // candidato invalido: ignora
      }
    }
  }

  private encerrarPar(id: string) {
    const par = this.pares.get(id);
    if (!par) return;
    try {
      par.pc.onicecandidate = null;
      par.pc.ontrack = null;
      par.pc.onconnectionstatechange = null;
      par.pc.close();
    } catch {
      // ja fechado
    }
    par.audio.srcObject = null;
    par.audio.remove();
    this.pares.delete(id);
    this.falando.delete(id);
  }

  private garantirAudioCtx(): AudioContext | null {
    if (!this.audioCtx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      this.audioCtx = new Ctor();
    }
    return this.audioCtx;
  }

  private montarAnalisadorLocal() {
    const ctx = this.garantirAudioCtx();
    if (!ctx || !this.stream) return;
    const src = ctx.createMediaStreamSource(this.stream);
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    this.analyserLocal = an;
    this.bufferLocal = new Float32Array(an.fftSize);
  }

  private montarAnalisadorRemoto(id: string, stream: MediaStream) {
    const ctx = this.garantirAudioCtx();
    const par = this.pares.get(id);
    if (!ctx || !par) return;
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    par.analyser = an;
    par.buffer = new Float32Array(an.fftSize);
  }

  private volume(an: AnalyserNode, buf: Float32Array): number {
    an.getFloatTimeDomainData(buf as any);
    let soma = 0;
    for (let i = 0; i < buf.length; i++) soma += buf[i] * buf[i];
    return Math.sqrt(soma / buf.length); // RMS
  }

  /** Chamado pelo loop do jogo: atualiza quem esta falando. */
  public atualizar() {
    if (!this.ativo) return;
    let mudou = false;

    if (this.analyserLocal && this.bufferLocal && this.meuId) {
      const enviando = this.microfoneAberto || this.transmitindo;
      const falando = enviando && this.volume(this.analyserLocal, this.bufferLocal) > LIMIAR_FALA;
      if (falando !== this.falando.has(this.meuId)) {
        falando ? this.falando.add(this.meuId) : this.falando.delete(this.meuId);
        mudou = true;
      }
    }

    for (const [id, par] of this.pares) {
      if (!par.analyser || !par.buffer) continue;
      const falando = this.volume(par.analyser, par.buffer) > LIMIAR_FALA;
      if (falando !== par.falando) {
        par.falando = falando;
        falando ? this.falando.add(id) : this.falando.delete(id);
        mudou = true;
      }
    }

    if (mudou) this.onMudanca?.();
  }

  public get paresConectados(): number {
    return this.pares.size;
  }

  public dispose() {
    this.desligar();
    this.onMudanca = undefined;
  }
}
