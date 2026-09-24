import React, { useEffect, useRef, useState, useMemo } from 'react';
import { World } from '../game/world';
import { RemotePlayerAvatar } from '../game/avatar';
import { WATER_LEVEL, CHUNK_SIZE_X, CHUNK_SIZE_Z, BlockType, BLOCK_METAS } from '../game/constants';
import { Compass, ZoomIn, ZoomOut, Grid, Navigation, ChevronDown, ChevronUp, MapPin } from 'lucide-react';

interface MiniMapProps {
  world: World | null;
  playerPos: { x: number; y: number; z: number };
  playerYaw: number;
  remotePlayers?: Map<string, RemotePlayerAvatar>;
  visible?: boolean;
  onToggleVisible?: () => void;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  world,
  playerPos,
  playerYaw,
  remotePlayers,
  visible = true,
  onToggleVisible,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mini-map configuration states
  const [zoomLevel, setZoomLevel] = useState<number>(1.5); // 1x, 1.5x, 2.5x
  const [rotateWithPlayer, setRotateWithPlayer] = useState<boolean>(false); // North-up vs Camera-up
  const [showGrid, setShowGrid] = useState<boolean>(true); // Chunk coordinate grid
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Map canvas dimension
  const mapSize = 180;
  const halfSize = mapSize / 2;

  // Detect current biome name based on player position
  const currentBiome = useMemo(() => {
    if (!world) return 'Planície';
    const biomeVal = world.generator.biomeNoise.fbm2D(playerPos.x * 0.005, playerPos.z * 0.005, 2);
    if (biomeVal > 0.25) {
      return playerPos.y > 26 ? '🏔️ Montanhas Nevadas' : '⛰️ Cordilheira';
    } else if (biomeVal < -0.25) {
      return '🏜️ Deserto Quente';
    } else {
      return playerPos.y <= WATER_LEVEL + 1 ? '🌊 Costa Marítima' : '🌲 Planície & Floresta';
    }
  }, [world, playerPos.x, playerPos.y, playerPos.z]);

