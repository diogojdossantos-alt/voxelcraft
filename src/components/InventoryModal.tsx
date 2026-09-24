import React, { useState, useMemo } from 'react';
import { BlockType, BLOCK_METAS, CRAFTING_RECIPES, Recipe } from '../game/constants';
import { sound } from '../game/audio';
import {
  X,
  Hammer,
  Package,
  ArrowRight,
  Check,
  RotateCcw,
  Sparkles,
  Pickaxe,
  Sword,
  Flame,
  Layers,
  Wand2,
  Info,
} from 'lucide-react';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  hotbar: BlockType[];
  selectedSlot: number;
  onSetHotbarSlot: (slot: number, block: BlockType) => void;
  inventoryCounts: Record<number, number>;
  onConsumeIngredients?: (ingredients: { block: BlockType; count: number }[]) => void;
  onAddInventoryItem?: (block: BlockType, count: number) => void;
  isCreative?: boolean;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  hotbar,
  selectedSlot,
  onSetHotbarSlot,
  inventoryCounts,
  onConsumeIngredients,
  onAddInventoryItem,
  isCreative = false,
}) => {
  // Navigation Tabs: 'crafting' (Bancada & Grade), 'recipes' (Livro), 'catalog' (Catálogo Livre)
  const [activeTab, setActiveTab] = useState<'crafting' | 'catalog'>('crafting');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'tools' | 'blocks' | 'basic'>('all');
  const [selectedHotbarIndex, setSelectedHotbarIndex] = useState<number>(selectedSlot);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'warn' } | null>(null);

  // 3x3 Crafting Grid State (9 slots, 0 to 8)
  const [craftGrid, setCraftGrid] = useState<(BlockType | null)[]>([
    null, null, null,
    null, null, null,
    null, null, null,
  ]);

  // Selected item from player bag to place into grid
  const [selectedBagItem, setSelectedBagItem] = useState<BlockType | null>(BlockType.WOOD_LOG);


  const showToast = (text: string, type: 'success' | 'warn' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3200);
  };

  // Helper to get stylized color / gradient for blocks and items
  const getItemVisual = (type: BlockType) => {
    const meta = BLOCK_METAS[type];
    if (!meta) return { bg: 'from-gray-600 to-gray-800', isTool: false, icon: null };

    if (meta.isTool) {
      if (meta.toolType === 'pickaxe') {
        const colors: Partial<Record<BlockType, string>> = {
          [BlockType.WOODEN_PICKAXE]: 'from-amber-700 to-yellow-900 border-amber-500 text-amber-300',
          [BlockType.STONE_PICKAXE]: 'from-stone-500 to-neutral-700 border-stone-300 text-slate-200',
          [BlockType.IRON_PICKAXE]: 'from-slate-200 to-zinc-400 border-white text-zinc-800',
          [BlockType.DIAMOND_PICKAXE]: 'from-cyan-400 to-teal-600 border-cyan-300 text-white',
        };
        return {
          bg: colors[type] || 'from-stone-500 to-neutral-700',
          isTool: true,
          icon: <Pickaxe className="w-5 h-5 drop-shadow" />,
        };
      } else if (meta.toolType === 'axe') {
        return {
          bg: type === BlockType.WOODEN_AXE ? 'from-amber-700 to-yellow-900' : 'from-stone-500 to-neutral-700',
          isTool: true,
          icon: <Hammer className="w-5 h-5 drop-shadow" />,
        };
      } else if (meta.toolType === 'sword') {
        return {
          bg: type === BlockType.WOODEN_SWORD ? 'from-amber-700 to-yellow-900' : 'from-stone-500 to-neutral-700',
          isTool: true,
          icon: <Sword className="w-5 h-5 drop-shadow" />,
        };
      } else if (meta.toolType === 'shovel') {
        return {
          bg: type === BlockType.WOODEN_SHOVEL ? 'from-amber-700 to-yellow-900' : 'from-stone-500 to-neutral-700',
          isTool: true,
          icon: <Layers className="w-5 h-5 drop-shadow" />,
        };
      }
    }

    if (type === BlockType.STICK) {
      return {
        bg: 'from-amber-800 to-yellow-950',
        isTool: true,
        icon: <Wand2 className="w-4 h-4 text-amber-300 rotate-45 drop-shadow" />,
      };
    }

    if (type === BlockType.FURNACE) {
      return {
        bg: 'from-stone-700 to-neutral-900',
        isTool: false,
        icon: <Flame className="w-4 h-4 text-amber-500 animate-pulse drop-shadow" />,
      };
    }

    const blockColors: Partial<Record<BlockType, string>> = {
      [BlockType.GRASS]: 'from-emerald-500 to-green-700 border-emerald-400',
      [BlockType.DIRT]: 'from-amber-700 to-yellow-900 border-amber-600',
      [BlockType.STONE]: 'from-gray-400 to-gray-600 border-gray-400',
      [BlockType.COBBLESTONE]: 'from-gray-500 to-gray-700 border-stone-400',
      [BlockType.WOOD_LOG]: 'from-amber-800 to-yellow-950 border-amber-700',
      [BlockType.WOOD_PLANKS]: 'from-amber-600 to-amber-700 border-amber-500',
      [BlockType.LEAVES]: 'from-green-600 to-emerald-800 border-green-500',
      [BlockType.GLASS]: 'from-cyan-200 to-blue-300 border-cyan-200',
      [BlockType.BRICKS]: 'from-rose-600 to-red-800 border-red-500',
      [BlockType.SAND]: 'from-yellow-200 to-amber-400 border-yellow-300',
      [BlockType.WATER]: 'from-blue-500 to-indigo-600 border-blue-400',
      [BlockType.COAL_ORE]: 'from-neutral-800 to-stone-950 border-neutral-600',
      [BlockType.IRON_ORE]: 'from-orange-300 to-amber-600 border-orange-300',
      [BlockType.GOLD_ORE]: 'from-yellow-300 to-amber-500 border-yellow-300',
      [BlockType.DIAMOND_ORE]: 'from-cyan-300 to-teal-500 border-cyan-300',
      [BlockType.SNOW]: 'from-slate-100 to-blue-100 border-white',
      [BlockType.CACTUS]: 'from-emerald-600 to-green-800 border-emerald-500',
      [BlockType.FLOWER_RED]: 'from-red-500 to-rose-700 border-red-400',
      [BlockType.FLOWER_YELLOW]: 'from-yellow-400 to-amber-500 border-yellow-300',
      [BlockType.TORCH]: 'from-amber-400 to-orange-600 border-amber-300',
      [BlockType.TNT]: 'from-red-600 to-rose-700 border-red-500',
      [BlockType.BEDROCK]: 'from-neutral-900 to-black border-neutral-700',
      [BlockType.OBSIDIAN]: 'from-purple-950 to-indigo-950 border-purple-800',
      [BlockType.BOOKSHELF]: 'from-amber-700 to-amber-900 border-amber-600',
      [BlockType.CRAFTING_TABLE]: 'from-amber-600 to-amber-800 border-amber-400',
    };

    return {
      bg: blockColors[type] || 'from-gray-500 to-gray-700 border-gray-400',
      isTool: false,
      icon: null,
    };
  };

  // Evaluate current 3x3 crafting grid against recipes
  const activeGridResult = useMemo(() => {
    // Count ingredients placed in grid
    const placedCounts: Partial<Record<BlockType, number>> = {};
    let hasAnyItem = false;

    for (const cell of craftGrid) {
      if (cell !== null) {
        hasAnyItem = true;
        placedCounts[cell] = (placedCounts[cell] || 0) + 1;
      }
    }

    if (!hasAnyItem) return null;

    // Check exact pattern match or shapeless ingredient count match
    for (const recipe of CRAFTING_RECIPES) {
      // 1. Check exact 3x3 grid pattern match
      if (recipe.grid) {
        let patternMatch = true;
        for (let i = 0; i < 9; i++) {
          const expected = recipe.grid[i];
          const actual = craftGrid[i];
          if (expected !== actual) {
            patternMatch = false;
            break;
          }
        }
        if (patternMatch) return recipe;
      }

      // 2. Fallback: match total ingredient count exactly
      let ingredientsMatch = true;
      const requiredCounts: Partial<Record<BlockType, number>> = {};
      for (const ing of recipe.ingredients) {
        requiredCounts[ing.block] = ing.count;
      }

      // Compare counts
      const allKeys = Array.from(new Set([...Object.keys(placedCounts), ...Object.keys(requiredCounts)]));
      for (const k of allKeys) {
        const blockId = Number(k) as BlockType;
        if ((placedCounts[blockId] || 0) !== (requiredCounts[blockId] || 0)) {
          ingredientsMatch = false;
          break;
        }
      }

      if (ingredientsMatch) {
        return recipe;
      }
    }

    return null;
  }, [craftGrid]);

  // Check if player has enough materials for a given recipe
  const canPlayerAffordRecipe = (recipe: Recipe): boolean => {
    if (isCreative) return true;
    for (const ing of recipe.ingredients) {
      const available = inventoryCounts[ing.block] || 0;
      if (available < ing.count) return false;
    }
    return true;
  };

  // Populate 3x3 grid with a recipe's pattern
  const handleAutoFillGrid = (recipe: Recipe) => {
    if (!canPlayerAffordRecipe(recipe)) {
      sound.playHit('stone');
      showToast(`Materiais insuficientes para preencher: ${recipe.name}`, 'warn');
      return;
    }

    if (recipe.grid) {
      setCraftGrid([...recipe.grid]);
    } else {
      // Shapeless: place ingredients sequentially
      const newGrid: (BlockType | null)[] = [null, null, null, null, null, null, null, null, null];
      let slot = 0;
      for (const ing of recipe.ingredients) {
        for (let c = 0; c < ing.count && slot < 9; c++) {
          newGrid[slot++] = ing.block;
        }
      }
      setCraftGrid(newGrid);
    }

    sound.playPlace('wood');
    showToast(`Receita armada: ${recipe.name}! Clique no slot de resultado para fabricar.`);
  };

  // Execute craft from the 3x3 grid
  const handleExecuteCraftFromGrid = () => {
    if (!activeGridResult) return;

    const recipe = activeGridResult;

    if (!isCreative) {
      // Verify player still has items in backpack
      for (const ing of recipe.ingredients) {
        const available = inventoryCounts[ing.block] || 0;
        if (available < ing.count) {
          sound.playHit('stone');
          showToast(`Recurso esgotado na mochila: ${BLOCK_METAS[ing.block]?.name || 'Item'}`, 'warn');
          return;
        }
      }

      // Deduct ingredients
      if (onConsumeIngredients) {
        onConsumeIngredients(recipe.ingredients);
      }
    }

    // Add to player's inventory/hotbar
    if (onAddInventoryItem) {
      onAddInventoryItem(recipe.result.block, recipe.result.count);
    }

    // Also equip directly to selected hotbar slot
    onSetHotbarSlot(selectedHotbarIndex, recipe.result.block);

    // Audio & Visual celebratory feedback
    sound.playCraftSuccess();
    showToast(`✨ Fabricado com sucesso: ${recipe.result.count}x ${BLOCK_METAS[recipe.result.block]?.name}! Adicionado ao Slot ${selectedHotbarIndex + 1}.`);

    // Clear grid after crafting
    setCraftGrid([null, null, null, null, null, null, null, null, null]);
  };

  // Quick Craft directly from recipe list
  const handleDirectCraft = (recipe: Recipe) => {
    if (!canPlayerAffordRecipe(recipe)) {
      sound.playHit('stone');
      showToast(`Recursos insuficientes para fabricar ${recipe.name}. Colete mais materiais no mundo!`, 'warn');
      return;
    }

    if (!isCreative && onConsumeIngredients) {
      onConsumeIngredients(recipe.ingredients);
    }

    if (onAddInventoryItem) {
      onAddInventoryItem(recipe.result.block, recipe.result.count);
    }

    onSetHotbarSlot(selectedHotbarIndex, recipe.result.block);

    sound.playCraftSuccess();
    showToast(`✨ ${recipe.name} criado e equipado no Slot ${selectedHotbarIndex + 1}!`);
  };

  // Click on a cell in the 3x3 grid
  const handleGridCellClick = (idx: number) => {
    setCraftGrid((prev) => {
      const next = [...prev];
      if (next[idx] !== null) {
        // Clear cell
        next[idx] = null;
        sound.playHit('wood');
      } else if (selectedBagItem !== null) {
        // Place selected bag item
        next[idx] = selectedBagItem;
        sound.playPlace('wood');
      }
      return next;
    });
  };

  const handleClearGrid = () => {
    setCraftGrid([null, null, null, null, null, null, null, null, null]);
    sound.playHit('wood');
  };

  // Filtered recipes for the recipe book
  const filteredRecipes = useMemo(() => {
    if (categoryFilter === 'all') return CRAFTING_RECIPES;
    return CRAFTING_RECIPES.filter((r) => r.category === categoryFilter);
  }, [categoryFilter]);

  // Common craftable resources in bag
  const bagItems: { type: BlockType; name: string }[] = [
    { type: BlockType.WOOD_LOG, name: 'Tronco' },
    { type: BlockType.WOOD_PLANKS, name: 'Tábuas' },
    { type: BlockType.STICK, name: 'Gravetos' },
    { type: BlockType.DIRT, name: 'Terra' },
    { type: BlockType.STONE, name: 'Pedra' },
    { type: BlockType.COBBLESTONE, name: 'Pedregulho' },
    { type: BlockType.SAND, name: 'Areia' },
    { type: BlockType.COAL_ORE, name: 'Carvão' },
    { type: BlockType.IRON_ORE, name: 'Minério de Ferro' },
    { type: BlockType.DIAMOND_ORE, name: 'Diamante' },
    { type: BlockType.CRAFTING_TABLE, name: 'Bancada' },
    { type: BlockType.TORCH, name: 'Tocha' },
  ];

  const allCreativeBlocks: BlockType[] = Object.values(BlockType).filter(
    (b) => typeof b === 'number' && b !== BlockType.AIR
  ) as BlockType[];

  // Depois de todos os hooks: sair antes mudava a quantidade de hooks
  // entre um render e outro, e o React derrubava a arvore inteira.
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-neutral-950/95 border border-white/20 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Hammer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide font-mono flex items-center gap-2">
                <span>Bancada de Criação & Mochila</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-sans font-normal">
                  VoxelCraft 3D
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Combine recursos brutos como troncos e terra para criar ferramentas e blocos avançados.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('crafting')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'crafting'
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Bancada 3x3</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'catalog'
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Todos os Blocos</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div
            className={`mx-6 mt-3 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 shadow-lg border animate-in slide-in-from-top-2 duration-200 ${
              notification.type === 'success'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-amber-500/20 border-amber-500/50 text-amber-300'
            }`}
          >
            {notification.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <Info className="w-4 h-4 text-amber-400" />}
            <span>{notification.text}</span>
          </div>
        )}

        {/* Modal Main Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'crafting' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: 3x3 Interactive Crafting Matrix (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-4 bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold text-white font-mono">Grade de Criação 3x3</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearGrid}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg border border-white/10 transition cursor-pointer"
                    title="Limpar grade"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Limpar</span>
                  </button>
                </div>

                {/* 3x3 Matrix Grid + Output Arrow */}
                <div className="flex items-center justify-center gap-4 py-2">
                  {/* The 3x3 Slots */}
                  <div className="grid grid-cols-3 gap-2 bg-black/60 p-3 rounded-2xl border border-white/15 shadow-inner">
                    {craftGrid.map((cellItem, idx) => {
                      const visual = cellItem !== null ? getItemVisual(cellItem) : null;
                      const meta = cellItem !== null ? BLOCK_METAS[cellItem] : null;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleGridCellClick(idx)}
                          className={`w-14 h-14 rounded-xl flex items-center justify-center relative transition-all cursor-pointer border ${
                            cellItem !== null
                              ? 'bg-white/15 border-white/30 hover:border-red-400 hover:bg-red-500/10'
                              : 'bg-white/5 border-white/10 hover:border-emerald-400/50 hover:bg-white/10'
                          }`}
                          title={cellItem !== null ? `Remover ${meta?.name || 'Item'} da grade` : `Clique para colocar ${BLOCK_METAS[selectedBagItem || BlockType.WOOD_LOG]?.name || 'Item'}`}
                        >
                          {visual ? (
                            <div
                              className={`w-10 h-10 rounded-lg bg-gradient-to-br ${visual.bg} border border-white/20 shadow flex items-center justify-center text-white`}
                            >
                              {visual.icon}
                            </div>
                          ) : (
                            <span className="text-[10px] text-white/15 font-mono select-none">{idx + 1}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Flow Arrow */}
                  <div className="flex flex-col items-center gap-1 text-slate-400">
                    <ArrowRight className="w-6 h-6 text-emerald-400 animate-pulse" />
                    <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">Resultado</span>
                  </div>

                  {/* Output Craft Slot */}
                  <div className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExecuteCraftFromGrid}
                      disabled={!activeGridResult}
                      className={`w-18 h-18 rounded-2xl flex flex-col items-center justify-center relative transition-all cursor-pointer border-2 ${
                        activeGridResult
                          ? 'bg-emerald-600/30 border-emerald-400 shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 animate-pulse'
                          : 'bg-black/50 border-white/10 opacity-60 cursor-not-allowed'
                      }`}
                      title={activeGridResult ? `Clique para fabricar ${activeGridResult.name}` : 'Monte uma receita válida na grade'}
                    >
                      {activeGridResult ? (
                        <>
                          <div
                            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${
                              getItemVisual(activeGridResult.result.block).bg
                            } border border-white/30 shadow-lg flex items-center justify-center text-white`}
                          >
                            {getItemVisual(activeGridResult.result.block).icon}
                          </div>
                          <span className="absolute -bottom-2 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-bold text-[10px] shadow">
                            x{activeGridResult.result.count}
                          </span>
                        </>
                      ) : (
                        <div className="w-8 h-8 rounded-lg border border-dashed border-white/20 flex items-center justify-center text-slate-600">
                          ?
                        </div>
                      )}
                    </button>

                    {activeGridResult && (
                      <span className="text-[11px] font-bold text-emerald-400 text-center max-w-[90px] truncate">
                        {BLOCK_METAS[activeGridResult.result.block]?.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Player Bag Quick-Picker to place into grid */}
                <div className="border-t border-white/10 pt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold font-mono flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Recursos Coletados na Mochila:</span>
                    </span>
                    <span className="text-[11px] text-slate-400">Clique para selecionar</span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {bagItems.map(({ type, name }, idx) => {
                      const count = isCreative ? 99 : inventoryCounts[type] || 0;
                      const visual = getItemVisual(type);
                      const isSelected = selectedBagItem === type;

                      return (
                        <button
                          key={`${type}-${idx}`}
                          type="button"
                          onClick={() => {
                            setSelectedBagItem(type);
                            sound.playHit('wood');
                          }}
                          className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer relative ${
                            isSelected
                              ? 'bg-emerald-500/25 border-emerald-400 scale-105 shadow-md'
                              : 'bg-black/40 border-white/10 hover:border-white/25 hover:bg-white/5'
                          }`}
                          title={`${name} (Quantidade: ${count})`}
                        >
                          <div
                            className={`w-7 h-7 rounded-lg bg-gradient-to-br ${visual.bg} border border-white/20 flex items-center justify-center text-white`}
                          >
                            {visual.icon}
                          </div>
                          <span className="text-[10px] font-mono text-slate-300 font-bold">
                            x{count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Recipe Book & Quick Crafting (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-4 bg-white/5 border border-white/10 rounded-2xl p-5">
                {/* Categories & Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-bold text-white font-mono">Livro de Receitas Voxel</span>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setCategoryFilter('all')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        categoryFilter === 'all'
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      Todas ({CRAFTING_RECIPES.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryFilter('tools')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        categoryFilter === 'tools'
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      ⛏️ Ferramentas
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryFilter('blocks')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        categoryFilter === 'blocks'
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      🧱 Blocos
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryFilter('basic')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        categoryFilter === 'basic'
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      🪵 Básicos
                    </button>
                  </div>
                </div>

                {/* Recipe List Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                  {filteredRecipes.map((recipe, idx) => {
                    const canAfford = canPlayerAffordRecipe(recipe);
                    const visual = getItemVisual(recipe.result.block);

                    return (
                      <div
                        key={`${recipe.id}-${idx}`}
                        className={`p-3.5 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                          canAfford
                            ? 'bg-black/50 border-emerald-500/30 hover:border-emerald-500/60 shadow-lg'
                            : 'bg-black/30 border-white/10 opacity-75'
                        }`}
                      >
                        {/* Recipe Header */}
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${visual.bg} border border-white/25 shadow-md shrink-0 flex items-center justify-center text-white`}
                          >
                            {visual.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-xs font-bold text-white truncate font-mono">
                                {recipe.name}
                              </h4>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                  canAfford ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                }`}
                              >
                                {canAfford ? 'Disponível' : 'Falta'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mt-0.5">
                              {recipe.description}
                            </p>
                          </div>
                        </div>

                        {/* Ingredients Badge Row */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/10">
                          {recipe.ingredients.map((ing, idx) => {
                            const have = isCreative ? 99 : inventoryCounts[ing.block] || 0;
                            const hasEnough = have >= ing.count;
                            const ingName = BLOCK_METAS[ing.block]?.name || 'Item';

                            return (
                              <span
                                key={idx}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center gap-1 border ${
                                  hasEnough
                                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                    : 'bg-red-950/60 border-red-500/40 text-red-300'
                                }`}
                              >
                                <span>{ingName}</span>
                                <b className={hasEnough ? 'text-emerald-400' : 'text-red-400'}>
                                  ({have}/{ing.count})
                                </b>
                              </span>
                            );
                          })}
                        </div>

                        {/* Action Buttons: Auto-fill Grid or Quick Craft */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleAutoFillGrid(recipe)}
                            className="flex-1 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1 border border-white/10"
                            title="Montar ingredientes na grade 3x3"
                          >
                            <Sparkles className="w-3 h-3 text-cyan-400" />
                            <span>Ver na Grade</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDirectCraft(recipe)}
                            disabled={!canAfford}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow ${
                              canAfford
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 shadow-emerald-600/30'
                                : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                            }`}
                          >
                            <span>Fabricar</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Catalog Tab: All Blocks Palette (Creative Mode / Free Picking) */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <p className="font-mono">
                  Selecione qualquer bloco ou ferramenta para equipar diretamente no slot selecionado da sua barra de atalho.
                </p>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  Modo Criativo Ativo
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {allCreativeBlocks.map((block, idx) => {
                  const meta = BLOCK_METAS[block];
                  const visual = getItemVisual(block);

                  return (
                    <button
                      key={`${block}-${idx}`}
                      type="button"
                      onClick={() => {
                        onSetHotbarSlot(selectedHotbarIndex, block);
                        sound.playPlace('wood');
                        showToast(`Equipado: ${meta.name} no Slot ${selectedHotbarIndex + 1}!`);
                      }}
                      className="p-3 bg-white/5 hover:bg-white/15 border border-white/10 hover:border-emerald-400/60 rounded-2xl flex flex-col items-center justify-center gap-2 transition group cursor-pointer text-center"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${visual.bg} border border-white/25 shadow-md group-hover:scale-110 transition-transform flex items-center justify-center text-white`}
                      >
                        {visual.icon}
                      </div>
                      <span className="text-xs font-medium text-slate-200 group-hover:text-white line-clamp-1">
                        {meta.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Hotbar Slot Destination Selector Footer */}
        <div className="p-4 border-t border-white/10 bg-black/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <span>Equipar resultado no</span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
              Slot {selectedHotbarIndex + 1}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {hotbar.map((block, idx) => {
              const visual = getItemVisual(block);
              const isSelected = selectedHotbarIndex === idx;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedHotbarIndex(idx);
                    sound.playHit('wood');
                  }}
                  className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center transition cursor-pointer relative ${
                    isSelected
                      ? 'border-2 border-emerald-400 bg-white/25 scale-110 shadow-lg'
                      : 'border border-white/15 bg-black/50 hover:bg-white/10'
                  }`}
                  title={`Slot ${idx + 1}: ${BLOCK_METAS[block]?.name || 'Vazio'}`}
                >
                  <div
                    className={`w-5 h-5 rounded-md bg-gradient-to-br ${visual.bg} border border-white/20 flex items-center justify-center text-white scale-75`}
                  >
                    {visual.icon}
                  </div>
                  <span className="text-[9px] font-mono text-white/70 absolute -bottom-1">
                    {idx + 1}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium text-xs rounded-xl transition cursor-pointer"
          >
            Fechar [ESC]
          </button>
        </div>
      </div>
    </div>
  );
};
