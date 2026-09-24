# VoxelCraft — Sandbox & Multiplayer

Jogo voxel em 3D no navegador: mundo infinito gerado por ruído, mineração e
construção, ciclo dia/noite, clima, criaturas hostis, multijogador em tempo real
e chat de voz entre os jogadores da sala.

Feito com React 19, Three.js e um servidor Express + WebSocket.

## Rodar localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:3000` — ou `https://localhost:3000` se você já tiver
gerado o certificado (veja abaixo).

## Chat de voz

O áudio vai direto de um navegador para o outro por WebRTC. O servidor só
repassa a apresentação entre os pares e nunca ouve nada. A malha é ponto a
ponto, então serve para salas pequenas: o limite é 6 pares (`MAX_PARES` em
`src/game/voice.ts`).

Ligue no botão **Voz** e **segure V para falar**. No celular, um botão "Falar"
aparece junto do "Pular". Dá para deixar o microfone aberto, sem push-to-talk.

O navegador só libera o microfone em **origem segura**: `localhost` ou `https`.
Para testar com outra pessoa na rede:

```bash
npm run cert   # gera um certificado para localhost e os IPs desta máquina
npm run dev
```

Cada navegador vai avisar que o certificado não é confiável na primeira visita —
é esperado, basta aceitar. **Rode `npm run cert` de novo quando o IP da máquina
mudar.** Para voltar ao `http` sem apagar o certificado: `npm run dev:http`.

## Instalar como app (PWA)

O jogo é instalável: ganha ícone próprio e abre em tela cheia, sem barra de
navegador. O service worker só é registrado no build de produção.

```bash
npm run app   # build + servidor de produção
```

No Chrome aparece o botão de instalar na barra de endereço; no celular, em
*menu → Instalar app*; no iPhone, *Compartilhar → Adicionar à Tela de Início*.

Um aviso: **certificado auto-assinado impede a instalação**. O navegador recusa
registrar o service worker em página com erro de certificado, mesmo depois de
você aceitar o aviso. Em `localhost` funciona, porque localhost é considerado
seguro por definição. Para instalar no celular, hospede o jogo (abaixo).

## Hospedar

O `Dockerfile` empacota cliente e servidor numa imagem só, sem `node_modules`:
o servidor vai bundlado com express e ws dentro, e a imagem final carrega apenas
`dist/` e `server.js`.

Funciona em qualquer serviço que rode container. Com o `render.yaml` incluído, no
[Render](https://render.com) é *New → Blueprint* apontando para o repositório.

Rodando o container localmente:

```bash
docker build -t voxelcraft .
docker run -p 3000:3000 voxelcraft
```

Em produção o servidor sobe em **http** de propósito: quem termina o TLS é a
hospedagem, que entrega https para o jogador. O cliente detecta o esquema e usa
`wss` sozinho.

Duas coisas para saber antes de escolher o plano:

- **O estado do mundo vive em memória.** Blocos modificados, salas e jogadores
  somem quando o processo reinicia. Em planos gratuitos que hibernam por
  inatividade, isso acontece com frequência.
- **A primeira visita depois da hibernação demora.** No plano gratuito do Render
  o serviço dorme e leva perto de um minuto para acordar.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | desenvolvimento, com recarga automática |
| `npm run dev:http` | idem, forçando http mesmo com certificado presente |
| `npm run build` | build do cliente em `dist/` |
| `npm run build:server` | empacota o servidor em `server.js` |
| `npm start` | servidor de produção (serve o `dist/`) |
| `npm run app` | `build` + `start` |
| `npm run cert` | gera o certificado de desenvolvimento |
| `npm run icones` | regenera os ícones do app |
| `npm run lint` | checagem de tipos |

## Estrutura

```
server.ts           servidor: Express, WebSocket, salas, repasse da voz
src/game/           motor: mundo, chunks, física, mobs, clima, rede, voz
src/components/     interface: HUD, inventário, minimapa, chat, controles
scripts/            geradores de certificado e de ícones
```
