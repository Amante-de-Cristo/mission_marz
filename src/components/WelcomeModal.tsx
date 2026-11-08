import React, { useState } from 'react';
import {
  Rocket,
  Shield,
  Sparkles,
  DollarSign,
  Clock,
  ArrowRight,
  ExternalLink,
  GraduationCap,
  Layers,
  Sliders,
  CheckCircle2,
  Users,
  Infinity as InfinityIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { MissionConfig } from '../types';
import { audioManager } from '../utils/audioManager';

interface WelcomeModalProps {
  config: MissionConfig;
  onConfirm: (config: MissionConfig, mode: 'preset' | 'scratch' | 'tutorial') => void;
  onClose?: () => void;
  canClose?: boolean;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  config,
  onConfirm,
  onClose,
  canClose = false,
}) => {
  const [isInfiniteBudget, setIsInfiniteBudget] = useState(config.isInfiniteBudget ?? true);
  const [constructionBudget, setConstructionBudget] = useState(config.constructionBudget);
  const [launchBudget, setLaunchBudget] = useState(config.launchBudget);
  const [costPerKg, setCostPerKg] = useState(config.costPerKg);
  const [crewSize, setCrewSize] = useState(config.crewSize ?? 4);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Dynamic calculations based on NASA metrics
  const totalBudget = isInfiniteBudget ? Infinity : constructionBudget + launchBudget;
  const payloadLiftCapacityKg = isInfiniteBudget ? 500000 : Math.floor(launchBudget / costPerKg);
  const transitTimeMonths = isInfiniteBudget
    ? '5.4'
    : Math.max(5.2, Math.min(9.4, 8.8 - (launchBudget / 30000000000) * 2.0)).toFixed(1);
  const synodicWindowMonths = 26; // Mars-Earth synodic orbit alignment window

  const handleSelectMode = (mode: 'preset' | 'scratch' | 'tutorial') => {
    audioManager.playClick();
    onConfirm(
      {
        ...config,
        isInfiniteBudget,
        constructionBudget: isInfiniteBudget ? 100000000000 : constructionBudget,
        launchBudget: isInfiniteBudget ? 50000000000 : launchBudget,
        costPerKg,
        crewSize,
      },
      mode
    );
  };

  const formatCurrencyBillions = (val: number) => {
    if (!Number.isFinite(val)) return '∞ Uncapped';
    return `$${(val / 1e9).toFixed(1)}B`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-fadeIn">
      <div className="w-full max-w-3xl rounded-3xl bg-[#100505f0] border border-[#ff552255] shadow-[0_0_60px_#ff552233] overflow-hidden flex flex-col max-h-[94vh]">
        {/* Futuristic Modal Header with Custom Logo */}
        <div className="p-5 sm:p-6 pb-4 border-b border-white/10 relative overflow-hidden bg-gradient-to-r from-[#240808] via-[#160505] to-[#0d0303]">
          {/* Ambient Glow Orbs */}
          <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-[#ff552233] blur-3xl pointer-events-none" />
          <div className="absolute right-40 -bottom-10 w-32 h-32 rounded-full bg-cyan-500/20 blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#ff552222] border border-[#ff552255]">
              <span className="w-2 h-2 rounded-full bg-[#ff5522] animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#ff7744] font-bold">
                NASA ECLSS Planetary Mission Command
              </span>
            </div>

            {canClose && onClose && (
              <button
                onClick={onClose}
                className="text-xs font-mono text-white/50 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                Close ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <img
              src="/assets/aistudio/logo_a715e6f9.png"
              alt="Markz Mission Mars Simulator"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-[#ff552288] shadow-[0_0_25px_#ff552255] flex-shrink-0"
            />
            <div>
              <h2 className="text-2xl sm:text-3xl font-mono font-black tracking-wider text-white uppercase flex items-center gap-2.5">
                <span>mission-marz</span>
                <span className="text-xs sm:text-sm font-normal text-white/50 tracking-normal font-sans">
                  // 3D Martian Base Builder & Simulator
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-white/70 mt-1 max-w-xl leading-relaxed">
                Establish an interconnected self-sustaining human outpost on Jezero Crater. Configure mission crew size, authorize planetary budget allocations, and run simulated 30-day endurance trials.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 scrollbar-thin scrollbar-thumb-white/10 text-left">
          {/* Quick Stats Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-950/40 via-black/40 to-cyan-950/30 border border-[#ff552233] grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] font-mono text-white/50 uppercase">Budget Cap</div>
              <div className="text-base font-mono font-black text-white mt-0.5">
                {isInfiniteBudget ? '∞ Uncapped' : formatCurrencyBillions(totalBudget)}
              </div>
            </div>

            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] font-mono text-white/50 uppercase">Mission Crew</div>
              <div className="text-base font-mono font-black text-amber-400 mt-0.5 flex items-center justify-center gap-1">
                <Users className="w-4 h-4" />
                <span>{crewSize} Astronauts</span>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] font-mono text-white/50 uppercase">Transit Duration</div>
              <div className="text-base font-mono font-black text-orange-400 mt-0.5">
                {transitTimeMonths} Months
              </div>
            </div>

            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] font-mono text-white/50 uppercase">Synodic Window</div>
              <div className="text-base font-mono font-black text-purple-300 mt-0.5">
                {synodicWindowMonths} Months
              </div>
            </div>
          </div>

          {/* 3 Main Home Page Choices */}
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-white/80 mb-2.5 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#ff5522]" />
              <span>Choose Deployment Workflow:</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Card 1: Tutorial */}
              <button
                onClick={() => handleSelectMode('tutorial')}
                className="group p-4 rounded-2xl bg-gradient-to-b from-purple-950/30 to-black/50 hover:from-purple-900/40 hover:to-purple-950/40 border border-purple-500/40 hover:border-purple-400 text-left transition-all shadow-lg hover:shadow-[0_0_25px_#a855f733] cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                      <h3 className="text-xs sm:text-sm font-mono font-bold text-white">
                        Tutorial
                      </h3>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Guided
                    </span>
                  </div>
                  <p className="text-[11px] text-white/70 leading-relaxed mb-3">
                    Interactive guided walkthrough demonstrating canvas navigation, 11 categories, auto-tunnels, and how to certify a valid colony.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-purple-400 font-bold group-hover:translate-x-1 transition-transform">
                  <span>Start Tutorial</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* Card 2: Preset Mars Base */}
              <button
                onClick={() => handleSelectMode('preset')}
                className="group p-4 rounded-2xl bg-gradient-to-b from-orange-950/40 to-black/50 hover:from-orange-900/50 hover:to-orange-950/40 border border-orange-500/50 hover:border-[#ff5522] text-left transition-all shadow-lg hover:shadow-[0_0_25px_#ff552233] cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
                      <h3 className="text-xs sm:text-sm font-mono font-bold text-white">
                        Preset Base
                      </h3>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                      Certified
                    </span>
                  </div>
                  <p className="text-[11px] text-white/70 leading-relaxed mb-3">
                    Pre-assembled operational base with all 10 essential modules, rover garage, and interconnected power grid ready for immediate simulation.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-orange-400 font-bold group-hover:translate-x-1 transition-transform">
                  <span>Deploy Preset Base</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* Card 3: From Scratch */}
              <button
                onClick={() => handleSelectMode('scratch')}
                className="group p-4 rounded-2xl bg-gradient-to-b from-cyan-950/20 to-black/50 hover:from-cyan-900/30 hover:to-cyan-950/30 border border-white/10 hover:border-cyan-400/50 text-left transition-all shadow-lg hover:shadow-[0_0_25px_#06b6d422] cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Rocket className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                      <h3 className="text-xs sm:text-sm font-mono font-bold text-white">
                        From Scratch
                      </h3>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                      Expanded 24x24
                    </span>
                  </div>
                  <p className="text-[11px] text-white/70 leading-relaxed mb-3">
                    Clean slate on the expanded Martian regolith. Architect custom life support networks, nuclear reactors, and rover garages from zero.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 font-bold group-hover:translate-x-1 transition-transform">
                  <span>Start from Scratch</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>
          </div>

          {/* Advanced Settings Accordion */}
          <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
            <button
              onClick={() => {
                setShowAdvancedSettings(!showAdvancedSettings);
                audioManager.playClick();
              }}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#ff5522]" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Advanced Settings & Mission Parameters
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#ff552222] text-[#ff7744]">
                  {isInfiniteBudget ? 'Budget: Infinite (Default)' : 'Budget: Custom'} • Crew: {crewSize}
                </span>
              </div>
              {showAdvancedSettings ? (
                <ChevronUp className="w-4 h-4 text-white/60" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white/60" />
              )}
            </button>

            {showAdvancedSettings && (
              <div className="p-4 pt-0 space-y-4 border-t border-white/5">
                {/* 1. Infinite vs Manual Budget Toggle */}
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                        <InfinityIcon className="w-4 h-4 text-[#ff7744]" />
                        <span>Infinite Budget Mode (NASA Uncapped Allocation)</span>
                      </div>
                      <p className="text-[11px] text-white/60 mt-0.5">
                        Default mode: Expenditure sliders maxed out at ∞. Pod placement has no financial limit.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={isInfiniteBudget}
                        onChange={(e) => {
                          setIsInfiniteBudget(e.target.checked);
                          audioManager.playClick();
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff5522]"></div>
                    </label>
                  </div>

                  {/* Manual Budget Sliders (Visible only when Infinite is turned OFF) */}
                  {!isInfiniteBudget && (
                    <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Construction Budget */}
                      <div className="p-3 rounded-lg bg-black/60 border border-white/10">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-mono text-white/80">
                            Base Construction Budget ($)
                          </label>
                          <span className="text-xs font-mono font-bold text-emerald-400">
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
                          className="w-full accent-emerald-400 cursor-pointer h-2 bg-white/10 rounded-lg"
                        />
                        <div className="flex justify-between text-[10px] font-mono text-white/40 mt-1">
                          <span>$10B</span>
                          <span>$60B</span>
                        </div>
                      </div>

                      {/* Flight / Launch Budget */}
                      <div className="p-3 rounded-lg bg-black/60 border border-white/10">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-mono text-white/80">
                            Flight / Rocket Launch Budget ($)
                          </label>
                          <span className="text-xs font-mono font-bold text-cyan-400">
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
                          className="w-full accent-cyan-400 cursor-pointer h-2 bg-white/10 rounded-lg"
                        />
                        <div className="flex justify-between text-[10px] font-mono text-white/40 mt-1">
                          <span>$5B</span>
                          <span>$40B</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Mission Crew Size Selector (Min 1, Default 4, Max 7) */}
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-amber-400" />
                        <span>Mission Crew Size (Min: 1, Default: 4, Max: 7)</span>
                      </div>
                      <p className="text-[11px] text-white/60 mt-0.5">
                        Crew members require oxygen (0.84 kg/sol/person), water (3.5 L/sol), food (1.5 kg/sol), and berthing bunks.
                      </p>
                    </div>
                    <span className="text-sm font-mono font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
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
                    className="w-full accent-amber-400 cursor-pointer h-2 bg-white/10 rounded-lg"
                  />

                  {/* Astronaut Avatars visualization */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: 7 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-all ${
                            i < crewSize
                              ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-black shadow-[0_0_8px_#f59e0b88] scale-105'
                              : 'bg-white/10 text-white/30'
                          }`}
                        >
                          {i + 1}
                        </div>
                      ))}
                    </div>
                    <span className="text-[10px] font-mono text-white/40">
                      Daily O2 Need: {(crewSize * 0.84).toFixed(2)} kg/sol
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mandatory Splash Footer */}
        <div className="p-4 border-t border-white/10 bg-black/80 flex flex-col sm:flex-row items-center justify-between text-xs text-white/50 font-mono gap-2">
          <div className="flex items-center gap-1.5">
            <span>Made by</span>
            <a
              href="https://github.com/Amante-de-Cristo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ff7744] hover:text-[#ff5522] hover:underline flex items-center gap-1 font-bold transition-colors"
            >
              <span>GIFTLIN</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="text-[11px] text-white/40">
            Powered by Three.js WebGL & NASA ECLSS Data
          </div>
        </div>
      </div>
    </div>
  );
};
