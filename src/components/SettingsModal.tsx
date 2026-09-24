import React from 'react';
import { Volume2, VolumeX, Sun, Moon, Eye, Shield, RefreshCw, X, CloudRain, CloudSnow, CloudLightning, Sparkles } from 'lucide-react';
import { sound } from '../game/audio';
import { WeatherType } from '../game/weather';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  renderRadius: number;
  onSetRenderRadius: (r: number) => void;
  timeOfDay: number;
  onSetTimeOfDay: (t: number) => void;
  isCyclePaused: boolean;
  onToggleCyclePaused: () => void;
  isCreative: boolean;
  onToggleCreative: () => void;
  onRespawn: () => void;
  volume: number;
  onSetVolume: (vol: number) => void;
  weather: WeatherType;
  isWeatherAuto: boolean;
  onSetWeather: (w: WeatherType) => void;
  onToggleWeatherAuto: () => void;
  onTriggerThunder: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  renderRadius,
  onSetRenderRadius,
  timeOfDay,
  onSetTimeOfDay,
  isCyclePaused,
  onToggleCyclePaused,
  isCreative,
  onToggleCreative,
  onRespawn,
  volume,
  onSetVolume,
  weather,
  isWeatherAuto,
  onSetWeather,
  onToggleWeatherAuto,
  onTriggerThunder,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-900/95 border border-white/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 bg-black/40 flex items-center justify-between">
          <div className="text-white font-bold text-base">Configurações do Jogo</div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Body */}
        <div className="p-5 space-y-4 text-xs font-sans overflow-y-auto">
          {/* Dynamic Weather System */}
          <div className="space-y-2.5 bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <div className="flex items-center gap-2">
                {weather === 'clear' && <Sun className="w-4 h-4 text-amber-400" />}
                {weather === 'rain' && <CloudRain className="w-4 h-4 text-cyan-400 animate-pulse" />}
                {weather === 'snow' && <CloudSnow className="w-4 h-4 text-slate-200 animate-bounce" />}
                <span>Sistema de Clima Dinâmico</span>
              </div>
              <button
                type="button"
                onClick={onToggleWeatherAuto}
                className={`text-[10px] px-2 py-0.5 rounded border transition cursor-pointer ${
                  isWeatherAuto
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-white/10 text-slate-400 border-white/20'
                }`}
                title="Alterna entre clima aleatório automático ou manual"
              >
                {isWeatherAuto ? '🎲 Modo Automático' : 'Manual'}
              </button>
            </div>

            {/* Weather Selection Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onSetWeather('clear')}
                className={`py-2 px-2.5 rounded-lg font-medium border flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                  weather === 'clear'
                    ? 'bg-amber-500/30 text-amber-300 border-amber-400 shadow-md'
                    : 'bg-black/40 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Ensolarado</span>
              </button>

              <button
                type="button"
                onClick={() => onSetWeather('rain')}
                className={`py-2 px-2.5 rounded-lg font-medium border flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                  weather === 'rain'
                    ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400 shadow-md'
                    : 'bg-black/40 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
              >
                <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
                <span>Chuva</span>
              </button>

              <button
                type="button"
                onClick={() => onSetWeather('snow')}
                className={`py-2 px-2.5 rounded-lg font-medium border flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                  weather === 'snow'
                    ? 'bg-blue-300/30 text-blue-200 border-blue-300 shadow-md'
                    : 'bg-black/40 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
              >
                <CloudSnow className="w-3.5 h-3.5 text-blue-200" />
                <span>Neve</span>
              </button>
            </div>

            {/* Thunder trigger test button */}
            <button
              type="button"
              onClick={onTriggerThunder}
              className="w-full py-1.5 bg-black/40 hover:bg-amber-500/20 text-slate-300 hover:text-amber-200 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer border border-white/10"
            >
              <CloudLightning className="w-3.5 h-3.5 text-amber-400" />
              <span>Simular Relâmpago e Trovão</span>
            </button>
          </div>

          {/* Audio Volume */}
          <div className="space-y-1.5 bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <div className="flex items-center gap-2">
                {volume > 0 ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
                <span>Volume dos Efeitos Sonoros</span>
              </div>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onSetVolume(val);
                sound.volume = val;
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Render Distance */}
          <div className="space-y-1.5 bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>Distância de Renderização</span>
              </div>
              <span>{renderRadius} Chunks ({renderRadius * 16}m)</span>
            </div>
            <input
              type="range"
              min="2"
              max="5"
              step="1"
              value={renderRadius}
              onChange={(e) => onSetRenderRadius(parseInt(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Day / Night Cycle */}
          <div className="space-y-2 bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <div className="flex items-center gap-2">
                {timeOfDay > 0.15 && timeOfDay < 0.85 ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-blue-300" />
                )}
                <span>Hora do Dia</span>
              </div>
              <button
                type="button"
                onClick={onToggleCyclePaused}
                className={`text-[10px] px-2 py-0.5 rounded border transition cursor-pointer ${
                  isCyclePaused
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-white/10 text-slate-300 border-white/20'
                }`}
              >
                {isCyclePaused ? 'Ciclo Pausado' : 'Ciclo Ativo'}
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={timeOfDay}
              onChange={(e) => onSetTimeOfDay(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span onClick={() => onSetTimeOfDay(0.0)} className="cursor-pointer hover:text-white">Meia-Noite</span>
              <span onClick={() => onSetTimeOfDay(0.25)} className="cursor-pointer hover:text-white">Alvorecer</span>
              <span onClick={() => onSetTimeOfDay(0.5)} className="cursor-pointer hover:text-white">Meio-Dia</span>
              <span onClick={() => onSetTimeOfDay(0.75)} className="cursor-pointer hover:text-white">Pôr do Sol</span>
            </div>
          </div>

          {/* Game Mode Toggle */}
          <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>Modo de Jogo</span>
            </div>
            <button
              type="button"
              onClick={onToggleCreative}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                isCreative ? 'bg-purple-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              {isCreative ? 'Criativo (Construção Livre)' : 'Sobrevivência'}
            </button>
          </div>

          {/* Teleport to surface */}
          <button
            type="button"
            onClick={() => {
              onRespawn();
              onClose();
            }}
            className="w-full py-2.5 bg-white/10 hover:bg-white/20 active:scale-98 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer border border-white/15"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            <span>Teleportar para a Superfície / Respawn</span>
          </button>
        </div>
      </div>
    </div>
  );
};
