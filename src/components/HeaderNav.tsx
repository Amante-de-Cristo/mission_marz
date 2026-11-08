import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Music,
  SkipBack,
  SkipForward,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  RotateCw,
  Users,
} from 'lucide-react';
import { ResourceTelemetry, PlacedPod, PodDefinition } from '../types';
import { audioManager } from '../utils/audioManager';

interface HeaderNavProps {
  telemetry: ResourceTelemetry;
  canLaunch: boolean;
  missingEssentialCount: number;
  missingPodNames: string[];
  isSimulating: boolean;
  onStartSimulation: () => void;
  onOpenTutorial: () => void;
  onOpenConfig: () => void;
  onLoadPreset: () => void;
  onClearBase: () => void;
  selectedCatalogPod?: PodDefinition | null;
  onRotateGhost?: () => void;
  selectedPlacedPod?: PlacedPod | null;
  onRotatePlacedPod?: (instanceId: string) => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  telemetry,
  canLaunch,
  missingEssentialCount,
  missingPodNames,
  isSimulating,
  onStartSimulation,
  onOpenTutorial,
  onOpenConfig,
  onLoadPreset,
  onClearBase,
  selectedCatalogPod,
  onRotateGhost,
  selectedPlacedPod,
  onRotatePlacedPod,
}) => {
  const [sfxMuted, setSfxMuted] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const [musicVol, setMusicVol] = useState(0.4);
  const [showMusicSlider, setShowMusicSlider] = useState(false);
  const [showMissingTooltip, setShowMissingTooltip] = useState(false);
  const [currentTrackTitle, setCurrentTrackTitle] = useState('Dust & Solitude');

  // Sync music status
  useEffect(() => {
    const status = audioManager.getMusicStatus();
    setMusicMuted(!status.isPlaying);
    setCurrentTrackTitle(status.currentTrack);
  }, []);

  const handleToggleSfx = () => {
    const isUnmuted = audioManager.toggleSfx();
    setSfxMuted(!isUnmuted);
    if (isUnmuted) audioManager.playClick();
  };

  const handleToggleMusic = () => {
    const isPlaying = audioManager.toggleMusic();
    setMusicMuted(!isPlaying);
    const status = audioManager.getMusicStatus();
    setCurrentTrackTitle(status.currentTrack);
    audioManager.playClick();
  };

  const handlePrevTrack = () => {
    audioManager.prevTrack();
    const status = audioManager.getMusicStatus();
    setCurrentTrackTitle(status.currentTrack);
    setMusicMuted(false);
    audioManager.playClick();
  };

  const handleNextTrack = () => {
    audioManager.nextTrack();
    const status = audioManager.getMusicStatus();
    setCurrentTrackTitle(status.currentTrack);
    setMusicMuted(false);
    audioManager.playClick();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setMusicVol(v);
    audioManager.setMusicVolume(v);
  };

  const formatCurrency = (val: number) => {
    if (Math.abs(val) >= 1e9) {
      return `$${(val / 1e9).toFixed(2)}B`;
    }
    if (Math.abs(val) >= 1e6) {
      return `$${(val / 1e6).toFixed(1)}M`;
    }
    return `$${val.toLocaleString()}`;
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-30 h-14 flex items-center justify-between px-3 sm:px-4 bg-[#100505cc] border-b border-[#ff552233] backdrop-blur-md select-none">
      {/* Brand & Custom Logo */}
      <div className="flex items-center gap-2.5">
        <img
          src="/assets/aistudio/logo_a715e6f9.png"
          alt="Markz Mission Mars Simulator"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-[#ff552288] shadow-[0_0_15px_#ff552266] flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
          onClick={onOpenConfig}
          title="Open Mission Parameters"
        />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-xs sm:text-sm md:text-base font-bold tracking-wider text-white uppercase">
              mission-marz
            </h1>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#ff552222] text-[#ff7744] border border-[#ff552244]">
              v2.5
            </span>
          </div>
          <p className="text-[9px] sm:text-[10px] font-mono text-white/50 hidden md:block">
            NASA Planetary Colony Architecture & 30-Day Life Support Simulation
          </p>
        </div>
      </div>

      {/* Center Mission Financial & Power Readout */}
      <div className="hidden xl:flex items-center gap-4 xl:gap-6 px-3.5 py-1.5 rounded-xl bg-black/40 border border-white/10 flex-shrink-0">
        <div>
          <div className="text-[9px] font-mono text-white/50 uppercase">
            {telemetry.isInfiniteBudget ? 'Total Base Spend ($)' : 'Construction Budget ($)'}
          </div>
          <div
            className={`text-xs font-mono font-bold ${
              telemetry.isInfiniteBudget || telemetry.budgetRemainingUSD >= 0
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            {telemetry.isInfiniteBudget ? (
              <span>
                {formatCurrency(telemetry.totalBaseSpendUSD)}{' '}
                <span className="text-[10px] text-white/40 font-normal">(∞ Uncapped)</span>
              </span>
            ) : (
              <span>
                {formatCurrency(telemetry.budgetRemainingUSD)}{' '}
                <span className="text-[10px] text-white/40 font-normal">
                  / {formatCurrency(telemetry.totalCostUSD + telemetry.budgetRemainingUSD)}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="w-px h-6 bg-white/10" />

        <div>
          <div className="text-[9px] font-mono text-white/50 uppercase">Rocket Lift Mass</div>
          <div
            className={`text-xs font-mono font-bold ${
              telemetry.isInfiniteBudget || telemetry.launchBudgetRemainingUSD >= 0
                ? 'text-cyan-400'
                : 'text-amber-400'
            }`}
          >
            {(telemetry.totalMassKg / 1000).toFixed(1)}t{' '}
            <span className="text-[10px] text-white/40 font-normal">
              {telemetry.isInfiniteBudget ? '(Uncapped Lift)' : `/ ${(telemetry.launchCapacityKg / 1000).toFixed(1)}t cap`}
            </span>
          </div>
        </div>

        <div className="w-px h-6 bg-white/10" />

        <div>
          <div className="text-[9px] font-mono text-white/50 uppercase">Power Balance</div>
          <div
            className={`text-xs font-mono font-bold ${
              telemetry.netPowerKW >= 0 ? 'text-yellow-400' : 'text-rose-400'
            }`}
          >
            {telemetry.netPowerKW >= 0 ? `+${telemetry.netPowerKW}` : telemetry.netPowerKW} kW
          </div>
        </div>

        <div className="w-px h-6 bg-white/10" />

        <div>
          <div className="text-[9px] font-mono text-white/50 uppercase">Crew Capacity</div>
          <div
            className={`text-xs font-mono font-bold flex items-center gap-1 ${
              telemetry.crewCapacity >= (telemetry.foodDemandKg > 0 ? 4 : 1)
                ? 'text-white'
                : 'text-amber-400'
            }`}
          >
            <Users className="w-3 h-3 text-amber-400" />
            <span>{telemetry.crewCapacity} Bunks</span>
          </div>
        </div>
      </div>

      {/* Action Controls, Rotation & Audio */}
      <div className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2">
        {/* Dedicated On-Screen Rotation Button for Pod Placement or Selected Pod */}
        {(selectedCatalogPod || selectedPlacedPod) && (
          <button
            onClick={() => {
              if (selectedCatalogPod && onRotateGhost) {
                onRotateGhost();
              } else if (selectedPlacedPod && onRotatePlacedPod) {
                onRotatePlacedPod(selectedPlacedPod.instanceId);
              }
              audioManager.playRotate();
            }}
            className="px-2.5 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/50 text-xs font-mono font-bold flex items-center gap-1.5 shadow-md hover:scale-105 transition-all cursor-pointer"
            title="Rotate pod 90 degrees"
            aria-label="Rotate pod 90 degrees"
          >
            <RotateCw className="w-3.5 h-3.5 text-orange-400 animate-spin-slow" />
            <span>Rotate 90°</span>
          </button>
        )}

        {/* Multi-Track Background Music & SFX Playlist Controls */}
        <div className="relative flex items-center rounded-xl bg-white/5 border border-white/10 p-0.5 sm:p-1">
          <button
            onClick={handleToggleSfx}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              sfxMuted ? 'text-white/30 hover:text-white/60' : 'text-[#ff7744] hover:text-white'
            }`}
            title={sfxMuted ? 'Unmute SFX' : 'Mute SFX'}
            aria-label="Toggle Sound Effects"
          >
            {sfxMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handlePrevTrack}
            className="p-1.5 rounded-lg text-xs text-white/50 hover:text-white transition-colors"
            title="Previous Music Track"
            aria-label="Previous Music Track"
          >
            <SkipBack className="w-3 h-3" />
          </button>

          <button
            onClick={handleToggleMusic}
            className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 ${
              musicMuted ? 'text-white/30 hover:text-white/60' : 'text-cyan-400 hover:text-white'
            }`}
            title={musicMuted ? 'Play Music' : 'Mute Music'}
            aria-label="Toggle Background Music"
          >
            <Music className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleNextTrack}
            className="p-1.5 rounded-lg text-xs text-white/50 hover:text-white transition-colors"
            title="Next Music Track"
            aria-label="Next Music Track"
          >
            <SkipForward className="w-3 h-3" />
          </button>

          {/* Current Track Label (hidden on small mobile) */}
          <span
            className="text-[9px] font-mono text-cyan-300/80 max-w-20 truncate px-1 cursor-pointer hidden xl:inline"
            title={`Now Playing: ${currentTrackTitle}`}
            onClick={() => setShowMusicSlider(!showMusicSlider)}
          >
            {currentTrackTitle}
          </span>

          <button
            onClick={() => setShowMusicSlider(!showMusicSlider)}
            className="p-1.5 rounded-lg text-xs text-white/40 hover:text-white/80 transition-colors"
            title="Music Volume"
            aria-label="Open Music Volume Slider"
          >
            <Sliders className="w-3 h-3" />
          </button>

          {showMusicSlider && (
            <div className="absolute right-0 top-full mt-2 p-2.5 rounded-xl bg-[#140808ee] border border-white/20 shadow-2xl z-50 flex flex-col gap-2 min-w-44 text-left backdrop-blur-xl">
              <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300">
                <span>♪ {currentTrackTitle}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-white/60">Vol</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={musicVol}
                  onChange={handleVolumeChange}
                  className="w-28 accent-[#ff5522] cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Setup Config Modal Trigger */}
        <button
          onClick={() => {
            audioManager.playClick();
            onOpenConfig();
          }}
          className="px-2 sm:px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Mission Parameters"
        >
          <Sliders className="w-3.5 h-3.5 text-[#ff7744]" />
          <span className="hidden sm:inline">Settings</span>
        </button>

        {/* Preset Base Quick Load */}
        <button
          onClick={() => {
            audioManager.playClick();
            onLoadPreset();
          }}
          className="px-2 sm:px-2.5 py-1.5 rounded-lg bg-orange-950/40 hover:bg-orange-900/50 text-orange-200 border border-orange-500/30 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Load Operational Preset Mars Base"
        >
          <Sparkles className="w-3.5 h-3.5 text-orange-400" />
          <span className="hidden md:inline">Preset Base</span>
        </button>

        {/* Clear Base */}
        <button
          onClick={() => {
            audioManager.playClick();
            onClearBase();
          }}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-950/50 text-white/50 hover:text-rose-300 border border-white/10 transition-colors cursor-pointer"
          title="Clear / Reset Grid"
          aria-label="Clear all placed pods"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Tutorial */}
        <button
          onClick={() => {
            audioManager.playClick();
            onOpenTutorial();
          }}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-colors cursor-pointer"
          title="Interactive Tutorial"
          aria-label="Open Tutorial"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Mandatory 30-Day Simulation Launch Button */}
        <div className="relative">
          <button
            onClick={() => {
              if (canLaunch && !isSimulating) {
                audioManager.playClick();
                onStartSimulation();
              } else if (!canLaunch) {
                audioManager.playError();
                setShowMissingTooltip(true);
              }
            }}
            onMouseEnter={() => !canLaunch && setShowMissingTooltip(true)}
            onMouseLeave={() => setShowMissingTooltip(false)}
            disabled={isSimulating}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-md ${
              canLaunch
                ? 'bg-gradient-to-r from-[#ff5522] to-[#e11d48] text-white hover:brightness-110 shadow-[0_0_20px_#ff552255] cursor-pointer'
                : 'bg-white/5 text-white/40 border border-white/10 cursor-not-allowed'
            }`}
          >
            {isSimulating ? (
              <>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Simulating...</span>
              </>
            ) : canLaunch ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start 30-Day Simulation</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Prerequisites: {10 - missingEssentialCount}/10</span>
              </>
            )}
          </button>

          {/* Missing Essential Pods Tooltip */}
          {showMissingTooltip && !canLaunch && (
            <div className="absolute right-0 top-full mt-2 w-72 p-3 rounded-xl bg-[#140505ee] border border-red-500/40 backdrop-blur-md shadow-2xl z-50 text-left">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-red-400 mb-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Launch Gate Blocked</span>
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed mb-2">
                Colonization safety requires all 10 Essential Pods to be placed before simulation can launch.
              </p>
              <div className="text-[10px] font-mono text-white/50 mb-1 uppercase tracking-wider">
                Missing ({missingEssentialCount}):
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {missingPodNames.map((name) => (
                  <div key={name} className="flex items-center gap-1.5 text-[11px] font-mono text-amber-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
