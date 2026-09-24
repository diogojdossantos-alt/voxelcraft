import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Pickaxe, Hammer, ChevronsUp, Swords } from 'lucide-react';

interface MobileControlsProps {
  onDirectionPress: (dir: 'forward' | 'backward' | 'left' | 'right', pressed: boolean) => void;
  onJumpPress: (pressed: boolean) => void;
  onMineClick: () => void;
  onPlaceClick: () => void;
  onAttackClick?: () => void;
  onToggleFlight: () => void;
  isFlying: boolean;
  isCreative: boolean;
  visible?: boolean;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onDirectionPress,
  onJumpPress,
  onMineClick,
  onPlaceClick,
  onAttackClick,
  onToggleFlight,
  isFlying,
  isCreative,
  visible = true,
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-end p-4 pb-20 select-none">
      <div className="flex justify-between items-end w-full">
        {/* Virtual D-pad for Movement */}
        <div className="pointer-events-auto grid grid-cols-3 gap-1.5 w-36 h-36 bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-white/20">
          <div />
          <button
            onTouchStart={() => onDirectionPress('forward', true)}
            onTouchEnd={() => onDirectionPress('forward', false)}
            onMouseDown={() => onDirectionPress('forward', true)}
            onMouseUp={() => onDirectionPress('forward', false)}
            className="flex items-center justify-center bg-white/20 active:bg-emerald-500 rounded-xl text-white transition active:scale-95 cursor-pointer"
          >
            <ArrowUp className="w-6 h-6" />
          </button>
          <div />

          <button
            onTouchStart={() => onDirectionPress('left', true)}
            onTouchEnd={() => onDirectionPress('left', false)}
            onMouseDown={() => onDirectionPress('left', true)}
            onMouseUp={() => onDirectionPress('left', false)}
            className="flex items-center justify-center bg-white/20 active:bg-emerald-500 rounded-xl text-white transition active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-white/30" />
          </div>
          <button
            onTouchStart={() => onDirectionPress('right', true)}
            onTouchEnd={() => onDirectionPress('right', false)}
            onMouseDown={() => onDirectionPress('right', true)}
            onMouseUp={() => onDirectionPress('right', false)}
            className="flex items-center justify-center bg-white/20 active:bg-emerald-500 rounded-xl text-white transition active:scale-95 cursor-pointer"
          >
            <ArrowRight className="w-6 h-6" />
          </button>

          <div />
          <button
            onTouchStart={() => onDirectionPress('backward', true)}
            onTouchEnd={() => onDirectionPress('backward', false)}
            onMouseDown={() => onDirectionPress('backward', true)}
            onMouseUp={() => onDirectionPress('backward', false)}
            className="flex items-center justify-center bg-white/20 active:bg-emerald-500 rounded-xl text-white transition active:scale-95 cursor-pointer"
          >
            <ArrowDown className="w-6 h-6" />
          </button>
          <div />
        </div>

        {/* Action Buttons (Attack, Mine, Place, Jump, Fly) */}
        <div className="pointer-events-auto flex flex-col gap-2 items-end">
          <div className="flex gap-2">
            {isCreative && (
              <button
                onClick={onToggleFlight}
                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-xs font-bold border transition active:scale-95 shadow-lg cursor-pointer ${
                  isFlying
                    ? 'bg-amber-500/80 border-amber-300 text-white'
                    : 'bg-black/60 border-white/20 text-slate-200'
                }`}
              >
                <ChevronsUp className="w-5 h-5" />
              </button>
            )}
            <button
              onTouchStart={() => onJumpPress(true)}
              onTouchEnd={() => onJumpPress(false)}
              onMouseDown={() => onJumpPress(true)}
              onMouseUp={() => onJumpPress(false)}
              className="w-14 h-14 bg-emerald-600 active:bg-emerald-500 text-white rounded-2xl flex flex-col items-center justify-center font-bold text-xs shadow-xl border border-white/20 active:scale-95 cursor-pointer"
            >
              Pular
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onAttackClick || onMineClick}
              className="w-14 h-14 bg-red-600/90 active:bg-red-500 text-white rounded-2xl flex flex-col items-center justify-center text-[10px] font-bold shadow-xl border border-red-400 active:scale-95 cursor-pointer"
            >
              <Swords className="w-5 h-5 mb-0.5" />
              Atacar
            </button>
            <button
              onClick={onMineClick}
              className="w-14 h-14 bg-amber-600/90 active:bg-amber-500 text-white rounded-2xl flex flex-col items-center justify-center text-[10px] font-bold shadow-xl border border-amber-400 active:scale-95 cursor-pointer"
            >
              <Pickaxe className="w-5 h-5 mb-0.5" />
              Minerar
            </button>
            <button
              onClick={onPlaceClick}
              className="w-14 h-14 bg-blue-600/90 active:bg-blue-500 text-white rounded-2xl flex flex-col items-center justify-center text-[10px] font-bold shadow-xl border border-white/20 active:scale-95 cursor-pointer"
            >
              <Hammer className="w-5 h-5 mb-0.5" />
              Colocar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
