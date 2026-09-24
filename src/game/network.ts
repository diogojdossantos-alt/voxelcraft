import * as THREE from 'three';
import { RemotePlayerAvatar } from './avatar';
import { BlockType } from './constants';

export interface ChatMessage {
  id: string;
  sender: string;
  color: string;
  text: string;
  timestamp: number;
}

export interface NetworkConfig {
  name: string;
  roomId: string;
  color: string;
  seed?: number;
}

export class NetworkManager {
  private ws: WebSocket | null = null;
  public playerId: string | null = null;
  public isConnected: boolean = false;
  public currentRoom: string = 'lobby';
  public seed: number = 12345;
  public pingMs: number = 0;
  private pingStart: number = 0;
  private heartbeatTimer: any = null;

  // HTTP Fallback State (used when WebSocket is restricted in cross-origin iframes)
  private useHttpFallback: boolean = false;
  /** disconnect() ja rodou: nao ressuscitar a conexao por um evento atrasado. */
  private isDisposed: boolean = false;
  private httpPollTimer: any = null;
  private cachedConfig: NetworkConfig | null = null;
  private pendingBlocksToSend: Array<{ x: number; y: number; z: number; blockType: BlockType }> = [];
  private pendingChatToSend: string[] = [];
  private latestMoveData: {
    x: number;
    y: number;
    z: number;
    rotY: number;
    pitch: number;
    isSneaking: boolean;
    isPunching: boolean;
    selectedBlock: number;
  } | null = null;
  private knownModifiedBlocks: Record<string, number> = {};

  public remotePlayers: Map<string, RemotePlayerAvatar> = new Map();
  public chatMessages: ChatMessage[] = [];

  // Callbacks
  public onInitReceived?: (data: { seed: number; modifiedBlocks: Record<string, number>; timeOfDay: number; chatHistory?: ChatMessage[] }) => void;
  public onBlockUpdated?: (x: number, y: number, z: number, blockType: BlockType, byPlayerId: string) => void;
  public onChatReceived?: (msg: ChatMessage) => void;
  public onPlayerListChanged?: () => void;
  public onVoiceSignal?: (de: string, data: any) => void;
  public onVoiceState?: (id: string, enabled: boolean) => void;

