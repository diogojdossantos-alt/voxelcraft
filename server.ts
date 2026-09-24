import express from 'express';
import { createServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { readFileSync, existsSync } from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// O navegador so libera o microfone em "origem segura": localhost ou https.
// Com o certificado gerado por `npm run cert`, o servidor sobe em https e o
// chat de voz passa a funcionar tambem para quem entra pelo IP da rede.
const CERT_DIR = path.join(__dirname, 'certs');
const CERT_FILE = path.join(CERT_DIR, 'cert.pem');
const KEY_FILE = path.join(CERT_DIR, 'key.pem');
// VOXEL_HTTP=1 forca http mesmo com o certificado presente (npm run dev:http).
export const usandoHttps =
  !process.env.VOXEL_HTTP && existsSync(CERT_FILE) && existsSync(KEY_FILE);

const httpServer = usandoHttps
  ? createHttpsServer({ cert: readFileSync(CERT_FILE), key: readFileSync(KEY_FILE) }, app)
  : createServer(app);
// noServer: com a opcao { server } o ws captura TODO upgrade, inclusive o do
// HMR do Vite, e os dois se atropelavam. O roteamento por caminho fica abaixo.
const wss = new WebSocketServer({ noServer: true });
export const WS_PATH = '/ws';

httpServer.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url || '/', `http://${req.headers.host}`);
  if (pathname !== WS_PATH) return; // deixa o HMR do Vite com o dele
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

const PORT = Number(process.env.PORT) || 3000;

interface RemotePlayer {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  pitch: number;
  isSneaking: boolean;
  isPunching: boolean;
  selectedBlock: number;
  lastUpdate: number;
}

interface ChatMessage {
  id: string;
  sender: string;
  color: string;
  text: string;
  timestamp: number;
}

interface Room {
  id: string;
  seed: number;
  modifiedBlocks: Map<string, number>; // "x,y,z" -> blockId (0 is air/broken)
  players: Map<string, RemotePlayer>;
  clients: Map<string, WebSocket>;
  chatHistory: ChatMessage[];
  timeOfDay: number; // 0..1
}

const rooms = new Map<string, Room>();

function getOrCreateRoom(roomId: string, requestedSeed?: number): Room {
  let room = rooms.get(roomId);
  if (!room) {
    const seed = requestedSeed && !isNaN(requestedSeed) ? requestedSeed : Math.floor(Math.random() * 900000) + 100000;
    room = {
      id: roomId,
      seed,
      modifiedBlocks: new Map<string, number>(),
      players: new Map<string, RemotePlayer>(),
      clients: new Map<string, WebSocket>(),
      chatHistory: [],
      timeOfDay: 0.25, // Morning sunrise/day
    };
    rooms.set(roomId, room);
    console.log(`[Room created] ${roomId} with seed ${seed}`);
  }
  return room;
}

// Broadcast helper for a room
function broadcastToRoom(room: Room, message: any, excludeId?: string) {
  const data = JSON.stringify(message);
  for (const [id, client] of room.clients.entries()) {
    if (excludeId && id === excludeId) continue;
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(data);
      } catch (err) {
        console.error(`Error sending message to ${id}:`, err);
      }
    }
  }
}

// Day-night cycle progression tick on server
setInterval(() => {
  for (const room of rooms.values()) {
    // 20 minutes full cycle -> 0.05 per minute -> 0.000833 per second
    room.timeOfDay = (room.timeOfDay + 0.0004) % 1.0;
  }
}, 1000);

