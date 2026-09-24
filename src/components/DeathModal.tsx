import React from 'react';
import { Skull, RefreshCw, Sparkles } from 'lucide-react';

interface DeathModalProps {
  isOpen: boolean;
  deathCause: string;
  onRespawn: () => void;
  onSwitchToCreative: () => void;
}

export const DeathModal: React.FC<DeathModalProps> = ({
  isOpen,
  deathCause,
  onRespawn,
  onSwitchToCreative,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-neutral-900/95 border-2 border-red-600/80 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.4)] p-6 text-center space-y-6">
        {/* Skull Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-red-950/80 border-2 border-red-500/50 flex items-center justify-center text-red-500 shadow-inner animate-bounce">
          <Skull className="w-9 h-9" />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-red-500 tracking-wider uppercase font-mono drop-shadow-[0_2px_10px_rgba(239,68,68,0.8)]">
            Você Morreu!
          </h2>
          <p className="text-sm font-medium text-slate-300">
            {deathCause || 'Derrotado na escuridão por criaturas hostis.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={onRespawn}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 active:scale-98 text-white font-bold rounded-xl shadow-lg border border-red-400 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Renascer no Ponto Seguro</span>
          </button>

          <button
            onClick={onSwitchToCreative}
            className="w-full py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 active:scale-98 text-slate-200 hover:text-white font-medium text-sm rounded-xl border border-white/10 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Continuar em Modo Criativo (Invulnerável)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