  private scene: THREE.Scene;
  private lastMoveSend: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public connect(config: NetworkConfig) {
    this.cachedConfig = config;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.useHttpFallback = false;
        this.ws?.send(
          JSON.stringify({
            type: 'join',
            roomId: config.roomId,
            name: config.name,
            color: config.color,
            seed: config.seed,
          })
        );
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch {
          // Ignore JSON parse errors silently
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        // If WebSocket closes unexpectedly, gracefully switch to HTTP fallback
        if (!this.useHttpFallback && !this.isDisposed) {
          this.startHttpFallback(config);
        }
      };

      this.ws.onerror = () => {
        // Use console.warn instead of console.error so iframe error harness does not treat normal WS fallback as a fatal app crash
        if (this.isDisposed) return; // socket fechado pela propria limpeza
        console.warn('[VoxelCraft] WebSocket direct connection unavailable. Activating HTTP multiplayer sync.');
        if (!this.useHttpFallback) {
          this.startHttpFallback(config);
        }
      };
    } catch {
      // Fallback if WebSocket constructor throws
      this.startHttpFallback(config);
    }
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.pingStart = performance.now();
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 5000);
  }

  // HTTP Fallback Implementation
  private async startHttpFallback(config: NetworkConfig) {
    if (this.useHttpFallback || this.isDisposed) return;
    this.useHttpFallback = true;

    try {
      const res = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: config.roomId,
          name: config.name,
          color: config.color,
          seed: config.seed,
        }),
      });

      if (!res.ok) {
        console.warn('[VoxelCraft] HTTP room join returned status', res.status);
        return;
      }

      const data = await res.json();
      if (data.status === 'ok') {
        this.isConnected = true;
        this.playerId = data.playerId;
        this.currentRoom = data.roomId;
        this.seed = data.seed;
        this.chatMessages = data.chatHistory || [];
        this.knownModifiedBlocks = { ...(data.modifiedBlocks || {}) };

        // Spawn existing remote players
        if (Array.isArray(data.players)) {
          for (const p of data.players) {
            if (p.id !== this.playerId && !this.remotePlayers.has(p.id)) {
              const avatar = new RemotePlayerAvatar(this.scene, p.id, p.name, p.color);
              avatar.targetPos.set(p.x, p.y, p.z);
              avatar.group.position.set(p.x, p.y, p.z);
              this.remotePlayers.set(p.id, avatar);
            }
          }
        }

        if (this.onInitReceived) {
          this.onInitReceived({
            seed: data.seed,
            modifiedBlocks: data.modifiedBlocks,
            timeOfDay: data.timeOfDay,
            chatHistory: data.chatHistory,
          });
        }
        if (this.onPlayerListChanged) this.onPlayerListChanged();

        // Start polling for updates every 1000ms
        this.startHttpPolling();
      }
    } catch {
      console.warn('[VoxelCraft] Operating in offline singleplayer mode.');
    }
  }

  private startHttpPolling() {
    if (this.httpPollTimer) clearInterval(this.httpPollTimer);
    this.httpPollTimer = setInterval(() => {
      this.pollHttpSync();
    }, 1000);
  }

  private async pollHttpSync() {
    if (!this.isConnected || !this.playerId) return;

    const blocksToSend = [...this.pendingBlocksToSend];
    this.pendingBlocksToSend = [];

    const chatsToSend = [...this.pendingChatToSend];
    this.pendingChatToSend = [];

    try {
      const startMs = performance.now();
      const res = await fetch('/api/room/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.currentRoom,
          playerId: this.playerId,
          x: this.latestMoveData?.x,
          y: this.latestMoveData?.y,
          z: this.latestMoveData?.z,
          rotY: this.latestMoveData?.rotY,
          pitch: this.latestMoveData?.pitch,
          isSneaking: this.latestMoveData?.isSneaking,
          isPunching: this.latestMoveData?.isPunching,
          selectedBlock: this.latestMoveData?.selectedBlock,
          modifiedBlocks: blocksToSend,
          newChats: chatsToSend,
        }),
      });

      if (!res.ok) return;

      this.pingMs = Math.round(performance.now() - startMs);
      const data = await res.json();

      // Synchronize other players
      if (Array.isArray(data.players)) {
        const activeIds = new Set<string>();
        for (const p of data.players) {
          activeIds.add(p.id);
          let avatar = this.remotePlayers.get(p.id);
          if (!avatar) {
            avatar = new RemotePlayerAvatar(this.scene, p.id, p.name, p.color);
            this.remotePlayers.set(p.id, avatar);
            if (this.onPlayerListChanged) this.onPlayerListChanged();
          }
          avatar.targetPos.set(p.x, p.y, p.z);
          avatar.targetYaw = p.rotY;
          avatar.targetPitch = p.pitch;
          avatar.isSneaking = Boolean(p.isSneaking);
          avatar.isPunching = Boolean(p.isPunching);
          if (p.selectedBlock) avatar.setHeldBlock(p.selectedBlock);
        }

        // Remove players who left
        for (const [id, avatar] of this.remotePlayers.entries()) {
          if (!activeIds.has(id)) {
            avatar.dispose(this.scene);
            this.remotePlayers.delete(id);
            if (this.onPlayerListChanged) this.onPlayerListChanged();
          }
        }
      }

      // Synchronize modified blocks
      if (data.modifiedBlocks) {
        for (const [key, blkType] of Object.entries(data.modifiedBlocks)) {
          if (this.knownModifiedBlocks[key] !== blkType) {
            this.knownModifiedBlocks[key] = blkType as number;
            const [bx, by, bz] = key.split(',').map(Number);
            if (!isNaN(bx) && !isNaN(by) && !isNaN(bz)) {
              if (this.onBlockUpdated) {
                this.onBlockUpdated(bx, by, bz, blkType as BlockType, 'remote');
              }
            }
          }
        }
      }

      // Synchronize chat
      if (Array.isArray(data.chatHistory) && data.chatHistory.length > 0) {
        const lastLocal = this.chatMessages[this.chatMessages.length - 1];
        const lastLocalTime = lastLocal ? lastLocal.timestamp : 0;
        for (const c of data.chatHistory) {
          if (c.timestamp > lastLocalTime && !this.chatMessages.some((m) => m.id === c.id)) {
            this.chatMessages.push(c);
            if (this.chatMessages.length > 50) this.chatMessages.shift();
            if (this.onChatReceived) this.onChatReceived(c);
          }
        }
      }
    } catch {
      // Re-queue pending items on network glitch
      this.pendingBlocksToSend.unshift(...blocksToSend);
      this.pendingChatToSend.unshift(...chatsToSend);
    }
  }

  private handleMessage(msg: any) {
    switch (msg.type) {
      case 'init': {
        this.playerId = msg.playerId;
        this.currentRoom = msg.roomId;
        this.seed = msg.seed;
        this.chatMessages = msg.chatHistory || [];

        // Spawn existing players
        if (Array.isArray(msg.players)) {
          for (const p of msg.players) {
            if (p.id !== this.playerId && !this.remotePlayers.has(p.id)) {
              const avatar = new RemotePlayerAvatar(this.scene, p.id, p.name, p.color);
              avatar.targetPos.set(p.x, p.y, p.z);
              avatar.group.position.set(p.x, p.y, p.z);
              this.remotePlayers.set(p.id, avatar);
            }
          }
        }

        if (this.onInitReceived) {
          this.onInitReceived({
            seed: msg.seed,
            modifiedBlocks: msg.modifiedBlocks,
            timeOfDay: msg.timeOfDay,
            chatHistory: msg.chatHistory,
          });
        }
        if (this.onPlayerListChanged) this.onPlayerListChanged();
        break;
      }

      case 'player:joined': {
        const p = msg.player;
        if (p.id !== this.playerId && !this.remotePlayers.has(p.id)) {
          const avatar = new RemotePlayerAvatar(this.scene, p.id, p.name, p.color);
          avatar.targetPos.set(p.x, p.y, p.z);
          avatar.group.position.set(p.x, p.y, p.z);
          this.remotePlayers.set(p.id, avatar);
          if (this.onPlayerListChanged) this.onPlayerListChanged();
        }
        break;
      }

      case 'voice:signal': {
        if (this.onVoiceSignal && msg.from) this.onVoiceSignal(msg.from, msg.data);
        break;
      }

      case 'voice:state': {
        if (this.onVoiceState && msg.id) this.onVoiceState(msg.id, !!msg.enabled);
        break;
      }

      case 'player:moved': {
        const avatar = this.remotePlayers.get(msg.id);
        if (avatar) {
          avatar.targetPos.set(msg.x, msg.y, msg.z);
          avatar.targetYaw = msg.rotY;
          avatar.targetPitch = msg.pitch;
          avatar.isSneaking = msg.isSneaking;
          avatar.isPunching = msg.isPunching;
          if (msg.selectedBlock) avatar.setHeldBlock(msg.selectedBlock);
        }
        break;
      }

      case 'player:left': {
        const avatar = this.remotePlayers.get(msg.id);
        if (avatar) {
          avatar.dispose(this.scene);
          this.remotePlayers.delete(msg.id);
          if (this.onPlayerListChanged) this.onPlayerListChanged();
        }
        break;
      }

      case 'block:updated': {
        if (this.onBlockUpdated) {
          this.onBlockUpdated(msg.x, msg.y, msg.z, msg.blockType, msg.byPlayerId);
        }
        break;
      }

      case 'chat:message': {
        if (msg.message && !this.chatMessages.some((m) => m.id === msg.message.id)) {
          this.chatMessages.push(msg.message);
          if (this.chatMessages.length > 50) this.chatMessages.shift();
          if (this.onChatReceived) this.onChatReceived(msg.message);
        }
        break;
      }

      case 'pong': {
        this.pingMs = Math.round(performance.now() - this.pingStart);
        break;
      }
    }
  }

  public sendMove(
    pos: THREE.Vector3,
    rotY: number,
    pitch: number,
    isSneaking: boolean,
    isPunching: boolean,
    selectedBlock: BlockType
  ) {
    this.latestMoveData = {
      x: Number(pos.x.toFixed(2)),
      y: Number(pos.y.toFixed(2)),
      z: Number(pos.z.toFixed(2)),
      rotY: Number(rotY.toFixed(2)),
      pitch: Number(pitch.toFixed(2)),
      isSneaking,
      isPunching,
      selectedBlock,
    };

    const now = performance.now();
    if (now - this.lastMoveSend < 50) return; // 20 updates per sec limit
    this.lastMoveSend = now;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'player:move',
          ...this.latestMoveData,
        })
      );
    }
  }

  public sendVoiceSignal(para: string, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'voice:signal', to: para, data }));
    }
  }

  public sendVoiceState(enabled: boolean) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'voice:state', enabled }));
    }
  }

  public sendBlockUpdate(x: number, y: number, z: number, blockType: BlockType) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'block:update',
          x,
          y,
          z,
          blockType,
        })
      );
    } else if (this.useHttpFallback) {
      this.pendingBlocksToSend.push({ x, y, z, blockType });
      this.pollHttpSync();
    }
  }

  public sendChat(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'chat:send',
          text,
        })
      );
    } else if (this.useHttpFallback) {
      this.pendingChatToSend.push(text);
      this.pollHttpSync();
    }
  }

  public updateAvatars(delta: number) {
    for (const avatar of this.remotePlayers.values()) {
      avatar.update(delta);
    }
  }

  public disconnect() {
    this.isDisposed = true;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.httpPollTimer) clearInterval(this.httpPollTimer);

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    for (const avatar of this.remotePlayers.values()) {
      avatar.dispose(this.scene);
    }
    this.remotePlayers.clear();
    this.isConnected = false;
    this.useHttpFallback = false;
  }
}
