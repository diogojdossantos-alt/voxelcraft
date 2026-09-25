import React, { useCallback, useRef, useState } from 'react';

interface JoystickProps {
  /** Direcao atual, de -1 a 1 em cada eixo. y negativo e para frente. */
  onChange: (x: number, y: number) => void;
  /** Lado da base em pixels. */
  tamanho?: number;
}

/**
 * Joystick analogico de toque.
 *
 * Diferente de um direcional de quatro setas, ele anda em qualquer angulo e a
 * velocidade acompanha o quanto o dedo se afasta do centro.
 *
 * Usa Pointer Events, que cobre dedo e mouse com o mesmo codigo, e captura o
 * ponteiro: o dedo pode sair da area do joystick sem o movimento travar, que e
 * o que acontece na pratica quando a pessoa empurra para a beirada.
 */
export const Joystick: React.FC<JoystickProps> = ({ onChange, tamanho = 132 }) => {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const ponteiroAtivo = useRef<number | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const raio = tamanho / 2;
  const raioBotao = tamanho * 0.3;
  // O centro do botao para de acompanhar o dedo aqui, senao ele sairia da base.
  const alcance = raio - raioBotao / 2;

  const atualizar = useCallback(
    (clientX: number, clientY: number) => {
      const base = baseRef.current;
      if (!base) return;

      const r = base.getBoundingClientRect();
      let dx = clientX - (r.left + r.width / 2);
      let dy = clientY - (r.top + r.height / 2);

      const dist = Math.hypot(dx, dy);
      if (dist > alcance) {
        dx = (dx / dist) * alcance;
        dy = (dy / dist) * alcance;
      }

      setPos({ x: dx, y: dy });
      onChange(dx / alcance, dy / alcance);
    },
    [alcance, onChange]
  );

  const soltar = useCallback(() => {
    ponteiroAtivo.current = null;
    setPos({ x: 0, y: 0 });
    onChange(0, 0);
  }, [onChange]);

  return (
    <div
      ref={baseRef}
      style={{ width: tamanho, height: tamanho, touchAction: 'none' }}
      className="pointer-events-auto relative rounded-full bg-black/40 backdrop-blur-md border border-white/20 shadow-xl"
      onPointerDown={(e) => {
        if (ponteiroAtivo.current !== null) return; // ja tem um dedo aqui
        ponteiroAtivo.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        atualizar(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (ponteiroAtivo.current !== e.pointerId) return;
        atualizar(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (ponteiroAtivo.current !== e.pointerId) return;
        soltar();
      }}
      onPointerCancel={(e) => {
        if (ponteiroAtivo.current !== e.pointerId) return;
        soltar();
      }}
    >
      {/* Marcas dos eixos, so para dar referencia visual do centro */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-px h-2/3 bg-white/10" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-px w-2/3 bg-white/10" />
      </div>

      {/* Botao */}
      <div
        style={{
          width: raioBotao * 2,
          height: raioBotao * 2,
          // Centraliza o botao na base antes de deslocar com o dedo.
          marginLeft: -raioBotao,
          marginTop: -raioBotao,
          transform: `translate(${pos.x}px, ${pos.y}px)`,
        }}
        className={`absolute left-1/2 top-1/2 rounded-full border transition-colors ${
          pos.x || pos.y
            ? 'bg-emerald-500/80 border-emerald-300'
            : 'bg-white/25 border-white/40'
        }`}
      />
    </div>
  );
};
