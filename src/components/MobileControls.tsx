import React from 'react';
import { Pickaxe, Hammer, ChevronsUp, Swords, Mic } from 'lucide-react';
import { Joystick } from './Joystick';

interface MobileControlsProps {
  /** Direcao do joystick, de -1 a 1 por eixo. y negativo e para frente. */
  onJoystick: (x: number, y: number) => void;
  onJumpPress: (pressed: boolean) => void;
  onMineClick: () => void;
  onPlaceClick: () => void;
  onAttackClick?: () => void;
  onToggleFlight: () => void;
  isFlying: boolean;
  isCreative: boolean;
  visible?: boolean;
  voiceOn: boolean;
  voiceOpenMic: boolean;
  voiceTalking: boolean;
  onTalkPress: (pressed: boolean) => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onJoystick,
  onJumpPress,
  onMineClick,
  onPlaceClick,
  onAttackClick,
  onToggleFlight,
  isFlying,
  isCreative,
  visible = true,
  voiceOn,
  voiceOpenMic,
  voiceTalking,
  onTalkPress,
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-end p-4 pb-20 select-none">
      <div className="flex justify-between items-end w-full">
        {/* Joystick analogico: anda em qualquer angulo, e a velocidade
            acompanha o quanto o dedo se afasta do centro. */}
        <Joystick onChange={onJoystick} />

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
            {voiceOn && (
              <button
                // onTouchCancel importa: o toque pode ser interrompido (ligacao,
                // notificacao, dedo saindo do botao) e sem ele o microfone
                // ficaria preso aberto.
                onTouchStart={(e) => {
                  e.preventDefault();
                  if (!voiceOpenMic) onTalkPress(true);
                }}
                onTouchEnd={() => onTalkPress(false)}
                onTouchCancel={() => onTalkPress(false)}
                onMouseDown={() => !voiceOpenMic && onTalkPress(true)}
                onMouseUp={() => onTalkPress(false)}
                onMouseLeave={() => onTalkPress(false)}
                onContextMenu={(e) => e.preventDefault()}
                className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-[10px] font-bold shadow-xl border active:scale-95 cursor-pointer touch-none ${
                  voiceTalking
                    ? 'bg-emerald-500 border-emerald-200 text-white'
                    : 'bg-black/60 border-white/20 text-slate-200'
                }`}
              >
                <Mic className="w-5 h-5 mb-0.5" />
                {voiceOpenMic ? 'Aberto' : 'Falar'}
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
