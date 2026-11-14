import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Music,
  SkipBack,
  SkipForward,
  HelpCircle,
  Play,
  RotateCcw,
  Layers,
  AlertCircle,
  Sliders,
  Menu,
  Plus,
  Radar,
  ChevronDown,
  Activity,
  Rocket,
  Home,
  Trash2,
} from 'lucide-react';
import {
  ResourceTelemetry,
  AdvisorWarning,
  PlacedPod,
  PodDefinition,
  CameraState,
  RoverState,
} from '../types';
import { audioManager } from '../utils/audioManager';
import { getMissingEssentialPods } from '../utils/marsSimulation';
import { POD_MAP } from '../utils/podCatalog';
import { TelemetryDrawer } from './TelemetryDrawer';
import { MinimapRadar } from './MinimapRadar';

export type HeaderMenuId = 'none' | 'telemetry' | 'radar' | 'audio' | 'actions' | 'missing';
export type TutorialHighlightTarget = 'telemetry' | 'radar' | 'audio' | 'actions' | 'simulate' | null;

interface HeaderNavProps {
  telemetry: ResourceTelemetry;
  warnings: AdvisorWarning[];
  placedPods: PlacedPod[];
  cameraState: CameraState;
  rovers: RoverState[];
  selectedPlacedPod: PlacedPod | null;
  canLaunch: boolean;
  missingEssentialCount: number;
  isSimulating: boolean;
  onStartSimulation: () => void;
  onOpenTutorial: () => void;
  onOpenConfig: () => void;
  onGoHome: () => void;
  onLoadPreset: () => void;
  onClearBase: () => void;
  onSelectCatalogPod: (pod: PodDefinition | null) => void;
  onMinimapClick: (gridX: number, gridZ: number) => void;
  onWatchCutscene?: () => void;
  deleteMode?: boolean;
  onToggleDeleteMode?: () => void;
  controlledMenu?: HeaderMenuId;
  onControlledMenuChange?: (menu: HeaderMenuId) => void;
  tutorialHighlight?: TutorialHighlightTarget;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  telemetry,
  warnings,
  placedPods,
  cameraState,
  rovers,
  selectedPlacedPod,
  canLaunch,
  missingEssentialCount,
  isSimulating,
  onStartSimulation,
  onOpenTutorial,
  onOpenConfig,
  onGoHome,
  onLoadPreset,
  onClearBase,
  onSelectCatalogPod,
  onMinimapClick,
  onWatchCutscene,
  deleteMode = false,
  onToggleDeleteMode,
  controlledMenu,
  onControlledMenuChange,
  tutorialHighlight = null,
}) => {
  const [sfxMuted, setSfxMuted] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const [musicVol, setMusicVol] = useState(0.4);
  const [currentTrackTitle, setCurrentTrackTitle] = useState('Dust & Solitude');

  const [internalMenu, setInternalMenu] = useState<HeaderMenuId>('none');
  const openMenu = controlledMenu !== undefined ? controlledMenu : internalMenu;
  const setOpenMenu = (menu: HeaderMenuId) => {
    setInternalMenu(menu);
    onControlledMenuChange?.(menu);
  };

  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const status = audioManager.getMusicStatus();
    setMusicMuted(!status.isPlaying);
    setCurrentTrackTitle(status.currentTrack);
  }, []);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenMenu('none');
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [onControlledMenuChange]);

  const missingIds = getMissingEssentialPods(placedPods);
  const hasCritical = warnings.some((w) => w.type === 'critical');

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
    if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
    return `$${val.toLocaleString()}`;
  };

  return (
    <header
      ref={headerRef}
      className="absolute top-3.5 left-4 right-4 z-30 pointer-events-none flex items-center justify-between gap-3 select-none"
    >
      {/* Top-Left Brand & Home Control */}
      <div className="pointer-events-auto flex items-center gap-2 p-1.5 pr-3.5 h-11 rounded-xl bg-[#0B0914]/92 border border-[#C4B5FD]/[0.12] shadow-[0_12px_32px_rgba(0,0,0,0.55)] shrink-0">
        {!isSimulating && (
          <button
            onClick={() => {
              audioManager.playClick();
              setOpenMenu('none');
              onGoHome();
            }}
            className="h-8 px-2.5 rounded-lg bg-[#161224] hover:bg-[#221C38] border border-[#C4B5FD]/[0.1] text-[#EFEAFD] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Return to Home & Landing Site Setup"
            aria-label="Home"
          >
            <Home className="w-3.5 h-3.5 text-[#A78BFA]" />
            <span className="hidden sm:inline">Home</span>
          </button>
        )}

        <div className="flex items-center gap-2 pl-0.5">
          <img
            src="/assets/aistudio/image_238eb27b.png"
            alt="Cosmic Cupcakes"
            className="w-6 h-6 rounded-md object-cover shrink-0 border border-[#C4B5FD]/[0.18]"
          />
          <h1 className="text-sm font-semibold tracking-tight text-[#F4F3F8] whitespace-nowrap">
            mission-marz
          </h1>
          <span className="hidden md:inline-block w-px h-3.5 bg-white/[0.08]" />
          <span className="hidden md:inline-block text-[11px] font-mono text-[#A69EC4] tabular-nums whitespace-nowrap">
            {placedPods.length} modules
          </span>
        </div>
      </div>

      {/* Center Live Resource Bar (Clicking opens Balances & Advisor on the Right Side) */}
      {!isSimulating && (
        <div className="pointer-events-auto hidden md:block">
          <button
            onClick={() => {
              audioManager.playClick();
              setOpenMenu(openMenu === 'telemetry' ? 'none' : 'telemetry');
            }}
            className={`px-4 h-11 rounded-xl border shadow-[0_12px_32px_rgba(0,0,0,0.55)] flex items-center gap-4 text-xs tabular-nums transition-colors cursor-pointer ${
              tutorialHighlight === 'telemetry' || openMenu === 'telemetry'
                ? 'bg-[#161224]/95 border-[#8B5CF6]'
                : 'bg-[#0B0914]/92 border-[#C4B5FD]/[0.12] hover:border-[#C4B5FD]/[0.25]'
            }`}
            title="Open Balances, Advisor & Category Caps on right side"
          >
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-[#8E87AB]">Power</span>
              <span
                className={`font-mono font-semibold ${
                  telemetry.netPowerKW >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {telemetry.netPowerKW >= 0 ? `+${telemetry.netPowerKW}` : telemetry.netPowerKW} kW
              </span>
            </div>

            <div className="w-px h-3.5 bg-white/[0.08]" />

            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-[#8E87AB]">Water</span>
              <span
                className={`font-mono font-semibold ${
                  telemetry.netWaterL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {telemetry.netWaterL >= 0 ? `+${telemetry.netWaterL}` : telemetry.netWaterL} L/d
              </span>
            </div>

            <div className="w-px h-3.5 bg-white/[0.08]" />

            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-[#8E87AB]">O₂</span>
              <span
                className={`font-mono font-semibold ${
                  telemetry.netO2Kg >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {telemetry.netO2Kg >= 0 ? `+${telemetry.netO2Kg}` : telemetry.netO2Kg} kg/d
              </span>
            </div>

            <div className="w-px h-3.5 bg-white/[0.08] hidden lg:block" />

            <div className="hidden lg:flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-[#8E87AB]">Spend</span>
              <span className="font-mono font-semibold text-[#F4F3F8]">
                {telemetry.isInfiniteBudget
                  ? formatCurrency(telemetry.totalBaseSpendUSD)
                  : formatCurrency(telemetry.budgetRemainingUSD)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 pl-2 border-l border-white/[0.08]">
              {warnings.length > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                    hasCritical
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-violet-500/20 text-violet-200'
                  }`}
                >
                  {warnings.length}
                </span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-[#8E87AB]" />
            </div>
          </button>
        </div>
      )}

      {/* Right Floating Action Bar (All popovers & Balances drawer dock cleanly on the right) */}
      <div className="pointer-events-auto flex items-center gap-1 p-1.5 h-11 rounded-xl bg-[#0B0914]/92 border border-[#C4B5FD]/[0.12] shadow-[0_12px_32px_rgba(0,0,0,0.55)] shrink-0">
        {/* Right-Side Balances & Advisor Trigger (always accessible) */}
        {!isSimulating && (
          <button
            data-tutorial-target="balances"
            onClick={() => {
              audioManager.playClick();
              setOpenMenu(openMenu === 'telemetry' ? 'none' : 'telemetry');
            }}
            className={`px-2.5 h-8 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              tutorialHighlight === 'telemetry' || openMenu === 'telemetry'
                ? 'bg-[#7C3AED] text-white'
                : 'text-[#B5AFCE] hover:text-white hover:bg-[#19152B]'
            }`}
            title="Balances & Advisor"
            aria-label="Balances and Advisor"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Balances</span>
          </button>
        )}

        {/* Click-to-Delete Mode Toggle */}
        {!isSimulating && onToggleDeleteMode && (
          <button
            onClick={() => {
              setOpenMenu('none');
              onToggleDeleteMode();
            }}
            className={`px-2.5 h-8 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              deleteMode
                ? 'bg-rose-600 text-white border border-rose-400/50'
                : 'text-[#B5AFCE] hover:text-rose-300 hover:bg-rose-500/12'
            }`}
            title="Delete Mode: Click placed modules on Mars to remove them"
            aria-label="Toggle Delete Mode"
            aria-pressed={deleteMode}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{deleteMode ? 'Deleting' : 'Delete'}</span>
          </button>
        )}

        {/* Radar Toggle */}
        {!isSimulating && (
          <div className="relative">
            <button
              data-tutorial-target="radar-btn"
              onClick={() => {
                audioManager.playClick();
                setOpenMenu(openMenu === 'radar' ? 'none' : 'radar');
              }}
              className={`p-2 h-8 w-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                tutorialHighlight === 'radar' || openMenu === 'radar'
                  ? 'bg-[#7C3AED] text-white'
                  : 'text-[#B5AFCE] hover:text-white hover:bg-[#1A1726]'
              }`}
              title="Base Radar"
              aria-label="Toggle Base Radar"
            >
              <Radar className="w-4 h-4" />
            </button>

            {openMenu === 'radar' && (
              <div className="absolute right-0 top-full mt-2.5 z-50">
                <MinimapRadar
                  placedPods={placedPods}
                  cameraState={cameraState}
                  rovers={rovers}
                  selectedPlacedPod={selectedPlacedPod}
                  onMinimapClick={(gx, gz) => {
                    onMinimapClick(gx, gz);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Audio Popover */}
        <div className="relative">
          <button
            onClick={() => {
              audioManager.playClick();
              setOpenMenu(openMenu === 'audio' ? 'none' : 'audio');
            }}
            className={`p-2 h-8 w-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              tutorialHighlight === 'audio' || openMenu === 'audio'
                ? 'bg-[#7C3AED] text-white'
                : 'text-[#B5AFCE] hover:text-white hover:bg-[#1A1726]'
            }`}
            title="Audio & Music"
            aria-label="Audio & Music Controls"
          >
            {musicMuted && sfxMuted ? (
              <VolumeX className="w-4 h-4 text-[#6E678A]" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          {openMenu === 'audio' && (
            <div className="absolute right-0 top-full mt-2.5 w-64 p-3.5 rounded-xl bg-[#0B0914]/95 border border-[#C4B5FD]/[0.14] shadow-[0_14px_34px_rgba(0,0,0,0.72)] z-50 space-y-3 text-left">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8E87AB]">
                Audio Controls
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#EAE6F7]">Sound Effects</span>
                <button
                  onClick={handleToggleSfx}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    sfxMuted
                      ? 'bg-[#171422] text-[#8E87AB]'
                      : 'bg-emerald-500/15 text-emerald-400'
                  }`}
                >
                  {sfxMuted ? 'Muted' : 'On'}
                </button>
              </div>

              <div className="pt-2.5 border-t border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#EAE6F7] truncate pr-2">
                    {currentTrackTitle}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={handlePrevTrack}
                      className="p-1 rounded hover:bg-[#1A1726] text-[#9B94B8] hover:text-white cursor-pointer"
                      aria-label="Previous track"
                    >
                      <SkipBack className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleToggleMusic}
                      className={`p-1 rounded hover:bg-[#1A1726] cursor-pointer ${
                        musicMuted ? 'text-[#6E678A]' : 'text-[#A78BFA]'
                      }`}
                      aria-label="Toggle music"
                    >
                      <Music className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleNextTrack}
                      className="p-1 rounded hover:bg-[#1A1726] text-[#9B94B8] hover:text-white cursor-pointer"
                      aria-label="Next track"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#8E87AB]">Vol</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={musicVol}
                    onChange={handleVolumeChange}
                    className="w-full accent-[#7C3AED] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Options Menu (Always pops up on the right side) */}
        <div className="relative">
          <button
            data-tutorial-target="options-btn"
            onClick={() => {
              audioManager.playClick();
              setOpenMenu(openMenu === 'actions' ? 'none' : 'actions');
            }}
            className={`p-2 h-8 w-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              tutorialHighlight === 'actions' || openMenu === 'actions'
                ? 'bg-[#7C3AED] text-white'
                : 'text-[#B5AFCE] hover:text-white hover:bg-[#1A1726]'
            }`}
            title="All Options"
            aria-label="All Options"
          >
            <Menu className="w-4 h-4" />
          </button>

          {openMenu === 'actions' && (
            <div className="absolute right-0 top-full mt-2.5 w-56 py-2 rounded-xl bg-[#0B0914]/95 border border-[#C4B5FD]/[0.14] shadow-[0_14px_34px_rgba(0,0,0,0.72)] z-50 text-left">
              <div className="px-3.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8E87AB]">
                Mission &amp; Help
              </div>
              <button
                onClick={() => {
                  audioManager.playClick();
                  setOpenMenu('none');
                  onOpenConfig();
                }}
                className="w-full px-3.5 py-2 text-xs text-[#EAE6F7] hover:bg-[#1A1726] flex items-center gap-2.5 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-[#9B94B8]" />
                <span>Mission Settings</span>
              </button>

              <button
                onClick={() => {
                  audioManager.playClick();
                  setOpenMenu('none');
                  onOpenTutorial();
                }}
                className="w-full px-3.5 py-2 text-xs text-[#EAE6F7] hover:bg-[#1A1726] flex items-center gap-2.5 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#9B94B8]" />
                <span>Guided Tutorial</span>
              </button>

              {onWatchCutscene && !isSimulating && (
                <button
                  onClick={() => {
                    audioManager.playClick();
                    setOpenMenu('none');
                    onWatchCutscene();
                  }}
                  className="w-full px-3.5 py-2 text-xs text-[#EAE6F7] hover:bg-[#1A1726] flex items-center gap-2.5 cursor-pointer"
                >
                  <Rocket className="w-3.5 h-3.5 text-[#9B94B8]" />
                  <span>Launch Cutscene</span>
                </button>
              )}

              <div className="my-1.5 border-t border-white/[0.08]" />
              <div className="px-3.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8E87AB]">
                Base Layout
              </div>

              <button
                onClick={() => {
                  audioManager.playClick();
                  setOpenMenu('none');
                  onLoadPreset();
                }}
                className="w-full px-3.5 py-2 text-xs text-[#EAE6F7] hover:bg-[#1A1726] flex items-center gap-2.5 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-[#9B94B8]" />
                <span>Load Preset Base</span>
              </button>

              <button
                onClick={() => {
                  audioManager.playClick();
                  setOpenMenu('none');
                  onClearBase();
                }}
                className="w-full px-3.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Grid</span>
              </button>
            </div>
          )}
        </div>

        {/* Always-Visible Primary CTA: Simulate 30 Days */}
        <div className="relative pl-1">
          <button
            data-tutorial-target="simulate-btn"
            onClick={() => {
              if (canLaunch && !isSimulating) {
                audioManager.playClick();
                setOpenMenu('none');
                onStartSimulation();
              } else if (!canLaunch) {
                audioManager.playClick();
                setOpenMenu(openMenu === 'missing' ? 'none' : 'missing');
              }
            }}
            disabled={isSimulating}
            className={`px-3.5 h-8 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              tutorialHighlight === 'simulate' ? 'border border-white/60 ' : ''
            }${
              isSimulating
                ? 'bg-[#171422] text-[#B5AFCE] border border-white/[0.1] cursor-wait'
                : canLaunch
                ? 'bg-[#7C3AED] hover:bg-[#8B5CF6] text-white cursor-pointer'
                : 'bg-[#171422] hover:bg-[#221D33] text-[#EAE6F7] border border-white/[0.1] cursor-pointer'
            }`}
          >
            {isSimulating ? (
              <span>Simulating...</span>
            ) : canLaunch ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Simulate 30 Days</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-[#A78BFA]" />
                <span className="tabular-nums">Simulate ({10 - missingEssentialCount}/10)</span>
              </>
            )}
          </button>

          {openMenu === 'missing' && !canLaunch && (
            <div className="absolute right-0 top-full mt-2.5 w-72 p-3.5 rounded-xl bg-[#0B0914]/95 border border-[#C4B5FD]/[0.14] shadow-[0_14px_34px_rgba(0,0,0,0.72)] z-50 text-left">
              <div className="text-xs font-semibold text-[#F4F3F8] mb-1">
                {missingEssentialCount} Essential Modules Needed
              </div>
              <p className="text-[11px] text-[#9B94B8] leading-relaxed mb-2.5">
                Click any missing module below to place it right away:
              </p>
              <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
                {missingIds.map((id) => {
                  const def = POD_MAP.get(id);
                  if (!def) return null;
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        audioManager.playClick();
                        onSelectCatalogPod(def);
                        setOpenMenu('none');
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#171422] hover:bg-[#221D33] border border-white/[0.06] text-left text-xs text-[#EAE6F7] flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="truncate">{def.name}</span>
                      <Plus className="w-3.5 h-3.5 text-[#A78BFA] shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right-Side Docked Telemetry / Balances / Advisor Drawer */}
      {openMenu === 'telemetry' && !isSimulating && (
        <div className="pointer-events-auto fixed top-[4.25rem] right-4 z-50">
          <TelemetryDrawer
            telemetry={telemetry}
            warnings={warnings}
            onClose={() => setOpenMenu('none')}
            onSelectCatalogPod={(pod) => onSelectCatalogPod(pod)}
          />
        </div>
      )}
    </header>
  );
};
