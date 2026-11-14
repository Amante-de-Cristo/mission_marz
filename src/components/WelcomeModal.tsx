import React, { useState } from 'react';
import {
  Rocket,
  Layers,
  Users,
  X,
  MapPin,
  BookOpen,
} from 'lucide-react';
import { MarsLandingSite, MissionConfig } from '../types';
import {
  DEFAULT_MARS_SITE,
  PRESET_MARS_SITES,
  formatMarsCoordinates,
} from '../utils/marsSites';
import { MarsGlobeSelector } from './MarsGlobeSelector';
import { audioManager } from '../utils/audioManager';

interface WelcomeModalProps {
  config: MissionConfig;
  onConfirm: (config: MissionConfig, mode: 'preset' | 'scratch' | 'tutorial' | 'apply') => void;
  onClose?: () => void;
  canClose?: boolean;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  config,
  onConfirm,
  onClose,
  canClose = false,
}) => {
  const [selectedSite, setSelectedSite] = useState<MarsLandingSite>(
    config.landingSite || DEFAULT_MARS_SITE
  );
  const [isInfiniteBudget, setIsInfiniteBudget] = useState(config.isInfiniteBudget ?? true);
  const [constructionBudget, setConstructionBudget] = useState(config.constructionBudget);
  const [launchBudget, setLaunchBudget] = useState(config.launchBudget);
  const [crewSize, setCrewSize] = useState(config.crewSize ?? 4);

  const buildUpdatedConfig = (): MissionConfig => ({
    ...config,
    isInfiniteBudget,
    constructionBudget: isInfiniteBudget ? 100000000000 : constructionBudget,
    launchBudget: isInfiniteBudget ? 50000000000 : launchBudget,
    crewSize,
    landingSite: selectedSite,
  });

  const handleAction = (mode: 'preset' | 'scratch' | 'tutorial' | 'apply') => {
    audioManager.playClick();
    onConfirm(buildUpdatedConfig(), mode);
  };

  const formatCurrencyBillions = (val: number) => {
    if (!Number.isFinite(val)) return 'Uncapped';
    return `$${(val / 1e9).toFixed(0)}B`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07060B]/88">
      <div className="w-full max-w-5xl rounded-xl bg-[#0B0914] border border-[#C4B5FD]/[0.14] shadow-[0_24px_60px_rgba(0,0,0,0.8)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 max-h-[92vh]">
        {/* Left: Interactive 3D Mars Landing Selector */}
        <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-[#080610]">
          <div className="relative h-72 sm:h-96 lg:h-auto lg:flex-1 min-h-[290px]">
            <MarsGlobeSelector
              selectedSite={selectedSite}
              onSelectSite={setSelectedSite}
            />
          </div>

          {/* Quick Landmark Strip */}
          <div className="px-4 py-3 border-t border-white/[0.08] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] text-[#8E87AB] pr-1.5 shrink-0">Landmarks</span>
            {PRESET_MARS_SITES.map((site) => {
              const active = selectedSite.id === site.id;
              return (
                <button
                  key={site.id}
                  onClick={() => {
                    audioManager.playClick();
                    setSelectedSite(site);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#7C3AED] text-white'
                      : 'text-[#9B94B8] hover:text-white hover:bg-[#171422]'
                  }`}
                >
                  {site.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Minimalist Mission & Site Configuration */}
        <div className="lg:col-span-5 p-6 flex flex-col justify-between overflow-y-auto text-left gap-5">
          <div className="space-y-5">
            {/* Minimal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/aistudio/image_238eb27b.png"
                  alt="Cosmic Cupcakes"
                  className="w-10 h-10 rounded-lg object-cover border border-white/[0.1] shrink-0"
                />
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-[#F4F3F8]">
                    mission-marz
                  </h2>
                  <p className="text-xs text-[#8E87AB]">
                    Select a landing site on 3D Mars
                  </p>
                </div>
              </div>

              {canClose && onClose && (
                <button
                  onClick={() => {
                    audioManager.playClick();
                    onClose();
                  }}
                  className="p-1.5 rounded-lg text-[#8E87AB] hover:text-white hover:bg-[#171426] transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Selected Landing Site Readout (Hairline-separated, zero cluttered cards) */}
            <div className="pt-4 border-t border-white/[0.08] space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-[#F4F3F8] min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{selectedSite.name}</span>
                </div>
                <span className="text-[11px] font-mono text-[#8E87AB] shrink-0 tabular-nums">
                  {formatMarsCoordinates(selectedSite.lat, selectedSite.lon)}
                </span>
              </div>

              <p className="text-xs text-[#9B94B8] leading-relaxed">
                {selectedSite.description}
              </p>

              <div className="grid grid-cols-4 gap-2 pt-1 text-[11px] tabular-nums">
                <div>
                  <div className="text-[#8E87AB]">Solar</div>
                  <div className="font-mono font-semibold text-[#F4F3F8]">
                    {Math.round(selectedSite.solarMultiplier * 100)}%
                  </div>
                </div>
                <div>
                  <div className="text-[#8E87AB]">Ice Bonus</div>
                  <div className="font-mono font-semibold text-cyan-400">
                    +{selectedSite.iceDepositBonus} L/d
                  </div>
                </div>
                <div>
                  <div className="text-[#8E87AB]">Avg Temp</div>
                  <div className="font-mono font-semibold text-[#F4F3F8]">
                    {selectedSite.avgTempC}°C
                  </div>
                </div>
                <div>
                  <div className="text-[#8E87AB]">Dust</div>
                  <div className="font-mono font-semibold text-[#F4F3F8]">
                    {selectedSite.dustRisk}
                  </div>
                </div>
              </div>
            </div>

            {/* Crew & Budget Controls */}
            <div className="pt-4 border-t border-white/[0.08] space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9B94B8] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#A78BFA]" />
                    <span>Crew Size</span>
                  </span>
                  <span className="font-mono font-semibold text-[#F4F3F8] tabular-nums">
                    {crewSize} Astronauts
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={7}
                  step={1}
                  value={crewSize}
                  onChange={(e) => {
                    setCrewSize(Number(e.target.value));
                    audioManager.playClick();
                  }}
                  className="w-full accent-[#7C3AED] cursor-pointer h-1.5 bg-[#171422] rounded-lg"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-[#F4F3F8]">Uncapped Budget</div>
                  <div className="text-[11px] text-[#8E87AB]">
                    Build freely without launch cost caps
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isInfiniteBudget}
                    onChange={(e) => {
                      setIsInfiniteBudget(e.target.checked);
                      audioManager.playClick();
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#1C1829] border border-white/[0.1] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#7C3AED]" />
                </label>
              </div>

              {!isInfiniteBudget && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#8E87AB]">Build Cap</span>
                      <span className="font-mono text-emerald-400 tabular-nums">
                        {formatCurrencyBillions(constructionBudget)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10000000000}
                      max={60000000000}
                      step={1000000000}
                      value={constructionBudget}
                      onChange={(e) => setConstructionBudget(Number(e.target.value))}
                      className="w-full accent-[#7C3AED] cursor-pointer h-1.5 bg-[#171422] rounded-lg"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#8E87AB]">Launch Cap</span>
                      <span className="font-mono text-[#C4B5FD] tabular-nums">
                        {formatCurrencyBillions(launchBudget)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5000000000}
                      max={40000000000}
                      step={1000000000}
                      value={launchBudget}
                      onChange={(e) => setLaunchBudget(Number(e.target.value))}
                      className="w-full accent-[#7C3AED] cursor-pointer h-1.5 bg-[#171422] rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Clean Primary Actions */}
          <div className="pt-4 border-t border-white/[0.08] space-y-2.5">
            {canClose ? (
              <>
                <button
                  onClick={() => handleAction('apply')}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Apply Landing Site & Settings</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAction('scratch')}
                    className="py-2 px-3 rounded-lg bg-[#171422] hover:bg-[#1E1A2D] border border-white/[0.08] text-[#D7D2EA] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Rocket className="w-3.5 h-3.5 text-[#A78BFA]" />
                    <span>New Empty Base</span>
                  </button>

                  <button
                    onClick={() => handleAction('tutorial')}
                    className="py-2 px-3 rounded-lg bg-[#171422] hover:bg-[#1E1A2D] border border-white/[0.08] text-[#D7D2EA] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#A78BFA]" />
                    <span>User Guide</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleAction('tutorial')}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span>Start User Guide</span>
                  </span>
                  <span className="text-[11px] font-medium text-violet-100/90 whitespace-nowrap">
                    Recommended for first-time players
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAction('preset')}
                    className="py-2.5 px-3 rounded-lg bg-[#171422] hover:bg-[#1E1A2D] border border-white/[0.1] text-[#F4F3F8] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#A78BFA]" />
                    <span>Preset Base</span>
                  </button>

                  <button
                    onClick={() => handleAction('scratch')}
                    className="py-2.5 px-3 rounded-lg bg-[#171422] hover:bg-[#1E1A2D] border border-white/[0.1] text-[#D7D2EA] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Rocket className="w-3.5 h-3.5 text-[#A78BFA]" />
                    <span>Empty Site</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