  // Handle hotkey 'M' to toggle minimap minimize/visibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in chat or an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'm' || e.key === 'M') {
        setIsMinimized((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Main rendering loop for the 2D grid map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !world || isMinimized) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.clearRect(0, 0, mapSize, mapSize);

    // Number of blocks visible across the map diameter
    // zoom 1.0 -> 80 blocks; zoom 1.5 -> 54 blocks; zoom 2.5 -> 32 blocks
    const viewBlocks = Math.round(80 / zoomLevel);
    const blockSize = mapSize / viewBlocks;

    // Center coordinates in world space
    const centerWorldX = playerPos.x;
    const centerWorldZ = playerPos.z;

    ctx.save();

    // If rotating with camera, rotate canvas around center
    if (rotateWithPlayer) {
      ctx.translate(halfSize, halfSize);
      ctx.rotate(-playerYaw);
      ctx.translate(-halfSize, -halfSize);
    }

    // 1. Draw Terrain Blocks
    const minBx = Math.floor(centerWorldX - viewBlocks / 2);
    const maxBx = Math.ceil(centerWorldX + viewBlocks / 2);
    const minBz = Math.floor(centerWorldZ - viewBlocks / 2);
    const maxBz = Math.ceil(centerWorldZ + viewBlocks / 2);

    for (let bz = minBz; bz <= maxBz; bz++) {
      for (let bx = minBx; bx <= maxBx; bx++) {
        const screenX = halfSize + (bx - centerWorldX) * blockSize;
        const screenZ = halfSize + (bz - centerWorldZ) * blockSize;

        if (screenX < -blockSize || screenX > mapSize || screenZ < -blockSize || screenZ > mapSize) {
          continue;
        }

        // Sample surface block type and elevation
        const surfaceY = world.generator.getSurfaceHeight(bx, bz);
        const biomeVal = world.generator.biomeNoise.fbm2D(bx * 0.005, bz * 0.005, 2);

        // Check if there are user placed/modified blocks on the surface
        let blockColor = '#22c55e'; // default lush grass

        // Check top modified block
        let modifiedFound = false;
        for (let checkY = Math.min(31, surfaceY + 4); checkY >= Math.max(1, surfaceY - 2); checkY--) {
          const key = `${bx},${checkY},${bz}`;
          if (world.modifiedBlocks.has(key)) {
            const modBlock = world.modifiedBlocks.get(key)!;
            if (modBlock !== BlockType.AIR) {
              modifiedFound = true;
              switch (modBlock) {
                case BlockType.WOOD_LOG:
                case BlockType.WOOD_PLANKS:
                case BlockType.BOOKSHELF:
                case BlockType.CRAFTING_TABLE:
                  blockColor = '#b45309';
                  break;
                case BlockType.STONE:
                case BlockType.COBBLESTONE:
                case BlockType.BEDROCK:
                  blockColor = '#64748b';
                  break;
                case BlockType.BRICKS:
                  blockColor = '#b91c1c';
                  break;
                case BlockType.GLASS:
                  blockColor = '#93c5fd';
                  break;
                case BlockType.WATER:
                  blockColor = '#2563eb';
                  break;
                case BlockType.SAND:
                  blockColor = '#eab308';
                  break;
                case BlockType.TNT:
                  blockColor = '#ef4444';
                  break;
                case BlockType.SNOW:
                  blockColor = '#f8fafc';
                  break;
                default:
                  blockColor = '#8b5cf6';
                  break;
              }
              break;
            }
          }
        }

        if (!modifiedFound) {
          if (surfaceY <= WATER_LEVEL) {
            // Water body
            const depth = WATER_LEVEL - surfaceY;
            blockColor = depth > 1 ? '#1d4ed8' : '#38bdf8';
          } else if (biomeVal < -0.25) {
            // Desert Sand
            blockColor = '#eab308';
          } else if (biomeVal > 0.25 && surfaceY > 26) {
            // Mountain peak / Snow
            blockColor = surfaceY > 29 ? '#f8fafc' : '#64748b';
          } else {
            // Plains & Forests
            // Tree noise match
            const treeSeed = (Math.sin(bx * 12.9898 + bz * 78.233) * 43758.5453) % 1;
            if (Math.abs(treeSeed) > 0.88) {
              blockColor = '#15803d'; // Tree canopy
            } else {
              blockColor = '#22c55e'; // Green grass
            }
          }
        }

        // Topographical relief shading (hillshade)
        const westHeight = world.generator.getSurfaceHeight(bx - 1, bz - 1);
        const slope = surfaceY - westHeight;

        ctx.fillStyle = blockColor;
        ctx.fillRect(screenX, screenZ, blockSize + 0.5, blockSize + 0.5);

        // Hillshade overlay
        if (slope !== 0 && surfaceY > WATER_LEVEL) {
          ctx.fillStyle = slope > 0 ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.18)';
          ctx.fillRect(screenX, screenZ, blockSize + 0.5, blockSize + 0.5);
        }
      }
    }

    // 2. Draw 2D Coordinate Grid (16-block chunk boundaries)
    if (showGrid) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';

