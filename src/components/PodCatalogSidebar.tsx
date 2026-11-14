import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Check,
  ChevronDown,
  Plus,
  RotateCw,
  X,
  Grid2x2,
  Trash2,
} from 'lucide-react';
import { PodCategory, PodDefinition, PlacedPod } from '../types';
import { POD_CATALOG, CATEGORY_COLORS } from '../utils/podCatalog';
import { audioManager } from '../utils/audioManager';

export type CatalogGroupId = 'required' | 'life' | 'power' | 'science' | 'colony' | 'all';

interface PodCatalogSidebarProps {
  selectedCatalogPod: PodDefinition | null;
  onSelectCatalogPod: (pod: PodDefinition | null) => void;
  placedPods: PlacedPod[];
  placementRotation: number;
  onRotateGhost: () => void;
  deleteMode?: boolean;
  onExitDeleteMode?: () => void;
  forcedGroup?: CatalogGroupId | null;
  highlightTutorial?: boolean;
}

interface CatalogGroupDef {
  id: CatalogGroupId;
  label: string;
  categories: PodCategory[];
}

const CATALOG_GROUPS: CatalogGroupDef[] = [
  { id: 'required', label: 'Required', categories: [] },
  { id: 'life', label: 'Life & Food', categories: ['Life Support', 'Food & Agriculture'] },
  {
    id: 'power',
    label: 'Power & Tech',
    categories: ['Energy & Electricity', 'Engineering & Manufacturing'],
  },
  { id: 'science', label: 'Science & Med', categories: ['Science & Research', 'Medical & Health'] },
  {
    id: 'colony',
    label: 'Fleet & Base',
    categories: [
      'Transportation & Exploration',
      'Waste & Recycling',
      'Recreation & Community',
      'Security & Emergency',
    ],
  },
  { id: 'all', label: 'All', categories: [] },
];

const SHORT_CATEGORY_LABEL: Record<PodCategory, string> = {
  Essential: 'Core',
  'Food & Agriculture': 'Food',
  'Life Support': 'Life Support',
  'Medical & Health': 'Medical',
  'Science & Research': 'Science',
  'Energy & Electricity': 'Power',
  'Engineering & Manufacturing': 'Industry',
  'Transportation & Exploration': 'Fleet',
  'Waste & Recycling': 'Recycling',
  'Recreation & Community': 'Community',
  'Security & Emergency': 'Security',
};

function getPrimaryMetric(pod: PodDefinition): { label: string; positive: boolean } {
  if (pod.crewCapacity && pod.crewCapacity > 0) {
    return { label: `${pod.crewCapacity} Berths`, positive: true };
  }
  if (pod.powerKW < 0) {
    return { label: `+${Math.abs(pod.powerKW)} kW`, positive: true };
  }
  if (pod.o2Rate < 0) {
    return { label: `+${Math.abs(pod.o2Rate)} kg/d O₂`, positive: true };
  }
  if (pod.waterRate < 0) {
    return { label: `+${Math.abs(pod.waterRate)} L/d H₂O`, positive: true };
  }
  if (pod.foodRate && pod.foodRate < 0) {
    return { label: `+${Math.abs(pod.foodRate)} kg/d Food`, positive: true };
  }
  return { label: `-${pod.powerKW} kW`, positive: false };
}

