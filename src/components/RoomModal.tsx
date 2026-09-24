import React, { useState } from 'react';
import { Users, Copy, Check, Shuffle, Globe, User, Palette } from 'lucide-react';
import { RemotePlayerAvatar } from '../game/avatar';

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoom: string;
  currentSeed: number;
  playerName: string;
  playerColor: string;
  onlinePlayers: RemotePlayerAvatar[];
  onConnectRoom: (room: string, name: string, color: string, seed?: number) => void;
}

export const RoomModal: React.FC<RoomModalProps> = ({
  isOpen,
  onClose,
  currentRoom,
  currentSeed,
  playerName,
  playerColor,
  onlinePlayers,
  onConnectRoom,
}) => {
  const [name, setName] = useState(playerName);
  const [room, setRoom] = useState(currentRoom);
  const [seed, setSeed] = useState<string>(String(currentSeed));
  const [color, setColor] = useState(playerColor);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const colorOptions = [
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#6366f1', // Indigo
  ];

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', room);
    if (seed) url.searchParams.set('seed', seed);
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRandomSeed = () => {
    setSeed(String(Math.floor(Math.random() * 900000) + 100000));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRoom = room.trim().toLowerCase() || 'lobby';
    const cleanName = name.trim() || 'Steve';
    const parsedSeed = Number(seed);
    onConnectRoom(cleanRoom, cleanName, color, isNaN(parsedSeed) ? undefined : parsedSeed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-900/95 border border-white/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Globe className="w-5 h-5 text-emerald-400" />
            <span>Mundo & Multijogador</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded text-white transition cursor-pointer"
          >
            Fechar
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          {/* Player Nickname */}
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              Seu Nome de Construtor
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400 font-mono"
            />
          </div>

          {/* Player Color */}
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              Cor do Avatar 3D
            </label>
            <div className="flex gap-2 pt-1">
              {colorOptions.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full cursor-pointer transition ${
                    color === c ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Room Name */}
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              Código da Sala / Mundo
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                maxLength={20}
                placeholder="Ex: lobby, amigos123, survival"
                className="flex-1 bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400 font-mono"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-1 transition cursor-pointer"
                title="Copiar Link de Convite"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado!' : 'Convidar'}</span>
              </button>
            </div>
          </div>

          {/* Seed Input */}
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold flex items-center justify-between">
              <span>Semente do Mundo (Seed Procedural)</span>
              <button
                type="button"
                onClick={handleRandomSeed}
                className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Shuffle className="w-3 h-3" />
                Aleatorizar
              </button>
            </label>
            <input
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400 font-mono"
            />
          </div>

          {/* Online Players in Current Room */}
          <div className="pt-2 border-t border-white/10">
            <div className="text-slate-400 mb-1.5 font-semibold">
              Jogadores Online nesta Sala ({onlinePlayers.length + 1}):
            </div>
            <div className="bg-black/50 p-2 rounded-lg space-y-1 max-h-24 overflow-y-auto">
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{name} (Você)</span>
              </div>
              {onlinePlayers.map((p, idx) => (
                <div key={`${p.id || 'player'}-${idx}`} className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Save / Connect Button */}
          <button
            type="submit"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-xl text-sm font-bold transition shadow-lg cursor-pointer"
          >
            Entrar / Mudar Sala
          </button>
        </form>
      </div>
    </div>
  );
};
