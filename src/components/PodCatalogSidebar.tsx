import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Apple,
  Wind,
  HeartPulse,
  Microscope,
  Zap,
  Wrench,
  Compass,
  Recycle,
  Users,
  Shield,
  Search,
  Check,
  Plus,
} from 'lucide-react';
import { PodCategory, PodDefinition, PlacedPod } from '../types';
import { CATEGORIES, POD_CATALOG, CATEGORY_COLORS } from '../utils/podCatalog';
import { audioManager } from '../utils/audioManager';

interface PodCatalogSidebarProps {
  selectedCatalogPod: PodDefinition | null;
  onSelectCatalogPod: (pod: PodDefinition | null) => void;
  placedPods: PlacedPod[];
}

const CATEGORY_ICONS: Record<PodCategory, React.ComponentType<{ className?: string }>> = {
  Essential: ShieldAlert,
  'Food & Agriculture': Apple,
  'Life Support': Wind,
  'Medical & Health': HeartPulse,
  'Science & Research': Microscope,
  'Energy & Electricity': Zap,
  'Engineering & Manufacturing': Wrench,
  'Transportation & Exploration': Compass,
  'Waste & Recycling': Recycle,
  'Recreation & Community': Users,
  'Security & Emergency': Shield,
};

export const PodCatalogSidebar: React.FC<PodCatalogSidebarProps> = ({
  selectedCatalogPod,
  onSelectCatalogPod,
  placedPods,
}) => {
  const [openCategory, setOpenCategory] = useState<PodCategory | null>('Essential');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const placedCounts = placedPods.reduce<Record<string, number>>((acc, curr) => {
    acc[curr.podId] = (acc[curr.podId] || 0) + 1;
    return acc;
  }, {});

  const filteredPods = POD_CATALOG.filter((pod) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      pod.name.toLowerCase().includes(query) ||
      pod.description.toLowerCase().includes(query) ||
      pod.category.toLowerCase().includes(query) ||
      pod.nasaTechSpec.toLowerCase().includes(query)
    );
  });

  const toggleCategory = (cat: PodCategory) => {
    setOpenCategory(openCategory === cat ? null : cat);
    audioManager.playClick();
  };

  const formatCost = (val: number) => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    return `$${(val / 1e6).toFixed(0)}M`;
  };

  return (
    <aside
      className={`absolute left-3 sm:left-4 top-16 bottom-3 z-20 flex flex-col transition-all duration-300 pointer-events-auto ${
        isCollapsed ? 'w-12' : 'w-72 sm:w-80 md:w-96'
      }`}
    >
      <div className="flex-1 flex flex-col rounded-2xl bg-[#100505e6] border border-[#ff552233] backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Sidebar Header */}
        <div className="p-3 border-b border-white/10 flex items-center justify-between bg-black/40">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Pod Catalog (11 Categories)
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                {POD_CATALOG.length}
              </span>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded text-white/50 hover:text-white transition-colors"
            title={isCollapsed ? 'Expand Catalog' : 'Collapse Catalog'}
            aria-label={isCollapsed ? 'Expand Catalog' : 'Collapse Catalog'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Collapsed Icon Mode */}
        {isCollapsed ? (
          <div className="flex-1 py-3 flex flex-col items-center gap-2.5 overflow-y-auto scrollbar-none">
            {CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat];
              const theme = CATEGORY_COLORS[cat];
              const isSelected = openCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setIsCollapsed(false);
                    setOpenCategory(cat);
                  }}
                  className={`p-2 rounded-xl transition-all ${
                    isSelected
                      ? `${theme.bg} ${theme.text} ${theme.border} border shadow-lg`
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                  title={cat}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        ) : (
          <>
            {/* Search Filter Bar */}
            <div className="p-2.5 border-b border-white/5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search pods, specs, tech..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#ff5522] font-mono"
                />
              </div>
            </div>

            {/* Currently Active Selection Banner */}
            {selectedCatalogPod && (
              <div className="mx-2.5 mt-2 p-2 rounded-xl bg-[#ff552222] border border-[#ff552288] flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse"
                    style={{ backgroundColor: selectedCatalogPod.colorAccent }}
                  />
                  <div className="truncate">
                    <div className="text-[11px] font-mono font-bold text-white truncate">
                      {selectedCatalogPod.name}
                    </div>
                    <div className="text-[9px] text-[#ff7744] font-mono truncate">
                      Click surface to deploy • Use Rotate button
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onSelectCatalogPod(null)}
                  className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-mono text-white/90 flex-shrink-0"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Accordion Categories List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
              {CATEGORIES.map((category) => {
                const Icon = CATEGORY_ICONS[category];
                const theme = CATEGORY_COLORS[category];
                const podsInCat = filteredPods.filter((p) => p.category === category);
                if (searchQuery && podsInCat.length === 0) return null;

                const isOpen = openCategory === category || Boolean(searchQuery);

                return (
                  <div
                    key={category}
                    className={`rounded-xl border transition-all overflow-hidden ${
                      isOpen
                        ? `${theme.border} bg-gradient-to-r ${theme.gradient} to-black/60`
                        : 'border-white/5 bg-black/20 hover:border-white/15'
                    }`}
                  >
                    {/* Category Header Button */}
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full px-3 py-2 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: theme.hex }}
                        />
                        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${theme.text}`} />
                        <span className="text-xs font-mono font-bold tracking-wide text-white truncate">
                          {category}
                        </span>
                        {category === 'Essential' && (
                          <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
                            Required
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-white/40 flex-shrink-0">
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40">
                          {podsInCat.length}
                        </span>
                        {isOpen ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </button>

                    {/* Category Pods List */}
                    {isOpen && (
                      <div className="p-2 space-y-2 border-t border-white/5 bg-black/60">
                        {podsInCat.map((pod) => {
                          const isSelected = selectedCatalogPod?.id === pod.id;
                          const placedCount = placedCounts[pod.id] || 0;

                          return (
                            <div
                              key={pod.id}
                              className={`p-2.5 rounded-xl border transition-all text-left ${
                                isSelected
                                  ? 'bg-[#ff552222] border-[#ff5522] shadow-[0_0_15px_#ff552233]'
                                  : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/[0.08]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: pod.colorAccent }}
                                  />
                                  <h4 className="text-xs font-mono font-bold text-white truncate">
                                    {pod.name}
                                  </h4>
                                </div>
                                {placedCount > 0 && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-0.5 flex-shrink-0">
                                    <Check className="w-2.5 h-2.5" />
                                    <span>{placedCount}</span>
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-white/60 leading-snug mb-2 line-clamp-2">
                                {pod.description}
                              </p>

                              {/* NASA Specs Strip */}
                              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono bg-black/50 p-1.5 rounded-lg mb-2 text-white/70">
                                <div>
                                  <span className="text-white/40">Cost: </span>
                                  <span className="text-emerald-400 font-bold">
                                    {formatCost(pod.cost)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-white/40">Mass: </span>
                                  <span>{(pod.mass / 1000).toFixed(1)}t</span>
                                </div>
                                <div>
                                  <span className="text-white/40">Power: </span>
                                  <span
                                    className={pod.powerKW <= 0 ? 'text-amber-400 font-bold' : ''}
                                  >
                                    {pod.powerKW <= 0
                                      ? `+${Math.abs(pod.powerKW)}`
                                      : `-${pod.powerKW}`}{' '}
                                    kW
                                  </span>
                                </div>
                                <div>
                                  <span className="text-white/40">Water/O2: </span>
                                  <span>
                                    {pod.o2Rate < 0
                                      ? `+${Math.abs(pod.o2Rate)} O2`
                                      : `${pod.waterRate} W`}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className="text-[9px] font-mono text-white/40 truncate"
                                  title={pod.nasaTechSpec}
                                >
                                  {pod.nasaTechSpec}
                                </span>
                                <button
                                  onClick={() => {
                                    audioManager.playClick();
                                    onSelectCatalogPod(isSelected ? null : pod);
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer flex-shrink-0 ${
                                    isSelected
                                      ? 'bg-rose-500 text-white'
                                      : 'bg-[#ff5522] hover:bg-[#ff6633] text-white shadow-md'
                                  }`}
                                >
                                  {isSelected ? (
                                    <span>Cancel</span>
                                  ) : (
                                    <>
                                      <Plus className="w-3 h-3" />
                                      <span>Select</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