wss.on('connection', (ws: WebSocket) => {
  let playerId = 'p_' + Math.random().toString(36).substring(2, 9);
  let currentRoom: Room | null = null;

  ws.on('message', (raw: string) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'join') {
        const roomId = (msg.roomId || 'lobby').trim().toLowerCase().slice(0, 24);
        const name = (msg.name || 'Minexplorer').trim().slice(0, 16);
        const color = msg.color || '#3b82f6';
        const requestedSeed = msg.seed ? Number(msg.seed) : undefined;

        currentRoom = getOrCreateRoom(roomId, requestedSeed);

        // Register client
        currentRoom.clients.set(playerId, ws);

        const newPlayer: RemotePlayer = {
          id: playerId,
          name,
          color,
          x: msg.x ?? 0,
          y: msg.y ?? 25,
          z: msg.z ?? 0,
          rotY: 0,
          pitch: 0,
          isSneaking: false,
          isPunching: false,
          selectedBlock: 1,
          lastUpdate: Date.now(),
        };

        currentRoom.players.set(playerId, newPlayer);

        // Send init state to the joining player
        const modifiedBlocksObj: Record<string, number> = {};
        for (const [pos, blk] of currentRoom.modifiedBlocks.entries()) {
          modifiedBlocksObj[pos] = blk;
        }

        const existingPlayers = Array.from(currentRoom.players.values());

        ws.send(
          JSON.stringify({
            type: 'init',
            playerId,
            roomId: currentRoom.id,
            seed: currentRoom.seed,
            modifiedBlocks: modifiedBlocksObj,
            players: existingPlayers,
            chatHistory: currentRoom.chatHistory.slice(-20),
            timeOfDay: currentRoom.timeOfDay,
          })
        );

        // Notify other players
        broadcastToRoom(
          currentRoom,
          {
            type: 'player:joined',
            player: newPlayer,
          },
          playerId
        );

        // System chat notification
        const joinChat: ChatMessage = {
          id: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          sender: 'Sistema',
          color: '#eab308',
          text: `${name} entrou no mundo!`,
          timestamp: Date.now(),
        };
        currentRoom.chatHistory.push(joinChat);
        if (currentRoom.chatHistory.length > 50) currentRoom.chatHistory.shift();
        broadcastToRoom(currentRoom, { type: 'chat:message', message: joinChat });
      } else if (msg.type === 'player:move' && currentRoom) {
        const p = currentRoom.players.get(playerId);
        if (p) {
          p.x = msg.x;
          p.y = msg.y;
          p.z = msg.z;
          p.rotY = msg.rotY;
          p.pitch = msg.pitch;
          p.isSneaking = Boolean(msg.isSneaking);
          p.isPunching = Boolean(msg.isPunching);
          p.selectedBlock = Number(msg.selectedBlock) || 1;
          p.lastUpdate = Date.now();

          broadcastToRoom(
            currentRoom,
            {
              type: 'player:moved',
              id: playerId,
              x: p.x,
              y: p.y,
              z: p.z,
              rotY: p.rotY,
              pitch: p.pitch,
              isSneaking: p.isSneaking,
              isPunching: p.isPunching,
              selectedBlock: p.selectedBlock,
            },
            playerId
          );
        }
      } else if (msg.type === 'block:update' && currentRoom) {
        const key = `${Math.floor(msg.x)},${Math.floor(msg.y)},${Math.floor(msg.z)}`;
        const blkType = Number(msg.blockType) || 0;
        currentRoom.modifiedBlocks.set(key, blkType);

        broadcastToRoom(
          currentRoom,
          {
            type: 'block:updated',
            x: Math.floor(msg.x),
            y: Math.floor(msg.y),
            z: Math.floor(msg.z),
            blockType: blkType,
            byPlayerId: playerId,
          }
        );
      } else if (msg.type === 'chat:send' && currentRoom) {
        const text = String(msg.text || '').trim().slice(0, 150);
        if (text.length > 0) {
          const player = currentRoom.players.get(playerId);
          const chatMsg: ChatMessage = {
            id: 'c_' + Math.random().toString(36).substring(2, 9),
            sender: player ? player.name : 'Desconhecido',
            color: player ? player.color : '#60a5fa',
            text,
            timestamp: Date.now(),
          };
          currentRoom.chatHistory.push(chatMsg);
          if (currentRoom.chatHistory.length > 50) currentRoom.chatHistory.shift();
          broadcastToRoom(currentRoom, { type: 'chat:message', message: chatMsg });
        }
      } else if (msg.type === 'voice:signal' && currentRoom) {
        // Entrega a apresentacao WebRTC ao destinatario. O audio em si nunca
        // passa por aqui: vai direto de um navegador para o outro.
        const alvo = currentRoom.clients.get(String(msg.to));
        if (alvo && alvo.readyState === WebSocket.OPEN) {
          alvo.send(JSON.stringify({ type: 'voice:signal', from: playerId, data: msg.data }));
        }
      } else if (msg.type === 'voice:state' && currentRoom) {
        broadcastToRoom(
          currentRoom,
          { type: 'voice:state', id: playerId, enabled: !!msg.enabled },
          playerId
        );
      } else if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', time: Date.now() }));
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      const p = currentRoom.players.get(playerId);
      currentRoom.players.delete(playerId);
      currentRoom.clients.delete(playerId);

      if (p) {
        broadcastToRoom(currentRoom, {
          type: 'player:left',
          id: playerId,
        });

        const leaveChat: ChatMessage = {
          id: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          sender: 'Sistema',
          color: '#94a3b8',
          text: `${p.name} saiu do mundo.`,
          timestamp: Date.now(),
        };
        currentRoom.chatHistory.push(leaveChat);
        broadcastToRoom(currentRoom, { type: 'chat:message', message: leaveChat });
      }

      // Cleanup empty room if not default lobby
      if (currentRoom.players.size === 0 && currentRoom.id !== 'lobby') {
        setTimeout(() => {
          if (currentRoom && currentRoom.players.size === 0) {
            rooms.delete(currentRoom.id);
            console.log(`[Room closed] ${currentRoom.id}`);
          }
        }, 60000);
      }
    }
  });
});

// REST API Endpoints for Health & HTTP Multiplayer Fallback
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