export const PodCatalogSidebar: React.FC<PodCatalogSidebarProps> = ({
  selectedCatalogPod,
  onSelectCatalogPod,
  placedPods,
  placementRotation,
  onRotateGhost,
  deleteMode = false,
  onExitDeleteMode,
  forcedGroup = null,
  highlightTutorial = false,
}) => {
  const [activeGroup, setActiveGroup] = useState<CatalogGroupId>('required');
  const [subCategory, setSubCategory] = useState<PodCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [hoveredPod, setHoveredPod] = useState<PodDefinition | null>(null);

  useEffect(() => {
    if (forcedGroup) {
      setActiveGroup(forcedGroup);
      setSubCategory('All');
      setSearchQuery('');
      setIsMinimized(false);
    }
  }, [forcedGroup]);

  const placedCounts = useMemo(() => {
    return placedPods.reduce<Record<string, number>>((acc, curr) => {
      acc[curr.podId] = (acc[curr.podId] || 0) + 1;
      return acc;
    }, {});
  }, [placedPods]);

  const essentialPlacedCount = useMemo(() => {
    return POD_CATALOG.filter((p) => p.isEssential && (placedCounts[p.id] || 0) > 0).length;
  }, [placedCounts]);

  const activeGroupDef = useMemo(
    () => CATALOG_GROUPS.find((g) => g.id === activeGroup) || CATALOG_GROUPS[0],
    [activeGroup]
  );

  const filteredPods = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return POD_CATALOG.filter((pod) => {
      if (q) {
        return (
          pod.name.toLowerCase().includes(q) ||
          pod.description.toLowerCase().includes(q) ||
          pod.category.toLowerCase().includes(q)
        );
      }
      if (activeGroup === 'required') return Boolean(pod.isEssential);
      if (activeGroup === 'all') return true;
      if (subCategory !== 'All') return pod.category === subCategory;
      return activeGroupDef.categories.includes(pod.category);
    });
  }, [activeGroup, activeGroupDef, subCategory, searchQuery]);

  const formatCost = (val: number) => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    return `$${(val / 1e6).toFixed(0)}M`;
  };

  if (deleteMode && !selectedCatalogPod) {
    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto max-w-[94vw]">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#130C16]/95 border border-rose-500/45 shadow-[0_14px_34px_rgba(0,0,0,0.65)]">
          <div className="flex items-center gap-2.5 pr-3 border-r border-white/[0.1] min-w-0">
            <span className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-400/35 flex items-center justify-center shrink-0">
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            </span>
            <div className="text-left min-w-0">
              <div className="text-xs font-semibold text-rose-200 truncate">
                Delete Mode Active
              </div>
              <div className="text-[11px] text-[#B5AFCE] whitespace-nowrap">
                Click any placed module on Mars to remove it
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              audioManager.playClick();
              onExitDeleteMode?.();
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit Delete Mode</span>
          </button>
        </div>
      </div>
    );
  }

  if (selectedCatalogPod) {
    const theme = CATEGORY_COLORS[selectedCatalogPod.category];
    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto max-w-[94vw]">
        <div
          className={`flex items-center gap-2 sm:gap-3 px-4 py-2.5 rounded-xl bg-[#0B0914]/92 border shadow-[0_14px_34px_rgba(0,0,0,0.65)] ${
            highlightTutorial ? 'border-[#8B5CF6]' : 'border-[#C4B5FD]/[0.14]'
          }`}
        >
          <div className="flex items-center gap-2.5 pr-2 sm:pr-3 border-r border-white/[0.08] min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: theme?.hex || '#8B5CF6' }}
            />
            <div className="text-left min-w-0">
              <div className="text-xs font-semibold text-[#F4F3F8] truncate">
                {selectedCatalogPod.name}
              </div>
              <div className="text-[11px] text-[#9B94B8] tabular-nums whitespace-nowrap">
                Click grid tile to place · {placementRotation}°
              </div>
            </div>
          </div>

          <button
            data-tutorial-target="rotate-btn"
            onClick={() => {
              audioManager.playRotate();
              onRotateGhost();
            }}
            className={`px-3 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#8B5CF6] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              highlightTutorial ? 'ring-2 ring-violet-300/75' : ''
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Rotate 90°</span>
          </button>

          <button
            onClick={() => {
              audioManager.playClick();
              onSelectCatalogPod(null);
              setIsMinimized(false);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-[#171422] hover:bg-[#221D33] border border-white/[0.08] text-[#EAE6F7] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Grid2x2 className="w-3.5 h-3.5 text-[#A78BFA]" />
            <span className="hidden sm:inline">Modules</span>
          </button>

          <button
            onClick={() => {
              audioManager.playClick();
              onSelectCatalogPod(null);
            }}
            className="p-1.5 rounded-lg text-[#9B94B8] hover:text-white hover:bg-[#1A1726] transition-colors cursor-pointer shrink-0"
            title="Cancel placement"
            aria-label="Cancel placement"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <button
          data-tutorial-target="open-dock-btn"
          onClick={() => {
            audioManager.playClick();
            setIsMinimized(false);
          }}
          className="px-4 py-2.5 rounded-xl bg-[#0B0914]/92 hover:bg-[#161224] border border-[#C4B5FD]/[0.14] shadow-[0_12px_30px_rgba(0,0,0,0.55)] text-xs font-semibold text-[#F4F3F8] flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#A78BFA]" />
          <span>Open Module Dock</span>
          <span className="text-[11px] font-mono text-[#9B94B8] tabular-nums">
            ({essentialPlacedCount}/10 required)
          </span>
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label="Module Catalog"
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[min(94vw,880px)] pointer-events-auto"
    >
      <div
        className={`rounded-xl bg-[#0B0914]/92 border shadow-[0_16px_40px_rgba(0,0,0,0.68)] overflow-hidden flex flex-col transition-colors ${
          highlightTutorial ? 'border-[#8B5CF6]' : 'border-[#C4B5FD]/[0.12]'
        }`}
      >
        {/* Top Organized Domain Groups & Search */}
        <div className="px-3 py-2.5 border-b border-white/[0.07] flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0 flex-1">
            {CATALOG_GROUPS.map((group) => {
              const isActive = !searchQuery && activeGroup === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => {
                    audioManager.playClick();
                    setSearchQuery('');
                    setActiveGroup(group.id);
                    setSubCategory('All');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                    isActive
                      ? group.id === 'required'
                        ? 'bg-[#7C3AED] text-white'
                        : 'bg-[#221D33] text-white border border-white/[0.08]'
                      : 'text-[#9B94B8] hover:text-white hover:bg-[#171422]'
                  }`}
                >
                  {group.id === 'required'
                    ? `Required (${essentialPlacedCount}/10)`
                    : group.id === 'all'
                    ? `All (${POD_CATALOG.length})`
                    : group.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-44">
              <Search className="w-3.5 h-3.5 text-[#7D7699] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1 rounded-lg bg-[#171422] border border-white/[0.08] text-xs text-[#F4F3F8] placeholder-[#6E678A] focus:outline-none focus:border-[#8B5CF6]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E87AB] hover:text-white cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={() => {
                audioManager.playClick();
                setIsMinimized(true);
              }}
              className="p-1.5 rounded-lg text-[#9B94B8] hover:text-white hover:bg-[#1A1726] transition-colors cursor-pointer shrink-0"
              title="Minimize dock"
              aria-label="Minimize dock"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clean Sub-Category Filter Strip for Multi-Category Groups */}
        {!searchQuery && activeGroupDef.categories.length > 1 && (
          <div className="px-3 py-1.5 border-b border-white/[0.06] bg-[#13101D] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] uppercase tracking-wider text-[#6E678A] mr-1 shrink-0">
              Filter:
            </span>
            <button
              onClick={() => {
                audioManager.playClick();
                setSubCategory('All');
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors shrink-0 ${
                subCategory === 'All'
                  ? 'bg-[#221D33] text-white'
                  : 'text-[#8E87AB] hover:text-white'
              }`}
            >
              All {activeGroupDef.label}
            </button>
            {activeGroupDef.categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  audioManager.playClick();
                  setSubCategory(cat);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors shrink-0 ${
                  subCategory === cat
                    ? 'bg-[#221D33] text-white'
                    : 'text-[#8E87AB] hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Spacious Card Grid */}
        <div className="p-3 max-h-44 overflow-y-auto">
          {filteredPods.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#8E87AB]">
              No modules match "{searchQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {filteredPods.map((pod, idx) => {
                const theme = CATEGORY_COLORS[pod.category];
                const placedCount = placedCounts[pod.id] || 0;
                const metric = getPrimaryMetric(pod);

                return (
                  <button
                    key={pod.id}
                    data-tutorial-target={idx === 0 ? 'catalog-card' : undefined}
                    onClick={() => {
                      audioManager.playClick();
                      onSelectCatalogPod(pod);
                    }}
                    onMouseEnter={() => setHoveredPod(pod)}
                    onMouseLeave={() => setHoveredPod((prev) => (prev?.id === pod.id ? null : prev))}
                    className={`group p-2.5 rounded-lg bg-[#151121]/95 hover:bg-[#1D1830] border text-left transition-colors cursor-pointer flex flex-col justify-between gap-1.5 ${
                      highlightTutorial && idx === 0
                        ? 'border-[#8B5CF6]'
                        : 'border-[#C4B5FD]/[0.08] hover:border-[#C4B5FD]/[0.24]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: theme.hex }}
                        />
                        <span className="text-xs font-medium text-[#F4F3F8] truncate">
                          {pod.name}
                        </span>
                      </div>

                      {placedCount > 0 && (
                        <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-0.5 shrink-0 tabular-nums">
                          <Check className="w-3 h-3" />
                          <span>{placedCount}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                      <span className={metric.positive ? 'text-[#C4B5FD]' : 'text-[#8E87AB]'}>
                        {metric.label}
                      </span>
                      <span className="text-[10px] font-sans text-[#7D7699]">
                        {SHORT_CATEGORY_LABEL[pod.category]} · {formatCost(pod.cost)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Multi-Stat Contextual Footer Bar */}
        <div className="px-3.5 py-1.5 border-t border-white/[0.06] bg-[#0B0911] flex items-center justify-between gap-3 text-[11px] text-[#8E87AB]">
          {hoveredPod ? (
            <>
              <span className="truncate">{hoveredPod.description}</span>
              <span className="font-mono text-[#B5AFCE] shrink-0 tabular-nums hidden sm:inline">
                {(hoveredPod.mass / 1000).toFixed(1)}t ·{' '}
                {hoveredPod.powerKW <= 0
                  ? `+${Math.abs(hoveredPod.powerKW)}`
                  : `-${hoveredPod.powerKW}`}
                kW ·{' '}
                {hoveredPod.o2Rate < 0
                  ? `+${Math.abs(hoveredPod.o2Rate)}`
                  : hoveredPod.o2Rate === 0
                  ? '0'
                  : `-${hoveredPod.o2Rate}`}
                O₂
              </span>
            </>
          ) : (
            <>
              <span className="truncate pr-4">
                Select any module to place it on the Mars grid. Adjacent pods connect automatically.
              </span>
              <span className="font-mono text-[#6E678A] shrink-0 tabular-nums">
                {filteredPods.length} modules
              </span>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