      // Vertical grid lines (Z lines where X % 16 === 0)
      const firstGridX = Math.floor(minBx / CHUNK_SIZE_X) * CHUNK_SIZE_X;
      for (let gx = firstGridX; gx <= maxBx; gx += CHUNK_SIZE_X) {
        const sx = halfSize + (gx - centerWorldX) * blockSize;
        ctx.beginPath();
        // Highlight Origin (X = 0) with a warm accent line
        ctx.strokeStyle = gx === 0 ? 'rgba(251, 191, 36, 0.65)' : 'rgba(255, 255, 255, 0.18)';
        ctx.setLineDash(gx === 0 ? [] : [2, 2]);
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, mapSize);
        ctx.stroke();
      }

      // Horizontal grid lines (X lines where Z % 16 === 0)
      const firstGridZ = Math.floor(minBz / CHUNK_SIZE_Z) * CHUNK_SIZE_Z;
      for (let gz = firstGridZ; gz <= maxBz; gz += CHUNK_SIZE_Z) {
        const sz = halfSize + (gz - centerWorldZ) * blockSize;
        ctx.beginPath();
        // Highlight Origin (Z = 0) with a warm accent line
        ctx.strokeStyle = gz === 0 ? 'rgba(251, 191, 36, 0.65)' : 'rgba(255, 255, 255, 0.18)';
        ctx.setLineDash(gz === 0 ? [] : [2, 2]);
        ctx.moveTo(0, sz);
        ctx.lineTo(mapSize, sz);
        ctx.stroke();
      }

      ctx.setLineDash([]);
    }

    // 3. Draw Remote Multiplayer Players
    if (remotePlayers && remotePlayers.size > 0) {
      remotePlayers.forEach((other) => {
        const otherPos = other.group.position;
        const relX = (otherPos.x - centerWorldX) * blockSize;
        const relZ = (otherPos.z - centerWorldZ) * blockSize;

        const screenX = halfSize + relX;
        const screenZ = halfSize + relZ;

        // Draw player dot if inside canvas, or clamp to edge with a small pointer
        const isInside = screenX >= 6 && screenX <= mapSize - 6 && screenZ >= 6 && screenZ <= mapSize - 6;

        let drawX = screenX;
        let drawZ = screenZ;

        if (!isInside) {
          // Clamp to border
          const angle = Math.atan2(relZ, relX);
          drawX = halfSize + Math.cos(angle) * (halfSize - 10);
          drawZ = halfSize + Math.sin(angle) * (halfSize - 10);
        }

        // Other player dot
        ctx.beginPath();
        ctx.arc(drawX, drawZ, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Player name tag
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(other.name.slice(0, 8), drawX, drawZ - 6);
      });
    }

    // 4. Draw Player Field of View (FOV) cone and Direction Pointer
    ctx.save();
    ctx.translate(halfSize, halfSize);

    // If map does not rotate with player, rotate player arrow by playerYaw
    // Looking North (yaw=0) is straight UP (-Y on 2D canvas)
    const arrowRotation = rotateWithPlayer ? 0 : playerYaw;
    ctx.rotate(arrowRotation);

    // FOV Vision Cone
    const fovGradient = ctx.createRadialGradient(0, 0, 2, 0, 0, 38);
    fovGradient.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
    fovGradient.addColorStop(0.7, 'rgba(56, 189, 248, 0.15)');
    fovGradient.addColorStop(1, 'rgba(56, 189, 248, 0)');

    ctx.beginPath();
    ctx.moveTo(0, 0);
    // 65-degree FOV cone facing forward (straight up)
    ctx.arc(0, 0, 36, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55);
    ctx.closePath();
    ctx.fillStyle = fovGradient;
    ctx.fill();

    // Directional Player Arrow (Sleek Aircraft / GPS style marker)
    ctx.beginPath();
    ctx.moveTo(0, -9); // Tip pointing forward
    ctx.lineTo(6, 6);  // Right fin
    ctx.lineTo(0, 3);  // Center notch
    ctx.lineTo(-6, 6); // Left fin
    ctx.closePath();

    ctx.fillStyle = '#10b981'; // Vibrant emerald
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Pulsing central dot
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore(); // restore player translate
    ctx.restore(); // restore map rotate

    // 5. Compass Cardinal Indicators (N, S, E, W)
    ctx.save();
    const compassMargin = 12;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // In Rotate Mode, compass letters orbit around the center
    const cardinalOffsetAngle = rotateWithPlayer ? -playerYaw : 0;

    const cardinals = [
      { label: 'N', angle: -Math.PI / 2, color: '#ef4444' }, // North = Red
      { label: 'E', angle: 0, color: '#e2e8f0' },            // East = White
      { label: 'S', angle: Math.PI / 2, color: '#e2e8f0' },   // South = White
      { label: 'W', angle: Math.PI, color: '#e2e8f0' },       // West = White
    ];

    cardinals.forEach(({ label, angle, color }) => {
      const finalAngle = angle + cardinalOffsetAngle;
      const cx = halfSize + Math.cos(finalAngle) * (halfSize - compassMargin);
      const cy = halfSize + Math.sin(finalAngle) * (halfSize - compassMargin);

      // Shadow background pill for legibility
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fill();

      ctx.fillStyle = color;
      ctx.fillText(label, cx, cy + 0.5);
    });

    ctx.restore();

    // 6. Vignette / Radar Border Frame
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.strokeRect(1, 1, mapSize - 2, mapSize - 2);

    // Subtle crosshair tick marks at edges
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.moveTo(halfSize, 0);
    ctx.lineTo(halfSize, 5);
    ctx.moveTo(halfSize, mapSize);
    ctx.lineTo(halfSize, mapSize - 5);
    ctx.moveTo(0, halfSize);
    ctx.lineTo(5, halfSize);
    ctx.moveTo(mapSize, halfSize);
    ctx.lineTo(mapSize - 5, halfSize);
    ctx.stroke();

    ctx.restore();
  }, [world, playerPos, playerYaw, remotePlayers, zoomLevel, rotateWithPlayer, showGrid, isMinimized]);

  if (!visible) return null;

  return (
    <div className="pointer-events-auto select-none flex flex-col items-end gap-1.5 font-sans animate-in fade-in duration-200">
      {/* Mini-map Container Card */}
      <div className="bg-neutral-950/85 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-2 flex flex-col gap-2">
        {/* Top Header: Title, Biome & Collapse */}
        <div className="flex items-center justify-between gap-2 px-1 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-white tracking-wide">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-mono">Mini-Mapa</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Rotate mode toggle */}
            {!isMinimized && (
              <button
                type="button"
                onClick={() => setRotateWithPlayer((prev) => !prev)}
                className={`p-1 rounded text-[10px] transition cursor-pointer ${
                  rotateWithPlayer
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                    : 'bg-white/10 text-slate-400 hover:text-white'
                }`}
                title={rotateWithPlayer ? 'Modo: Câmera no topo (Girar)' : 'Modo: Norte fixo no topo'}
              >
                <Navigation className={`w-3 h-3 ${rotateWithPlayer ? 'rotate-45 text-emerald-400' : ''}`} />
              </button>
            )}

            {/* Grid toggle */}
            {!isMinimized && (
              <button
                type="button"
                onClick={() => setShowGrid((prev) => !prev)}
                className={`p-1 rounded text-[10px] transition cursor-pointer ${
                  showGrid
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                    : 'bg-white/10 text-slate-400 hover:text-white'
                }`}
                title="Alternar grade de chunks (16x16 blocos)"
              >
                <Grid className="w-3 h-3" />
              </button>
            )}

            {/* Zoom In */}
            {!isMinimized && (
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.min(2.5, prev + 0.5))}
                disabled={zoomLevel >= 2.5}
                className="p-1 rounded bg-white/10 text-slate-300 hover:text-white disabled:opacity-40 transition cursor-pointer"
                title="Aproximar Zoom"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            )}

            {/* Zoom Out */}
            {!isMinimized && (
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.max(1.0, prev - 0.5))}
                disabled={zoomLevel <= 1.0}
                className="p-1 rounded bg-white/10 text-slate-300 hover:text-white disabled:opacity-40 transition cursor-pointer"
                title="Afastar Zoom"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
            )}

            {/* Minimize / Expand Toggle */}
            <button
              type="button"
              onClick={() => setIsMinimized((prev) => !prev)}
              className="p-1 rounded bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              title={isMinimized ? 'Expandir Mapa [M]' : 'Minimizar Mapa [M]'}
            >
              {isMinimized ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* 2D Canvas Area */}
        {!isMinimized && (
          <div className="relative w-[180px] h-[180px] rounded-xl overflow-hidden bg-black border border-white/10 shadow-inner flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={mapSize}
              height={mapSize}
              className="w-full h-full block"
            />

            {/* Zoom level badge indicator */}
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 border border-white/10 text-[9px] font-mono text-slate-300 pointer-events-none">
              {zoomLevel.toFixed(1)}x
            </div>
          </div>
        )}

        {/* Bottom Coordinates & Biome Footer */}
        <div className="flex flex-col gap-0.5 px-1 font-mono text-[10px] text-slate-300 border-t border-white/10 pt-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 text-emerald-400" />
              <span>X: <b className="text-white">{Math.floor(playerPos.x)}</b></span>
              <span>Y: <b className="text-white">{Math.floor(playerPos.y)}</b></span>
              <span>Z: <b className="text-white">{Math.floor(playerPos.z)}</b></span>
            </span>
          </div>

          <div className="text-[9px] text-emerald-400 font-sans font-medium truncate max-w-[180px]">
            {currentBiome}
          </div>
        </div>
      </div>
    </div>
  );
};