app.post('/api/room/join', (req, res) => {
  try {
    const { roomId = 'lobby', name = 'Minexplorer', color = '#3b82f6', seed } = req.body || {};
    const cleanRoomId = String(roomId || 'lobby').trim().toLowerCase().slice(0, 24);
    const cleanName = String(name || 'Minexplorer').trim().slice(0, 16);
    const room = getOrCreateRoom(cleanRoomId, seed ? Number(seed) : undefined);
    const playerId = 'http_' + Math.random().toString(36).substring(2, 9);

    const newPlayer: RemotePlayer = {
      id: playerId,
      name: cleanName,
      color: String(color || '#3b82f6'),
      x: 0,
      y: 25,
      z: 0,
      rotY: 0,
      pitch: 0,
      isSneaking: false,
      isPunching: false,
      selectedBlock: 1,
      lastUpdate: Date.now(),
    };
    room.players.set(playerId, newPlayer);

    const modifiedBlocksObj: Record<string, number> = {};
    for (const [pos, blk] of room.modifiedBlocks.entries()) {
      modifiedBlocksObj[pos] = blk;
    }

    const existingPlayers = Array.from(room.players.values()).filter((p) => p.id !== playerId);

    broadcastToRoom(room, {
      type: 'player:joined',
      player: newPlayer,
    });

    res.json({
      status: 'ok',
      playerId,
      roomId: room.id,
      seed: room.seed,
      modifiedBlocks: modifiedBlocksObj,
      players: existingPlayers,
      chatHistory: room.chatHistory.slice(-20),
      timeOfDay: room.timeOfDay,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/room/sync', (req, res) => {
  try {
    const { roomId, playerId, x, y, z, rotY, pitch, isSneaking, isPunching, selectedBlock, modifiedBlocks, newChats } = req.body || {};
    if (!roomId || !playerId) {
      return res.status(400).json({ error: 'Missing roomId or playerId' });
    }
    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const p = room.players.get(playerId);
    if (p && typeof x === 'number' && typeof y === 'number' && typeof z === 'number') {
      p.x = x;
      p.y = y;
      p.z = z;
      p.rotY = rotY ?? p.rotY;
      p.pitch = pitch ?? p.pitch;
      p.isSneaking = Boolean(isSneaking);
      p.isPunching = Boolean(isPunching);
      p.selectedBlock = Number(selectedBlock) || p.selectedBlock;
      p.lastUpdate = Date.now();

      broadcastToRoom(
        room,
        {
          type: 'player:moved',
          id: playerId,
          x: p.x,
          y: p.y,
          z: p.z,
          rotY: p.rotY,
          pitch: p.pitch,
          isSneaking: p.isSneaking,
          isPunching: p.isPunching,
          selectedBlock: p.selectedBlock,
        },
        playerId
      );
    }

    if (Array.isArray(modifiedBlocks)) {
      for (const b of modifiedBlocks) {
        const key = `${Math.floor(b.x)},${Math.floor(b.y)},${Math.floor(b.z)}`;
        const blkType = Number(b.blockType) || 0;
        room.modifiedBlocks.set(key, blkType);
        broadcastToRoom(
          room,
          {
            type: 'block:updated',
            x: Math.floor(b.x),
            y: Math.floor(b.y),
            z: Math.floor(b.z),
            blockType: blkType,
            byPlayerId: playerId,
          },
          playerId
        );
      }
    }

    if (Array.isArray(newChats)) {
      for (const text of newChats) {
        const cleanText = String(text || '').trim().slice(0, 150);
        if (cleanText) {
          const chatMsg: ChatMessage = {
            id: 'c_' + Math.random().toString(36).substring(2, 9),
            sender: p ? p.name : 'Desconhecido',
            color: p ? p.color : '#60a5fa',
            text: cleanText,
            timestamp: Date.now(),
          };
          room.chatHistory.push(chatMsg);
          if (room.chatHistory.length > 50) room.chatHistory.shift();
          broadcastToRoom(room, { type: 'chat:message', message: chatMsg });
        }
      }
    }

    // Clean stale HTTP players
    const now = Date.now();
    for (const [pid, player] of room.players.entries()) {
      if (pid.startsWith('http_') && pid !== playerId && now - player.lastUpdate > 15000) {
        room.players.delete(pid);
        broadcastToRoom(room, { type: 'player:left', id: pid });
      }
    }

    const modifiedBlocksObj: Record<string, number> = {};
    for (const [pos, blk] of room.modifiedBlocks.entries()) {
      modifiedBlocksObj[pos] = blk;
    }

    res.json({
      players: Array.from(room.players.values()).filter((item) => item.id !== playerId),
      modifiedBlocks: modifiedBlocksObj,
      chatHistory: room.chatHistory.slice(-20),
      timeOfDay: room.timeOfDay,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Setup Express and Vite
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      // hmr.server faz o Vite entrar em modo noServer e responder so ao
      // proprio protocolo, sem disputar o upgrade com o wss do jogo.
      server: { middlewareMode: true, ws: { server: httpServer } },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    const esquema = usandoHttps ? 'https' : 'http';
    console.log(`🚀 VoxelCraft server running on ${esquema}://0.0.0.0:${PORT}`);
    if (usandoHttps) {
      console.log('   Certificado proprio: cada navegador avisa uma vez, e so aceitar.');
    } else {
      console.log('   Sem https: o microfone so funciona em localhost. Rode: npm run cert');
    }
  });
}

startServer().catch(console.error);
