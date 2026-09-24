/**
 * Gera os icones do app (PWA) sem depender de nenhuma biblioteca.
 *
 * Desenha um bloco de grama em 16x16, no mesmo espirito das texturas do jogo,
 * e amplia por vizinho mais proximo para manter a borda quadrada. O PNG e
 * escrito na mao: cabecalho, IDAT comprimido com zlib e CRC32. E pouca coisa,
 * e evita trazer uma dependencia de imagem so para isso.
 *
 * Rode com: npm run icones
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'public', 'icones');

// ---------- PNG ----------
const tabelaCrc = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = tabelaCrc[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function bloco(tipo, dados) {
  const tam = Buffer.alloc(4);
  tam.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tam, corpo, crc]);
}

/** rgba: Uint8Array com 4 bytes por pixel, largura*altura. */
function png(largura, altura, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 6; // RGBA
  // 10, 11, 12 = compressao, filtro e entrelacamento padrao (zero)

  // Cada linha e precedida por um byte de filtro; 0 = sem filtro.
  const linhas = Buffer.alloc(altura * (largura * 4 + 1));
  for (let y = 0; y < altura; y++) {
    const destinoLinha = y * (largura * 4 + 1);
    linhas[destinoLinha] = 0;
    rgba.copy
      ? rgba.copy(linhas, destinoLinha + 1, y * largura * 4, (y + 1) * largura * 4)
      : Buffer.from(rgba).copy(linhas, destinoLinha + 1, y * largura * 4, (y + 1) * largura * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr),
    bloco('IDAT', deflateSync(linhas, { level: 9 })),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- desenho ----------
const cor = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
  255,
];

const FUNDO = cor('#0f172a');
const GRAMA = [cor('#22c55e'), cor('#16a34a'), cor('#4ade80')];
const TERRA = [cor('#8b5a2b'), cor('#7c4a21'), cor('#a06a35')];

/** Ruido estavel: mesmo icone toda vez que rodar. */
function pseudo(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Bloco de grama 16x16: faixa de grama em cima, terra embaixo. */
function desenharBloco() {
  const lado = 16;
  const px = [];
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const r = pseudo(x, y);
      let c;
      if (y < 4) {
        c = GRAMA[Math.floor(r * GRAMA.length)];
      } else if (y === 4 && r > 0.5) {
        c = GRAMA[1]; // borda irregular entre grama e terra
      } else {
        c = TERRA[Math.floor(r * TERRA.length)];
      }
      px.push(c);
    }
  }
  return { lado, px };
}

/**
 * @param {number} tamanho lado final em pixels
 * @param {number} margem fracao de 0 a 0.5 de folga em volta (icone mascarado)
 */
function render(tamanho, margem) {
  const { lado, px } = desenharBloco();
  const buf = Buffer.alloc(tamanho * tamanho * 4);

  const folga = Math.round(tamanho * margem);
  const area = tamanho - folga * 2;
  const escala = area / lado;

  for (let y = 0; y < tamanho; y++) {
    for (let x = 0; x < tamanho; x++) {
      const bx = Math.floor((x - folga) / escala);
      const by = Math.floor((y - folga) / escala);
      const dentro = bx >= 0 && bx < lado && by >= 0 && by < lado;
      const c = dentro ? px[by * lado + bx] : FUNDO;
      const i = (y * tamanho + x) * 4;
      buf[i] = c[0];
      buf[i + 1] = c[1];
      buf[i + 2] = c[2];
      buf[i + 3] = c[3];
    }
  }
  return png(tamanho, tamanho, buf);
}

mkdirSync(destino, { recursive: true });

const saidas = [
  ['icone-192.png', render(192, 0.06)],
  ['icone-512.png', render(512, 0.06)],
  // Android recorta o icone em formatos variados: o conteudo precisa caber na
  // "zona segura" central, por isso a margem maior.
  ['icone-mascarado-512.png', render(512, 0.22)],
];

for (const [nome, dados] of saidas) {
  writeFileSync(join(destino, nome), dados);
  console.log(`${nome}  (${(dados.length / 1024).toFixed(1)} KB)`);
}
console.log('Icones gerados em public/icones/');
