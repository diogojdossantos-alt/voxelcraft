import React from 'react';
import { BlockType, BLOCK_METAS } from '../game/constants';
import { TargetBlock } from '../game/player';
import { Sparkles, Users, MessageSquare, Compass, Settings, MousePointer, Hand, Pickaxe, Hammer, Gamepad2, CloudRain, CloudSnow, Sun, Map as MapIcon, Heart, Swords, Skull, Mic, MicOff, Radio } from 'lucide-react';
import { WeatherType } from '../game/weather';

interface HUDProps {
  hotbar: BlockType[];
  selectedSlot: number;
  onSelectSlot: (idx: number) => void;
  targetBlock: TargetBlock | null;
  breakProgress: number;
  fps: number;
  ping: number;
  playerPos: { x: number; y: number; z: number };
  isFlying: boolean;
  isThirdPerson: boolean;
  isCreative: boolean;
  onlineCount: number;
  isPointerLocked: boolean;
  onTogglePointerLock: () => void;
  onOpenInventory: () => void;
  onOpenChat: () => void;
  onOpenSettings: () => void;
  onOpenRooms: () => void;
  onToggleFlight: () => void;
  onToggleCamera: () => void;
  onMine: () => void;
  onPlace: () => void;
  onAttack?: () => void;
  health?: number;
  maxHealth?: number;
  damageFlash?: boolean;
  nearbyHostileCount?: number;
  showOnScreenControls: boolean;
  onToggleOnScreenControls: () => void;
  weather: WeatherType;
  onCycleWeather: () => void;
  showMiniMap: boolean;
  onToggleMiniMap: () => void;
  voiceOn: boolean;
  voiceTalking: boolean;
  voiceOpenMic: boolean;
  voiceSpeakers: string[];
  voiceError: string | null;
  onToggleVoice: () => void;
  onToggleOpenMic: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  hotbar,
  selectedSlot,
  onSelectSlot,
  targetBlock,
  breakProgress,
  fps,
  ping,
  playerPos,
  isFlying,
  isThirdPerson,
  isCreative,
  onlineCount,
  isPointerLocked,
  onTogglePointerLock,
  onOpenInventory,
  onOpenChat,
  onOpenSettings,
  onOpenRooms,
  onToggleFlight,
  onToggleCamera,
  onMine,
  onPlace,
  onAttack,
  health = 20,
  maxHealth = 20,
  damageFlash = false,
  nearbyHostileCount = 0,
  showOnScreenControls,
  onToggleOnScreenControls,
  weather,
  onCycleWeather,
  showMiniMap,
  onToggleMiniMap,
  voiceOn,
  voiceTalking,
  voiceOpenMic,
  voiceSpeakers,
  voiceError,
  onToggleVoice,
  onToggleOpenMic,
}) => {
  const selectedBlock = hotbar[selectedSlot] || BlockType.GRASS;
  const currentMeta = BLOCK_METAS[selectedBlock] || BLOCK_METAS[BlockType.GRASS];

  // Helper colors for hotbar blocks preview
  const getBlockColor = (type: BlockType): string => {
    const colors: Partial<Record<BlockType, string>> = {
      [BlockType.GRASS]: 'from-emerald-500 to-green-700',
      [BlockType.DIRT]: 'from-amber-700 to-yellow-900',
      [BlockType.STONE]: 'from-gray-400 to-gray-600',
      [BlockType.COBBLESTONE]: 'from-gray-500 to-gray-700',
      [BlockType.WOOD_LOG]: 'from-amber-800 to-yellow-950',
      [BlockType.WOOD_PLANKS]: 'from-amber-600 to-amber-700',
      [BlockType.LEAVES]: 'from-green-600 to-emerald-800',
      [BlockType.GLASS]: 'from-cyan-200 to-blue-300',
      [BlockType.BRICKS]: 'from-rose-600 to-red-800',
      [BlockType.SAND]: 'from-yellow-200 to-amber-400',
      [BlockType.WATER]: 'from-blue-500 to-indigo-600',
      [BlockType.COAL_ORE]: 'from-neutral-800 to-stone-900',
      [BlockType.IRON_ORE]: 'from-orange-300 to-amber-600',
      [BlockType.GOLD_ORE]: 'from-yellow-300 to-amber-500',
      [BlockType.DIAMOND_ORE]: 'from-cyan-300 to-teal-500',
      [BlockType.SNOW]: 'from-slate-100 to-blue-100',
      [BlockType.CACTUS]: 'from-emerald-600 to-green-800',
      [BlockType.FLOWER_RED]: 'from-red-500 to-rose-700',
      [BlockType.FLOWER_YELLOW]: 'from-yellow-400 to-amber-500',
      [BlockType.TORCH]: 'from-amber-400 to-orange-600',
      [BlockType.TNT]: 'from-red-600 to-rose-700',
      [BlockType.BEDROCK]: 'from-neutral-900 to-black',
      [BlockType.OBSIDIAN]: 'from-purple-950 to-indigo-950',
      [BlockType.BOOKSHELF]: 'from-amber-700 to-amber-900',
      [BlockType.CRAFTING_TABLE]: 'from-amber-600 to-amber-800',
      [BlockType.STICK]: 'from-amber-800 to-yellow-950',
      [BlockType.WOODEN_PICKAXE]: 'from-amber-700 to-yellow-900',
      [BlockType.STONE_PICKAXE]: 'from-stone-500 to-neutral-700',
      [BlockType.IRON_PICKAXE]: 'from-slate-200 to-zinc-400',
      [BlockType.DIAMOND_PICKAXE]: 'from-cyan-400 to-teal-600',
      [BlockType.WOODEN_AXE]: 'from-amber-700 to-yellow-900',
      [BlockType.STONE_AXE]: 'from-stone-500 to-neutral-700',
      [BlockType.WOODEN_SHOVEL]: 'from-amber-700 to-yellow-900',
      [BlockType.STONE_SHOVEL]: 'from-stone-500 to-neutral-700',
      [BlockType.WOODEN_SWORD]: 'from-amber-700 to-yellow-900',
      [BlockType.STONE_SWORD]: 'from-stone-500 to-neutral-700',
      [BlockType.FURNACE]: 'from-stone-700 to-neutral-900',
      [BlockType.ROTTEN_FLESH]: 'from-red-900 to-amber-950',
      [BlockType.BONE]: 'from-slate-100 to-stone-300',
      [BlockType.ARROW]: 'from-stone-400 to-amber-800',
      [BlockType.BOW]: 'from-amber-800 to-amber-950',
    };
    return colors[type] || 'from-gray-500 to-gray-700';
  };

  // Render Minecraft hearts (10 hearts total, 2 HP per heart)
  const renderHearts = () => {
    const totalHearts = 10;
    const hearts = [];
    for (let i = 0; i < totalHearts; i++) {
      const heartValue = (i + 1) * 2;
      const isFull = health >= heartValue;
      const isHalf = health === heartValue - 1;

      hearts.push(
        <div key={i} className={`relative w-4 h-4 flex items-center justify-center transition-transform ${damageFlash ? 'scale-110' : ''}`}>
          {/* Heart container / empty background */}
          <Heart className="w-4 h-4 text-black/80 fill-black/60 stroke-[2.5]" />
          {/* Full Heart */}
          {isFull && (
            <Heart className="absolute inset-0 w-4 h-4 text-rose-500 fill-rose-500 drop-shadow-[0_0_4px_rgba(244,63,94,0.6)]" />
          )}
          {/* Half Heart */}
          {isHalf && (
            <div className="absolute inset-0 overflow-hidden w-2">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500 drop-shadow-[0_0_4px_rgba(244,63,94,0.6)]" />
            </div>
          )}
        </div>
      );
    }
    return hearts;
  };

  return (
    <div className="pointer-events-none absolute inset-0 select-none overflow-hidden flex flex-col justify-between p-3 font-sans">
      {/* Damage Flash Red Screen Vignette */}
      {damageFlash && (
        <div className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-150 bg-rose-600/25 shadow-[inset_0_0_100px_rgba(225,29,72,0.85)] border-4 border-rose-500/60 animate-pulse" />
      )}

      {/* Top Header Bar */}
      <div className="flex flex-wrap items-start justify-between w-full gap-2 z-20">
        {/* Coordinates and FPS */}
        <div className="bg-black/70 backdrop-blur-md rounded-lg p-2.5 border border-white/10 text-xs font-mono space-y-1 text-slate-300 shadow-xl">
          <div className="flex items-center gap-2 font-bold text-white tracking-wide">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>VoxelCraft v1.0</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isCreative ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>
              {isCreative ? 'CRIATIVO' : 'SOBREVIVÊNCIA'}
            </span>
            {nearbyHostileCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-300 border border-amber-500/40 animate-pulse">
                <Skull className="w-3 h-3 text-amber-400" />
                {nearbyHostileCount} {nearbyHostileCount === 1 ? 'Inimigo' : 'Inimigos'}
              </span>
            )}
          </div>
          <div className="text-slate-400">
            XYZ: <span className="text-white font-semibold">{Math.floor(playerPos.x)}, {Math.floor(playerPos.y)}, {Math.floor(playerPos.z)}</span>
          </div>
          <div className="flex gap-3 text-[11px]">
            <span>FPS: <span className={fps > 45 ? 'text-green-400' : 'text-yellow-400'}>{fps}</span></span>
            <span>Ping: <span className="text-cyan-400">{ping}ms</span></span>
            {isFlying && (
              <span className="text-amber-300 font-bold animate-pulse">VOANDO (F)</span>
            )}
          </div>
        </div>

        {/* Top Buttons (pointer-events-auto) */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
          {/* Dynamic Weather Badge & Quick Toggle */}
          <button
            onClick={onCycleWeather}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-95 cursor-pointer backdrop-blur shadow-lg border ${
              weather === 'rain'
                ? 'bg-cyan-950/80 border-cyan-400/70 text-cyan-200'
                : weather === 'snow'
                ? 'bg-blue-950/80 border-blue-300/70 text-blue-100'
                : 'bg-black/75 border-amber-500/50 text-amber-300 hover:bg-white/10'
            }`}
            title="Clique para alternar o clima (Ensolarado / Chuva / Neve)"
          >
            {weather === 'clear' && <Sun className="w-3.5 h-3.5 text-amber-400" />}
            {weather === 'rain' && <CloudRain className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />}
            {weather === 'snow' && <CloudSnow className="w-3.5 h-3.5 text-blue-200" />}
            <span className="capitalize">{weather === 'clear' ? 'Sol' : weather === 'rain' ? 'Chuva' : 'Neve'}</span>
          </button>

          {/* Mouse Mode Toggle: Lock FPS vs Free Drag */}
          <button
            onClick={onTogglePointerLock}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-95 cursor-pointer backdrop-blur shadow-lg border ${
              isPointerLocked
                ? 'bg-emerald-600/90 border-emerald-400 text-white'
                : 'bg-black/75 border-amber-500/50 text-amber-300 hover:bg-white/10'
            }`}
            title={isPointerLocked ? 'Mouse Travado no centro (Modo FPS)' : 'Clique para travar mouse no centro'}
          >
            {isPointerLocked ? <MousePointer className="w-3.5 h-3.5 text-white" /> : <Hand className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isPointerLocked ? 'Mouse FPS' : 'Modo Arrastar'}</span>
          </button>

          {/* Mini-Map Toggle Button */}
          <button
            onClick={onToggleMiniMap}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-95 cursor-pointer backdrop-blur shadow-lg border ${
              showMiniMap
                ? 'bg-emerald-600/90 border-emerald-400 text-white'
                : 'bg-black/70 border-white/20 text-slate-300 hover:bg-white/10'
            }`}
            title="Alternar Mini-Mapa [M]"
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mapa [M]</span>
          </button>

          {/* Virtual on-screen controls toggle */}
          <button
            onClick={onToggleOnScreenControls}
            className={`p-1.5 rounded-lg border text-xs font-medium transition active:scale-95 cursor-pointer backdrop-blur shadow-lg ${
              showOnScreenControls
                ? 'bg-purple-600/90 border-purple-400 text-white'
                : 'bg-black/70 border-white/20 text-slate-300 hover:bg-white/10'
            }`}
            title="Mostrar botões virtuais na tela"
          >
            <Gamepad2 className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenRooms}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/70 hover:bg-white/10 border border-white/20 rounded-lg text-xs font-medium text-white transition active:scale-95 cursor-pointer backdrop-blur shadow-lg"
          >
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mundo ({onlineCount})</span>
          </button>

          <button
            onClick={onOpenChat}
            className="p-2 bg-black/70 hover:bg-white/10 border border-white/20 rounded-lg text-white transition active:scale-95 cursor-pointer backdrop-blur shadow-lg"
            title="Chat [T]"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
          </button>

          <button
            onClick={onOpenInventory}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/70 hover:bg-white/10 border border-white/20 rounded-lg text-xs font-medium text-white transition active:scale-95 cursor-pointer backdrop-blur shadow-lg"
            title="Inventário e Criação [E]"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Itens [E]</span>
          </button>

          <button
            onClick={onToggleCamera}
            className="p-2 bg-black/70 hover:bg-white/10 border border-white/20 rounded-lg text-xs text-white transition active:scale-95 cursor-pointer backdrop-blur shadow-lg"
            title="Mudar Câmera 1ª/3ª Pessoa [F5]"
          >
            {isThirdPerson ? '3ªP' : '1ªP'}
          </button>

          {isCreative && (
            <button
              onClick={onToggleFlight}
              className={`px-2.5 py-1.5 border rounded-lg text-xs font-medium transition active:scale-95 cursor-pointer backdrop-blur shadow-lg ${
                isFlying
                  ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                  : 'bg-black/70 border-white/20 text-white hover:bg-white/10'
              }`}
              title="Alternar Modo Voo [F]"
            >
              Voo [F]
            </button>
          )}

          <button
            onClick={onToggleVoice}
            className={`px-2.5 py-1.5 border rounded-lg text-xs font-medium transition active:scale-95 cursor-pointer backdrop-blur shadow-lg flex items-center gap-1.5 ${
              voiceOn
                ? voiceTalking
                  ? 'bg-emerald-500/40 border-emerald-300 text-emerald-100'
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                : 'bg-black/70 border-white/20 text-white hover:bg-white/10'
            }`}
            title={
              voiceOn
                ? 'Voz ligada. Segure V para falar. Clique para desligar.'
                : 'Ligar o chat de voz (pede o microfone)'
            }
          >
            {voiceOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            Voz
          </button>

          {voiceOn && (
            <button
              onClick={onToggleOpenMic}
              className={`px-2.5 py-1.5 border rounded-lg text-xs font-medium transition active:scale-95 cursor-pointer backdrop-blur shadow-lg ${
                voiceOpenMic
                  ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                  : 'bg-black/70 border-white/20 text-white hover:bg-white/10'
              }`}
              title={
                voiceOpenMic
                  ? 'Microfone aberto: todos te ouvem sempre'
                  : 'Push-to-talk: segure V para falar'
              }
            >
              {voiceOpenMic ? 'Mic aberto' : 'V p/ falar'}
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="p-2 bg-black/70 hover:bg-white/10 border border-white/20 rounded-lg text-white transition active:scale-95 cursor-pointer backdrop-blur shadow-lg"
            title="Configurações"
          >
            <Settings className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>

      {/* Screen Center Crosshair & Target info */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Reticle */}
        <div className="relative w-4 h-4 flex items-center justify-center">
          <div className="w-0.5 h-3 bg-white/80 shadow-[0_0_2px_#000]"></div>
          <div className="absolute h-0.5 w-3 bg-white/80 shadow-[0_0_2px_#000]"></div>
        </div>

        {/* Break Progress Circle */}
        {breakProgress > 0 && (
          <div className="absolute w-12 h-12 rounded-full border-2 border-dashed border-red-500 animate-spin" />
        )}

        {/* Target block badge */}
        {targetBlock && (
          <div className="absolute mt-14 bg-black/75 px-2.5 py-1 rounded border border-white/20 text-[11px] font-mono text-emerald-300 backdrop-blur">
            {BLOCK_METAS[targetBlock.type]?.name || 'Bloco'} ({targetBlock.x}, {targetBlock.y}, {targetBlock.z})
          </div>
        )}
      </div>

      {/* Bottom Area: Controls hint, Action buttons & Hotbar */}
      <div className="flex flex-col items-center w-full space-y-2 pb-1">
        {/* Controls hint banner */}
        <div className="text-[11px] text-slate-300 bg-black/70 px-3 py-1 rounded-full border border-white/15 font-mono tracking-tight flex items-center gap-2.5 shadow-md backdrop-blur">
          <span><b className="text-white">WASD:</b> Mover</span>
          <span><b className="text-white">Arraste:</b> Olhar</span>
          <span><b className="text-white">Clique Esq:</b> Minerar / Atacar</span>
          <span><b className="text-white">Clique Dir:</b> Colocar</span>
          <span><b className="text-white">E:</b> Inventário</span>
        </div>

        {/* Survival Hearts Gauge (Only in Survival mode) */}
        {voiceError && (
          <div className="absolute top-28 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-rose-500/20 border border-rose-500/40 rounded-lg text-rose-200 text-xs backdrop-blur">
            {voiceError}
          </div>
        )}

        {voiceOn && voiceSpeakers.length > 0 && (
          <div className="absolute top-28 right-4 flex flex-col gap-1 items-end pointer-events-none">
            {voiceSpeakers.map((id) => (
              <div
                key={id}
                className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/25 border border-emerald-400/40 rounded-lg text-emerald-100 text-[11px] backdrop-blur"
              >
                <Radio className="w-3 h-3 animate-pulse" />
                {id}
              </div>
            ))}
          </div>
        )}

        {!isCreative && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-black/70 backdrop-blur-md rounded-full border border-white/15 shadow-xl">
            <div className="flex items-center gap-1">
              {renderHearts()}
            </div>
            <span className="text-[11px] font-mono font-bold text-rose-300 ml-1">
              {health}/{maxHealth} HP
            </span>
          </div>
        )}

        {/* Selected item label and Quick Mine / Attack / Place action buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onAttack || onMine}
            className="pointer-events-auto px-3.5 py-1.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-bold rounded-xl border border-red-400 shadow-lg flex items-center gap-1.5 cursor-pointer backdrop-blur"
            title="Atacar Entidade / Monstro"
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Atacar</span>
          </button>

          <button
            onClick={onMine}
            className="pointer-events-auto px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-xs font-bold rounded-xl border border-amber-400 shadow-lg flex items-center gap-1.5 cursor-pointer backdrop-blur"
            title="Minerar Bloco na Mira"
          >
            <Pickaxe className="w-3.5 h-3.5" />
            <span>Minerar</span>
          </button>

          <div className="text-sm font-semibold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] bg-black/60 px-3 py-1 rounded-lg border border-white/10 font-mono">
            {currentMeta.name}
          </div>

          <button
            onClick={onPlace}
            className="pointer-events-auto px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl border border-blue-400 shadow-lg flex items-center gap-1.5 cursor-pointer backdrop-blur"
            title="Colocar Bloco Selecionado"
          >
            <Hammer className="w-3.5 h-3.5" />
            <span>Colocar</span>
          </button>
        </div>

        {/* Hotbar (9 slots) */}
        <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 bg-black/80 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl">
          {hotbar.map((blockType, idx) => {
            const isSelected = idx === selectedSlot;
            const meta = BLOCK_METAS[blockType] || BLOCK_METAS[BlockType.GRASS];
            return (
              <button
                key={idx}
                onClick={() => onSelectSlot(idx)}
                className={`relative w-11 h-11 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? 'scale-110 border-2 border-white ring-2 ring-emerald-400 bg-white/20 shadow-lg'
                    : 'border border-white/10 hover:border-white/30 bg-black/40 hover:bg-white/5'
                }`}
                title={`${idx + 1}: ${meta.name}`}
              >
                {/* Visual Block / Tool Representation */}
                <div
                  className={`w-6 h-6 rounded bg-gradient-to-br ${getBlockColor(blockType)} shadow-inner border border-white/20 flex items-center justify-center text-white`}
                >
                  {meta.isTool && <Pickaxe className="w-3.5 h-3.5 drop-shadow" />}
                </div>
                {/* Slot index number badge */}
                <span className="absolute bottom-0.5 right-1 text-[9px] font-mono font-bold text-white/70">
                  {idx + 1}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
