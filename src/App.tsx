import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { BlockType, BLOCK_METAS } from './game/constants';
import { World } from './game/world';
import { Player, TargetBlock } from './game/player';
import { Environment } from './game/environment';
import { WeatherSystem, WeatherType } from './game/weather';
import { NetworkManager, ChatMessage } from './game/network';
import { VoiceChat } from './game/voice';
import { MobManager, MobDrop } from './game/mobs';
import { sound } from './game/audio';
import { HUD } from './components/HUD';
import { InventoryModal } from './components/InventoryModal';
import { ChatBox } from './components/ChatBox';
import { RoomModal } from './components/RoomModal';
import { SettingsModal } from './components/SettingsModal';
import { DeathModal } from './components/DeathModal';
import { MobileControls } from './components/MobileControls';
import { MiniMap } from './components/MiniMap';
import { Play, Sparkles, Users, Globe, Compass, Pickaxe, Shield } from 'lucide-react';

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Game Engine Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const worldRef = useRef<World | null>(null);
  const playerRef = useRef<Player | null>(null);
  const envRef = useRef<Environment | null>(null);
  const weatherRef = useRef<WeatherSystem | null>(null);
  const networkRef = useRef<NetworkManager | null>(null);
  const mobManagerRef = useRef<MobManager | null>(null);
  const isCreativeRef = useRef<boolean>(false);
  const voiceRef = useRef<VoiceChat | null>(null);
  const lastDamageTimeRef = useRef<number>(Date.now());
  const lastRegenTimeRef = useRef<number>(Date.now());

  // UI State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPointerLocked, setIsPointerLocked] = useState<boolean>(false);
  const [health, setHealth] = useState<number>(20);
  const [isDead, setIsDead] = useState<boolean>(false);
  const [deathCause, setDeathCause] = useState<string>('');
  const [damageFlash, setDamageFlash] = useState<boolean>(false);
  const [nearbyHostiles, setNearbyHostiles] = useState<number>(0);
  const [weather, setWeather] = useState<WeatherType>('clear');
  const [isWeatherAuto, setIsWeatherAuto] = useState<boolean>(true);
  // No celular o mapa comeca fechado: a tela e pequena e ele cobre o jogo.
  // O botao Mapa abre quando a pessoa quiser.
  const [showMiniMap, setShowMiniMap] = useState<boolean>(
    () => !(typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0))
  );
  const [playerYaw, setPlayerYaw] = useState<number>(0);
  const temToque =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const [showOnScreenControls, setShowOnScreenControls] = useState<boolean>(() => {
    return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  });
  const [hotbar, setHotbar] = useState<BlockType[]>([
    BlockType.GRASS,
    BlockType.DIRT,
    BlockType.STONE,
    BlockType.WOOD_PLANKS,
    BlockType.WOOD_LOG,
    BlockType.BRICKS,
    BlockType.GLASS,
    BlockType.TORCH,
    BlockType.TNT,
  ]);
  const [selectedSlot, setSelectedSlot] = useState<number>(0);
  const [targetBlock, setTargetBlock] = useState<TargetBlock | null>(null);
  const [breakProgress, setBreakProgress] = useState<number>(0);
  const [fps, setFps] = useState<number>(60);
  const [ping, setPing] = useState<number>(0);
  const [playerPos, setPlayerPos] = useState({ x: 8.5, y: 22, z: 8.5 });
  const [isFlying, setIsFlying] = useState<boolean>(false);
  const [voiceOn, setVoiceOn] = useState<boolean>(false);
  const [voiceTalking, setVoiceTalking] = useState<boolean>(false);
  const [voiceOpenMic, setVoiceOpenMic] = useState<boolean>(false);
  const [voiceSpeakers, setVoiceSpeakers] = useState<string[]>([]);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isThirdPerson, setIsThirdPerson] = useState<boolean>(false);
  const [isCreative, setIsCreative] = useState<boolean>(false);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [inventoryCounts, setInventoryCounts] = useState<Record<number, number>>({
    [BlockType.WOOD_LOG]: 16,
    [BlockType.DIRT]: 32,
    [BlockType.STONE]: 20,
    [BlockType.COBBLESTONE]: 24,
    [BlockType.WOOD_PLANKS]: 16,
    [BlockType.STICK]: 8,
    [BlockType.SAND]: 12,
    [BlockType.COAL_ORE]: 8,
    [BlockType.IRON_ORE]: 4,
  });

  // Modals
  const [inventoryOpen, setInventoryOpen] = useState<boolean>(false);
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [roomsOpen, setRoomsOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  // Settings & Network Config
  const [renderRadius, setRenderRadius] = useState<number>(3);
  const [timeOfDay, setTimeOfDay] = useState<number>(0.25);
  const [isCyclePaused, setIsCyclePaused] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.4);

  // Network State
  const [roomName, setRoomName] = useState<string>('lobby');
  const [playerName, setPlayerName] = useState<string>('Construtor_' + Math.floor(Math.random() * 900 + 100));
  const [playerColor, setPlayerColor] = useState<string>('#3b82f6');
  const [worldSeed, setWorldSeed] = useState<number>(42891);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Parse URL query params for instant room join (e.g. ?room=meu-mundo&seed=12345)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const seedParam = params.get('seed');
    if (roomParam) setRoomName(roomParam.toLowerCase().slice(0, 24));
    if (seedParam && !isNaN(Number(seedParam))) setWorldSeed(Number(seedParam));
  }, []);

  // Initialize Game Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(72, width / height, 0.1, 400);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap; // PCFSoftShadowMap foi removido no r186
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. World
    const world = new World(scene, worldSeed);
    worldRef.current = world;

    // 5. Environment & Weather System
    const env = new Environment(scene);
    envRef.current = env;

    const weatherSystem = new WeatherSystem(scene);
    weatherRef.current = weatherSystem;

    weatherSystem.onWeatherChanged = (newWeather) => {
      setWeather(newWeather);
      const msgMap: Record<WeatherType, string> = {
        clear: '☀️ O tempo abriu e o céu voltou a ficar limpo!',
        rain: '🌧️ Nuvens escuras cobriram o céu e uma chuva torrencial começou!',
        snow: '❄️ A temperatura caiu e flocos de neve começaram a cair suavemente...',
      };
      setChatMessages((prev) => [
        ...prev.slice(-49),
        {
          id: `weather-${Date.now()}-${Math.random()}`,
          sender: 'Clima',
          text: msgMap[newWeather],
          color: newWeather === 'clear' ? '#f59e0b' : newWeather === 'rain' ? '#38bdf8' : '#e2e8f0',
          timestamp: Date.now(),
          isSystem: true,
        },
      ]);
    };

    // 6. Player
    const player = new Player(world, camera);
    playerRef.current = player;
    setPlayerPos({ x: player.position.x, y: player.position.y, z: player.position.z });

    // Initial chunk load around player spawn
    world.loadChunksAround(player.position.x, player.position.z);

    // 7. Network Manager
    const network = new NetworkManager(scene);
    networkRef.current = network;

    network.onInitReceived = (data) => {
      setTimeOfDay(data.timeOfDay);
      if (envRef.current) envRef.current.timeOfDay = data.timeOfDay;
      if (data.modifiedBlocks) {
        world.applyRemoteModifications(data.modifiedBlocks);
      }
      if (Array.isArray(data.chatHistory) && data.chatHistory.length > 0) {
        setChatMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newOnes = (data.chatHistory || []).filter((m) => !existingIds.has(m.id));
          return [...prev, ...newOnes].slice(-50);
        });
      }
    };

    network.onBlockUpdated = (x, y, z, blockType) => {
      world.setBlock(x, y, z, blockType, true);
    };

    network.onChatReceived = (msg) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev.slice(-49), msg];
      });
    };

    // Voz: a malha WebRTC usa o proprio WebSocket do jogo para se apresentar
    const voice = new VoiceChat();
    voiceRef.current = voice;
    voice.enviarSinal = (para, data) => network.sendVoiceSignal(para, data);
    voice.onMudanca = () => {
      setVoiceOn(voice.ativo);
      setVoiceTalking(voice.transmitindo || voice.microfoneAberto);
      setVoiceOpenMic(voice.microfoneAberto);
      setVoiceSpeakers(
        [...voice.falando].map((id) =>
          id === network.playerId ? 'Voce' : network.remotePlayers.get(id)?.name || id
        )
      );
      setVoiceError(voice.erro);
    };
    network.onVoiceSignal = (de, data) => voice.receberSinal(de, data);
    network.onVoiceState = (id, enabled) => {
      if (enabled) voice.aoSaberQueLigou(id);
      else voice.aoSaberQueDesligou(id);
    };

    network.onPlayerListChanged = () => {
      setOnlineCount(network.remotePlayers.size + 1);
      voice.definirMeuId(network.playerId);
      voice.sincronizarPares([...network.remotePlayers.keys()]);
    };

    network.connect({
      name: playerName,
      roomId: roomName,
      color: playerColor,
      seed: worldSeed,
    });

    // 8. Mob Manager (Hostile AI Entities: Zombies & Skeletons)
    const mobManager = new MobManager(scene, world);
    mobManagerRef.current = mobManager;

    // 9. Animation & Game Loop
    const timer = new THREE.Timer();
    timer.connect(document); // zera o delta com a aba oculta, evitando o salto na volta
    let frameCount = 0;
    let lastFpsTime = performance.now();
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      timer.update();
      const delta = Math.min(timer.getDelta(), 0.1);

      // Update Player
      player.heldItemType = hotbar[selectedSlot] || BlockType.GRASS;
      player.update(delta, (mined) => {
        // Mining completed: break block
        world.setBlock(mined.x, mined.y, mined.z, BlockType.AIR, true);
        network.sendBlockUpdate(mined.x, mined.y, mined.z, BlockType.AIR);

        const meta = BLOCK_METAS[mined.type];
        const dropType = meta?.dropBlock || mined.type;
        const dropCount = meta?.dropCount ?? 1;

        if (dropType !== BlockType.AIR) {
          setInventoryCounts((prev) => ({
            ...prev,
            [dropType]: (prev[dropType] || 0) + dropCount,
          }));
        }
      });

      // Update Weather
      const biomeVal = world.generator.biomeNoise.fbm2D(player.position.x * 0.005, player.position.z * 0.005, 2);
      weatherSystem.update(delta, player.position, biomeVal);
      const weatherFactors = weatherSystem.getWeatherFactors();

      // Update Environment with Weather
      env.update(delta, player.position, weatherFactors);

      // Update Particles
      world.updateParticles(delta);

      // Ondulacao da agua
      world.updateWater(delta);

      // Load chunks as player moves
      world.loadChunksAround(player.position.x, player.position.z);

      // Update Hostile AI Mobs & Combat
      mobManager.update(
        delta,
        player.position,
        env.timeOfDay,
        (damage, sourceName) => {
          if (isCreativeRef.current) return;
          lastDamageTimeRef.current = performance.now();
          setDamageFlash(true);
          setTimeout(() => setDamageFlash(false), 220);

          // Knockback player slightly
          player.velocity.y = 3.6;

          setHealth((prev) => {
            const next = Math.max(0, prev - damage);
            if (next <= 0) {
              setIsDead(true);
              setDeathCause(`Abatido por ${sourceName}`);
              sound.playPlayerDeath();
              document.exitPointerLock?.();
            }
            return next;
          });
        },
        (drop: MobDrop) => {
          setInventoryCounts((prev) => ({
            ...prev,
            [drop.type]: (prev[drop.type] || 0) + drop.count,
          }));
          const dropName = BLOCK_METAS[drop.type]?.name || 'Item';
          setChatMessages((prev) => [
            ...prev.slice(-49),
            {
              id: `drop_${Date.now()}_${Math.random()}`,
              sender: 'Recompensa',
              text: `+${drop.count}x ${dropName} obtido!`,
              color: '#f59e0b',
              timestamp: Date.now(),
              isSystem: true,
            },
          ]);
        }
      );

      // Broadcast position to network
      network.sendMove(
        player.position,
        player.yaw,
        player.pitch,
        player.isSneaking,
        player.isMining,
        hotbar[selectedSlot] || BlockType.GRASS
      );

      // Quem esta falando agora
      voice.atualizar();

      // Update remote avatars interpolation
      network.updateAvatars(delta);

      // Sync state to UI (throttled to every 4 frames)
      frameCount++;
      if (frameCount % 4 === 0) {
        setTargetBlock(player.targetBlock);
        setBreakProgress(player.breakProgress);
        setPlayerPos({ x: player.position.x, y: player.position.y, z: player.position.z });
        setPlayerYaw(player.yaw);

        // Count nearby hostile mobs within 24 blocks
        const count = mobManager.mobs.filter((m) => m.position.distanceTo(player.position) < 24).length;
        setNearbyHostiles(count);
      }

      // Natural health regeneration if safe for 5 seconds
      const nowMs = performance.now();
      if (!isCreativeRef.current && nowMs - lastDamageTimeRef.current > 5000) {
        if (nowMs - lastRegenTimeRef.current > 3500) {
          lastRegenTimeRef.current = nowMs;
          setHealth((prev) => (prev > 0 ? Math.min(20, prev + 1) : 0));
        }
      }

      // Calculate FPS
      const now = performance.now();
      if (now - lastFpsTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastFpsTime)));
        setPing(network.pingMs);
        frameCount = 0;
        lastFpsTime = now;
      }

      // Render
      renderer.render(scene, camera);
    };

    animate();

    // Window Resize Handler
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Pointer Lock Change
    const handleLockChange = () => {
      const isLocked = document.pointerLockElement === document.body;
      setIsPointerLocked(isLocked);
    };
    document.addEventListener('pointerlockchange', handleLockChange);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('pointerlockchange', handleLockChange);
      voice.dispose();
      network.disconnect();
      mobManager.dispose();
      world.dispose();
      player.dispose();
      weatherRef.current?.dispose();
      timer.dispose();
      renderer.dispose();
      // Remove o canvas pelo pai real: o React já zerou containerRef.current
      // antes da limpeza rodar, então confiar nele deixava o canvas órfão no DOM.
      renderer.domElement.remove();
    };
  }, []);

  // Update selected block held by avatar
  useEffect(() => {
    isCreativeRef.current = isCreative;
    // Ao voltar para Sobrevivencia, quem estava voando cai
    if (!isCreative && playerRef.current?.isFlying) {
      playerRef.current.isFlying = false;
      setIsFlying(false);
    }
  }, [isCreative]);

  useEffect(() => {
    if (playerRef.current) {
      // player held item sync
    }
  }, [selectedSlot, hotbar]);

  // Connect / Change room callback
  const handleConnectRoom = (newRoom: string, newName: string, newColor: string, newSeed?: number) => {
    setRoomName(newRoom);
    setPlayerName(newName);
    setPlayerColor(newColor);
    if (newSeed) setWorldSeed(newSeed);

    if (networkRef.current) {
      networkRef.current.disconnect();
      networkRef.current.connect({
        roomId: newRoom,
        name: newName,
        color: newColor,
        seed: newSeed,
      });
    }

    if (newSeed && worldRef.current && sceneRef.current) {
      worldRef.current.dispose();
      const newWorld = new World(sceneRef.current, newSeed);
      worldRef.current = newWorld;
      if (playerRef.current) {
        playerRef.current.world = newWorld;
        const sy = newWorld.generator.getSurfaceHeight(playerRef.current.position.x, playerRef.current.position.z);
        playerRef.current.position.y = sy + 2;
        newWorld.loadChunksAround(playerRef.current.position.x, playerRef.current.position.z);
      }
    }
  };

  const toggleVoice = useCallback(async () => {
    const voice = voiceRef.current;
    const network = networkRef.current;
    if (!voice || !network) return;

    if (voice.ativo) {
      voice.desligar();
      network.sendVoiceState(false);
    } else {
      // O id precisa estar definido ANTES de ligar: e ele que decide
      // qual dos dois lados faz a oferta.
      voice.definirMeuId(network.playerId);
      const ok = await voice.ligar([...network.remotePlayers.keys()]);
      if (ok) network.sendVoiceState(true);
    }
  }, []);

  const toggleOpenMic = useCallback(() => {
    const voice = voiceRef.current;
    if (voice) voice.definirMicrofoneAberto(!voice.microfoneAberto);
  }, []);

  // Voo e exclusivo do modo Criativo: no Sobrevivencia a tecla F,
  // o botao do HUD e o controle mobile nao fazem nada.
  const toggleFlight = useCallback(() => {
    const player = playerRef.current;
    if (!player || !isCreativeRef.current) return;
    player.isFlying = !player.isFlying;
    setIsFlying(player.isFlying);
    sound.playJump();
  }, []);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not capture game keys when typing in modals or chat
      if (chatOpen || inventoryOpen || roomsOpen || settingsOpen) {
        // Abriu um painel com a tecla de falar apertada: nao deixar o mic preso
        voiceRef.current?.definirTransmissao(false);
        if (e.key === 'Escape') {
          setChatOpen(false);
          setInventoryOpen(false);
          setRoomsOpen(false);
          setSettingsOpen(false);
        }
        return;
      }

      const player = playerRef.current;
      if (!player) return;

      switch (e.code) {
        case 'KeyW':
          player.keys.forward = true;
          break;
        case 'KeyS':
          player.keys.backward = true;
          break;
        case 'KeyA':
          player.keys.left = true;
          break;
        case 'KeyD':
          player.keys.right = true;
          break;
        case 'Space':
          player.keys.jump = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          player.keys.sneak = true;
          player.isSneaking = true;
          break;
        case 'KeyF':
          toggleFlight();
          break;
        case 'KeyV':
          // e.repeat: segurar a tecla dispara keydown varias vezes
          if (!e.repeat) voiceRef.current?.definirTransmissao(true);
          break;
        case 'F5':
          e.preventDefault();
          player.isThirdPerson = !player.isThirdPerson;
          setIsThirdPerson(player.isThirdPerson);
          break;
        case 'KeyE':
          e.preventDefault();
          setInventoryOpen((prev) => !prev);
          document.exitPointerLock?.();
          break;
        case 'KeyT':
        case 'Enter':
          e.preventDefault();
          setChatOpen(true);
          document.exitPointerLock?.();
          break;
        // Hotbar keys 1-9
        case 'Digit1': setSelectedSlot(0); break;
        case 'Digit2': setSelectedSlot(1); break;
        case 'Digit3': setSelectedSlot(2); break;
        case 'Digit4': setSelectedSlot(3); break;
        case 'Digit5': setSelectedSlot(4); break;
        case 'Digit6': setSelectedSlot(5); break;
        case 'Digit7': setSelectedSlot(6); break;
        case 'Digit8': setSelectedSlot(7); break;
        case 'Digit9': setSelectedSlot(8); break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const player = playerRef.current;
      if (!player) return;

      switch (e.code) {
        case 'KeyW':
          player.keys.forward = false;
          break;
        case 'KeyS':
          player.keys.backward = false;
          break;
        case 'KeyA':
          player.keys.left = false;
          break;
        case 'KeyD':
          player.keys.right = false;
          break;
        case 'Space':
          player.keys.jump = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          player.keys.sneak = false;
          player.isSneaking = false;
          break;
        case 'KeyV':
          voiceRef.current?.definirTransmissao(false);
          break;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (inventoryOpen || chatOpen || roomsOpen || settingsOpen) return;
      setSelectedSlot((prev) => {
        if (e.deltaY > 0) return (prev + 1) % 9;
        return (prev - 1 + 9) % 9;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [chatOpen, inventoryOpen, roomsOpen, settingsOpen, toggleFlight]);

  // Execute Attack against Hostile Mobs (Zombies & Skeletons)
  const executeAttack = useCallback((): boolean => {
    const player = playerRef.current;
    const camera = cameraRef.current;
    const mobManager = mobManagerRef.current;
    if (!player || !camera || !mobManager) return false;

    const origin = new THREE.Vector3(player.position.x, player.position.y + player.eyeHeight, player.position.z);
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);

    // Compute weapon damage based on held item
    const heldItem = hotbar[selectedSlot] || BlockType.GRASS;
    const heldMeta = BLOCK_METAS[heldItem];
    let damage = 2; // Bare hand punch

    if (heldMeta && heldMeta.isTool) {
      if (heldMeta.toolType === 'sword') {
        damage = heldItem === BlockType.STONE_SWORD ? 7 : 5;
      } else if (heldMeta.toolType === 'pickaxe') {
        damage = heldItem === BlockType.DIAMOND_PICKAXE ? 7 : heldItem === BlockType.IRON_PICKAXE ? 5 : heldItem === BlockType.STONE_PICKAXE ? 4 : 3;
      } else if (heldMeta.toolType === 'axe') {
        damage = heldItem === BlockType.STONE_AXE ? 5 : 4;
      }
    } else if (heldItem === BlockType.BOW) {
      damage = 4;
    }

    const hitMob = mobManager.hitMobAtRay(origin, dir, 4.8, damage, (drop) => {
      setInventoryCounts((prev) => ({
        ...prev,
        [drop.type]: (prev[drop.type] || 0) + drop.count,
      }));
      const dropName = BLOCK_METAS[drop.type]?.name || 'Item';
      setChatMessages((prev) => [
        ...prev.slice(-49),
        {
          id: `drop_${Date.now()}_${Math.random()}`,
          sender: 'Recompensa de Combate',
          text: `+${drop.count}x ${dropName} obtido(s)!`,
          color: '#f59e0b',
          timestamp: Date.now(),
          isSystem: true,
        },
      ]);
    });

    if (hitMob) {
      if (worldRef.current) {
        worldRef.current.spawnBlockBreakParticles(hitMob.position.x, hitMob.position.y + 1, hitMob.position.z, BlockType.TNT);
      }
      return true;
    }

    return false;
  }, [hotbar, selectedSlot]);

  // Execute Mine Block
  const executeMine = useCallback(() => {
    const player = playerRef.current;
    const world = worldRef.current;
    const network = networkRef.current;
    if (!player || !world || !network || !player.targetBlock) return;

    const target = player.targetBlock;
    world.setBlock(target.x, target.y, target.z, BlockType.AIR, true);
    network.sendBlockUpdate(target.x, target.y, target.z, BlockType.AIR);

    const meta = BLOCK_METAS[target.type];
    const dropType = meta?.dropBlock || target.type;
    const dropCount = meta?.dropCount ?? 1;

    if (dropType !== BlockType.AIR) {
      setInventoryCounts((prev) => ({
        ...prev,
        [dropType]: (prev[dropType] || 0) + dropCount,
      }));
    }
  }, []);

  // Execute Place Block or Detonate TNT
  const executePlace = useCallback(() => {
    const player = playerRef.current;
    const world = worldRef.current;
    const network = networkRef.current;
    if (!player || !world || !network || !player.targetBlock) return;

    const target = player.targetBlock;

    // Detonate TNT
    if (target.type === BlockType.TNT) {
      world.explodeTNT(target.x, target.y, target.z, (bx, by, bz) => {
        network.sendBlockUpdate(bx, by, bz, BlockType.AIR);
      });
      return;
    }

    const activeBlock = hotbar[selectedSlot] || BlockType.GRASS;
    const meta = BLOCK_METAS[activeBlock];

    // Tools cannot be placed as world blocks
    if (meta && meta.isTool) {
      return;
    }

    const placeX = target.x + target.faceNormal.x;
    const placeY = target.y + target.faceNormal.y;
    const placeZ = target.z + target.faceNormal.z;

    // Check player collision bounds
    const halfW = player.width / 2;
    const minX = player.position.x - halfW;
    const maxX = player.position.x + halfW;
    const minY = player.position.y;
    const maxY = player.position.y + player.height;
    const minZ = player.position.z - halfW;
    const maxZ = player.position.z + halfW;

    const overlapsPlayer =
      placeX + 1 > minX &&
      placeX < maxX &&
      placeY + 1 > minY &&
      placeY < maxY &&
      placeZ + 1 > minZ &&
      placeZ < maxZ;

    if (meta && meta.isSolid && overlapsPlayer) {
      return;
    }

    world.setBlock(placeX, placeY, placeZ, activeBlock, true);
    network.sendBlockUpdate(placeX, placeY, placeZ, activeBlock);
  }, [hotbar, selectedSlot]);

  // Pointer & Mouse Look / Interaction Handlers (Works in iframe & mobile)
  useEffect(() => {
    let isDragging = false;
    let hasMoved = false;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let buttonPressed = 0;

    const handlePointerDown = (e: PointerEvent) => {
      // Ignore if clicking on UI modals or HUD buttons
      const target = e.target as HTMLElement;
      if (target.closest('button, input, textarea, form, .pointer-events-auto')) {
        return;
      }

      if (chatOpen || inventoryOpen || roomsOpen || settingsOpen || isDead) return;

      isDragging = true;
      hasMoved = false;
      buttonPressed = e.button;
      startX = e.clientX;
      startY = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;

      if (document.pointerLockElement === document.body && e.button === 0) {
        // First check if attacking a mob in crosshair
        const hit = executeAttack();
        if (!hit && playerRef.current) {
          playerRef.current.isMining = true;
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const player = playerRef.current;
      if (!player || isDead) return;

      if (document.pointerLockElement === document.body) {
        player.handleMouseMove(e.movementX, e.movementY);
        return;
      }

      if (isDragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        if (Math.hypot(e.clientX - startX, e.clientY - startY) > 4) {
          hasMoved = true;
        }

        player.handleMouseMove(dx, dy);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const player = playerRef.current;
      if (player) {
        player.isMining = false;
        player.breakProgress = 0;
      }

      if (!isDragging || isDead) return;
      isDragging = false;

      // If pointer is NOT locked and was a tap/click without dragging, perform action!
      if (document.pointerLockElement !== document.body && !hasMoved) {
        if (buttonPressed === 0 || e.button === 0) {
          const hit = executeAttack();
          if (!hit) {
            executeMine();
          }
        } else if (buttonPressed === 2 || e.button === 2) {
          executePlace();
        }
      } else if (document.pointerLockElement === document.body) {
        if (e.button === 2) {
          executePlace();
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    // Sem isto, um gesto cancelado pelo navegador (chamada chegando, gesto do
    // sistema) deixaria o arrasto presso ligado e a camera louca depois.
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [chatOpen, inventoryOpen, roomsOpen, settingsOpen, executeMine, executePlace]);

  // Toggle Pointer Lock explicitly
  const handleTogglePointerLock = () => {
    if (document.pointerLockElement === document.body) {
      document.exitPointerLock?.();
    } else {
      try {
        document.body.requestPointerLock?.();
      } catch (err) {
        console.warn('Pointer lock request denied', err);
      }
    }
  };

  // Enter Game
  /**
   * No celular o jogo pede tela cheia e trava em paisagem. As duas coisas so
   * sao permitidas dentro de um gesto do usuario, por isso ficam aqui, no
   * clique de entrar, e nao num efeito. O travamento tambem exige tela cheia
   * primeiro, e nem todo navegador aceita -- iOS nao tem a API. Quando falha,
   * o aviso para girar o aparelho assume.
   */
  const entrarEmPaisagem = async () => {
    if (!temToque) return;
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      // usuario pode recusar ou o navegador nao permitir
    }
    try {
      await (screen.orientation as any)?.lock?.('landscape');
    } catch {
      // iOS e alguns Android nao suportam: resta o aviso de girar
    }
  };

  const handleStartGame = () => {
    setIsPlaying(true);
    sound.playJump();
    entrarEmPaisagem();
    try {
      document.body.requestPointerLock?.();
    } catch (e) {
      console.warn('Pointer lock not supported, using drag-to-look', e);
    }
  };

  const handleJoystick = useCallback((x: number, y: number) => {
    const player = playerRef.current;
    if (!player) return;
    player.analogX = x;
    player.analogY = y;
  }, []);

  const handleMobileJump = (pressed: boolean) => {
    if (playerRef.current) {
      playerRef.current.keys.jump = pressed;
    }
  };

  const handleRespawn = useCallback(() => {
    setIsDead(false);
    setHealth(20);
    setDeathCause('');
    const player = playerRef.current;
    if (player) {
      player.spawnSafely(player.position.x, player.position.z);
    }
    if (mobManagerRef.current) {
      mobManagerRef.current.clearAll();
    }
    sound.playJump();
    try {
      document.body.requestPointerLock?.();
    } catch (e) {}
  }, []);

  const handleSetWeather = (type: WeatherType) => {
    if (weatherRef.current) {
      weatherRef.current.setWeather(type);
      setWeather(type);
    }
  };

  const handleToggleWeatherAuto = () => {
    if (weatherRef.current) {
      weatherRef.current.isAuto = !weatherRef.current.isAuto;
      setIsWeatherAuto(weatherRef.current.isAuto);
    }
  };

  const handleCycleWeather = () => {
    const order: WeatherType[] = ['clear', 'rain', 'snow'];
    const next = order[(order.indexOf(weather) + 1) % order.length];
    handleSetWeather(next);
  };

  const handleTriggerThunder = () => {
    weatherRef.current?.triggerThunder();
  };

  const handleSetHotbarSlot = (slot: number, block: BlockType) => {
    setHotbar((prev) => {
      const next = [...prev];
      next[slot] = block;
      return next;
    });
  };

  const handleConsumeIngredients = useCallback((ingredients: { block: BlockType; count: number }[]) => {
    setInventoryCounts((prev) => {
      const next = { ...prev };
      for (const ing of ingredients) {
        next[ing.block] = Math.max(0, (next[ing.block] || 0) - ing.count);
      }
      return next;
    });
  }, []);

  const handleAddInventoryItem = useCallback((block: BlockType, count: number) => {
    setInventoryCounts((prev) => ({
      ...prev,
      [block]: (prev[block] || 0) + count,
    }));
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-sans">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Intro / Start Screen */}
      {!isPlaying && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-neutral-900/90 border border-white/20 rounded-3xl p-8 max-w-lg w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Title & Badge */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mundo Aberto Voxel 3D & Multijogador</span>
              </div>
              <h1 className="text-4xl font-extrabold text-white tracking-tight font-mono">
                VoxelCraft
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Explore mundos infinitos gerados proceduralmente com biomas, cavernas 3D, minérios e ciclo dia/noite. Construa com dezenas de blocos e jogue com amigos em tempo real!
              </p>
            </div>

            {/* Feature Badges */}
            <div className="grid grid-cols-3 gap-2 text-[11px] font-medium text-slate-300">
              <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex flex-col items-center gap-1">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>Geração Procedural</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex flex-col items-center gap-1">
                <Pickaxe className="w-4 h-4 text-amber-400" />
                <span>Mineração & TNT</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex flex-col items-center gap-1">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Multijogador Real</span>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartGame}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 transition text-base cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Entrar no Mundo</span>
            </button>

            <div className="text-xs text-slate-400 font-mono">
              Sala atual: <b className="text-emerald-400">{roomName}</b> • Semente: <b className="text-cyan-400">{worldSeed}</b>
            </div>
          </div>
        </div>
      )}

      {/* In-Game HUD */}
      {isPlaying && (
        <HUD
          hotbar={hotbar}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          targetBlock={targetBlock}
          breakProgress={breakProgress}
          fps={fps}
          ping={ping}
          playerPos={playerPos}
          isFlying={isFlying}
          voiceOn={voiceOn}
          voiceTalking={voiceTalking}
          voiceOpenMic={voiceOpenMic}
          voiceSpeakers={voiceSpeakers}
          voiceError={voiceError}
          onToggleVoice={toggleVoice}
          onToggleOpenMic={toggleOpenMic}
          isThirdPerson={isThirdPerson}
          isCreative={isCreative}
          onlineCount={onlineCount}
          isPointerLocked={isPointerLocked}
          onTogglePointerLock={handleTogglePointerLock}
          onMine={executeMine}
          onPlace={executePlace}
          onAttack={executeAttack}
          health={health}
          maxHealth={20}
          damageFlash={damageFlash}
          nearbyHostileCount={nearbyHostiles}
          showOnScreenControls={showOnScreenControls}
          onToggleOnScreenControls={() => setShowOnScreenControls((prev) => !prev)}
          weather={weather}
          onCycleWeather={handleCycleWeather}
          showMiniMap={showMiniMap}
          onToggleMiniMap={() => setShowMiniMap((prev) => !prev)}
          onOpenInventory={() => {
            setInventoryOpen(true);
            document.exitPointerLock?.();
          }}
          onOpenChat={() => {
            setChatOpen(true);
            document.exitPointerLock?.();
          }}
          onOpenSettings={() => {
            setSettingsOpen(true);
            document.exitPointerLock?.();
          }}
          onOpenRooms={() => {
            setRoomsOpen(true);
            document.exitPointerLock?.();
          }}
          onToggleFlight={toggleFlight}
          onToggleCamera={() => {
            if (playerRef.current) {
              playerRef.current.isThirdPerson = !playerRef.current.isThirdPerson;
              setIsThirdPerson(playerRef.current.isThirdPerson);
            }
          }}
        />
      )}

      {/* Celular na vertical: o travamento de orientacao falhou (ou o
          navegador nao suporta), entao pedimos para girar. So aparece no
          toque e em pe -- some sozinho ao virar. */}
      {isPlaying && temToque && (
        <div className="portrait:flex hidden fixed inset-0 z-[60] flex-col items-center justify-center gap-4 bg-slate-950/95 text-center p-8">
          <div className="text-5xl">📱</div>
          <div className="text-lg font-bold text-white">Gire o celular</div>
          <div className="text-sm text-slate-400 max-w-xs">
            O VoxelCraft foi feito para a tela deitada. Vire o aparelho para
            jogar com a área toda.
          </div>
        </div>
      )}

      {/* Mini-map 2D World Overlay (Top-Right) */}
      {isPlaying && showMiniMap && (
        <div
          className={`absolute right-3 z-30 pointer-events-none ${
            showOnScreenControls ? 'top-[9rem]' : 'top-14'
          }`}
        >
          <MiniMap
            world={worldRef.current}
            playerPos={playerPos}
            playerYaw={playerYaw}
            remotePlayers={networkRef.current?.remotePlayers}
            visible={showMiniMap}
            tamanho={showOnScreenControls ? 120 : 180}
            onToggleVisible={() => setShowMiniMap((prev) => !prev)}
          />
        </div>
      )}

      {/* Virtual Controls Overlay (Mobile & Desktop Toggle) */}
      {isPlaying && (
        <MobileControls
          onJoystick={handleJoystick}
          onJumpPress={handleMobileJump}
          onMineClick={executeMine}
          onPlaceClick={executePlace}
          onAttackClick={executeAttack}
          onToggleFlight={toggleFlight}
          isFlying={isFlying}
          isCreative={isCreative}
          visible={showOnScreenControls}
          voiceOn={voiceOn}
          voiceOpenMic={voiceOpenMic}
          voiceTalking={voiceTalking}
          onTalkPress={(p) => voiceRef.current?.definirTransmissao(p)}
        />
      )}

      {/* Modals */}
      <InventoryModal
        isOpen={inventoryOpen}
        onClose={() => setInventoryOpen(false)}
        hotbar={hotbar}
        selectedSlot={selectedSlot}
        onSetHotbarSlot={handleSetHotbarSlot}
        inventoryCounts={inventoryCounts}
        onConsumeIngredients={handleConsumeIngredients}
        onAddInventoryItem={handleAddInventoryItem}
        isCreative={isCreative}
      />

      <ChatBox
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={chatMessages}
        playerName={playerName}
        noToque={showOnScreenControls}
        onSendMessage={(text) => {
          networkRef.current?.sendChat(text);
        }}
      />

      <RoomModal
        isOpen={roomsOpen}
        onClose={() => setRoomsOpen(false)}
        currentRoom={roomName}
        currentSeed={worldSeed}
        playerName={playerName}
        playerColor={playerColor}
        onlinePlayers={Array.from(networkRef.current?.remotePlayers.values() || [])}
        onConnectRoom={handleConnectRoom}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        renderRadius={renderRadius}
        onSetRenderRadius={(r) => {
          setRenderRadius(r);
          if (worldRef.current) worldRef.current.renderRadius = r;
          if (envRef.current) envRef.current.setFogDistance(r);
        }}
        timeOfDay={timeOfDay}
        onSetTimeOfDay={(t) => {
          setTimeOfDay(t);
          if (envRef.current) envRef.current.timeOfDay = t;
        }}
        isCyclePaused={isCyclePaused}
        onToggleCyclePaused={() => {
          setIsCyclePaused((prev) => {
            const next = !prev;
            if (envRef.current) envRef.current.isPaused = next;
            return next;
          });
        }}
        isCreative={isCreative}
        onToggleCreative={() => setIsCreative((prev) => !prev)}
        onRespawn={handleRespawn}
        volume={volume}
        onSetVolume={setVolume}
        weather={weather}
        isWeatherAuto={isWeatherAuto}
        onSetWeather={handleSetWeather}
        onToggleWeatherAuto={handleToggleWeatherAuto}
        onTriggerThunder={handleTriggerThunder}
      />

      {/* Player Death Screen */}
      <DeathModal
        isOpen={isDead}
        deathCause={deathCause}
        onRespawn={handleRespawn}
        onSwitchToCreative={() => {
          setIsCreative(true);
          handleRespawn();
        }}
      />
    </div>
  );
}
