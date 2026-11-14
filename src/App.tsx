import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ThreeCanvas } from './components/ThreeCanvas';
import { HeaderNav, HeaderMenuId, TutorialHighlightTarget } from './components/HeaderNav';
import { PodCatalogSidebar, CatalogGroupId } from './components/PodCatalogSidebar';
import { WelcomeModal } from './components/WelcomeModal';
import {
  TutorialModal,
  TUTORIAL_STEPS,
  TutorialStepAction,
  TutorialProgressState,
} from './components/TutorialModal';
import { PodInspectorModal } from './components/PodInspectorModal';
import { PreSimulationSequence } from './components/PreSimulationSequence';
import { SimulationOverlay } from './components/SimulationOverlay';
import { EvaluationModal } from './components/EvaluationModal';
import {
  PlacedPod,
  PodDefinition,
  MissionConfig,
  SimulationResult,
  DailySimulationLog,
  SimulationPhase,
  CameraState,
  RoverState,
} from './types';
import { POD_MAP, PRESET_MARS_BASE } from './utils/podCatalog';
import {
  calculateTelemetry,
  canLaunchSimulation,
  generateBaseAdvisorWarnings,
  run30DaySimulation,
} from './utils/marsSimulation';
import { audioManager } from './utils/audioManager';

const DEFAULT_CONFIG: MissionConfig = {
  isInfiniteBudget: true,
  constructionBudget: 25000000000, // $25B
  launchBudget: 15000000000, // $15B
  costPerKg: 15000, // $15,000 / kg to Mars
  crewSize: 4, // default 4 astronauts
};

export default function App() {
  const [config, setConfig] = useState<MissionConfig>(DEFAULT_CONFIG);
  const [placedPods, setPlacedPods] = useState<PlacedPod[]>([]);
  const [selectedCatalogPod, setSelectedCatalogPod] = useState<PodDefinition | null>(null);
  const [selectedPlacedPod, setSelectedPlacedPod] = useState<PlacedPod | null>(null);
  const [placementRotation, setPlacementRotation] = useState<number>(0);
  const [deleteMode, setDeleteMode] = useState<boolean>(false);

  // Modals & Guided Tutorial state
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(true);
  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState<number>(0);
  const [tutorialProgress, setTutorialProgress] = useState<TutorialProgressState>({
    openedBalances: false,
    pickedModule: false,
    rotatedModule: false,
    placedModule: false,
    inspectedModule: false,
    openedRadar: false,
    checkedOptionsOrLaunch: false,
  });
  const [controlledHeaderMenu, setControlledHeaderMenu] = useState<HeaderMenuId>('none');
  const [forcedCatalogGroup, setForcedCatalogGroup] = useState<CatalogGroupId | null>(null);
  const [showEvaluationModal, setShowEvaluationModal] = useState<boolean>(false);

  // Simulation lifecycle: idle -> transit -> operational -> evaluation
  const [simulationPhase, setSimulationPhase] = useState<SimulationPhase>('idle');
  const [simulationProgress, setSimulationProgress] = useState<number>(0);
  const [currentSimulationDay, setCurrentSimulationDay] = useState<number>(1);
  const [currentSimulationLog, setCurrentSimulationLog] = useState<DailySimulationLog | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [simPaused, setSimPaused] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<1 | 2>(1);
  const [simulationFailed, setSimulationFailed] = useState<boolean>(false);

  // 2D Tactical Minimap & Camera tracking
  const [cameraState, setCameraState] = useState<CameraState>({
    x: 0,
    z: 48,
    rotationY: 0,
    zoom: 60,
  });
  const [rovers, setRovers] = useState<RoverState[]>([]);
  const [targetFocusCoord, setTargetFocusCoord] = useState<{ gridX: number; gridZ: number } | null>(null);

  const simulationIntervalRef = useRef<number | null>(null);
  const failureHoldTimeoutRef = useRef<number | null>(null);
  const simPausedRef = useRef<boolean>(false);
  const simSpeedRef = useRef<1 | 2>(1);
  const activeResultRef = useRef<SimulationResult | null>(null);

  simPausedRef.current = simPaused;
  simSpeedRef.current = simSpeed;

  const clearSimTimers = useCallback(() => {
    if (simulationIntervalRef.current !== null) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    if (failureHoldTimeoutRef.current !== null) {
      clearTimeout(failureHoldTimeoutRef.current);
      failureHoldTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearSimTimers();
  }, [clearSimTimers]);

  // Check for ?autostart=1 in URL (as supported by Ultra Mode)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('autostart') === '1') {
        setShowWelcomeModal(false);
        loadPresetBase();
      }
    }
  }, []);

  // Compute live telemetry
  const telemetry = useMemo(() => {
    return calculateTelemetry(placedPods, config);
  }, [placedPods, config]);

  // Compute advisor warnings
  const advisorWarnings = useMemo(() => {
    return generateBaseAdvisorWarnings(placedPods, telemetry, config);
  }, [placedPods, telemetry, config]);

  // Check essential pods launch gate
  const launchCheck = useMemo(() => {
    return canLaunchSimulation(placedPods);
  }, [placedPods]);

  // Load Preset Mars Base
  const loadPresetBase = () => {
    const preset: PlacedPod[] = PRESET_MARS_BASE.map((p, index) => ({
      instanceId: `preset_${p.podId}_${index}`,
      podId: p.podId,
      gridX: p.gridX,
      gridZ: p.gridZ,
      rotation: p.rotation,
      placedAt: Date.now() + index,
    }));
    setPlacedPods(preset);
    setSelectedCatalogPod(null);
    setSelectedPlacedPod(null);
    setDeleteMode(false);
    audioManager.playPlacePod();
  };

  // Clear / Reset Grid
  const handleClearBase = () => {
    setPlacedPods([]);
    setSelectedCatalogPod(null);
    setSelectedPlacedPod(null);
    setDeleteMode(false);
    audioManager.playDemolish();
  };

  // Place a Pod onto the Grid
  const handlePlacePod = (gridX: number, gridZ: number, rotation: number) => {
    if (!selectedCatalogPod) return;

    // Check if tile already occupied
    const isOccupied = placedPods.some((p) => p.gridX === gridX && p.gridZ === gridZ);
    if (isOccupied) {
      audioManager.playError();
      return;
    }

    const newPlaced: PlacedPod = {
      instanceId: `pod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      podId: selectedCatalogPod.id,
      gridX,
      gridZ,
      rotation: rotation ?? placementRotation,
      placedAt: Date.now(),
    };

    setPlacedPods((prev) => [...prev, newPlaced]);
    setTutorialProgress((prev) => ({ ...prev, placedModule: true }));
    audioManager.playPlacePod();
  };

  // Rotate ghost pod during placement
  const handleRotateGhost = () => {
    setPlacementRotation((prev) => (prev + 90) % 360);
    setTutorialProgress((prev) => ({ ...prev, rotatedModule: true }));
  };

  // Rotate an already placed pod
  const handleRotatePlacedPod = (instanceId: string) => {
    setPlacedPods((prev) =>
      prev.map((p) =>
        p.instanceId === instanceId
          ? { ...p, rotation: (p.rotation + 90) % 360 }
          : p
      )
    );
    if (selectedPlacedPod?.instanceId === instanceId) {
      setSelectedPlacedPod((prev) =>
        prev ? { ...prev, rotation: (prev.rotation + 90) % 360 } : null
      );
    }
  };

  // Demolish an already placed pod
  const handleDemolishPlacedPod = (instanceId: string) => {
    setPlacedPods((prev) => prev.filter((p) => p.instanceId !== instanceId));
    if (selectedPlacedPod?.instanceId === instanceId) {
      setSelectedPlacedPod(null);
    }
  };

  const handleToggleDeleteMode = () => {
    setDeleteMode((prev) => {
      const next = !prev;
      if (next) {
        setSelectedCatalogPod(null);
        setSelectedPlacedPod(null);
      }
      return next;
    });
    audioManager.playClick();
  };

  // Run Main Operational Simulation directly on the 3D Mars base (stops cleanly on stopDay)
  const startMainOperationalLoop = useCallback(
    (precomputedResult?: SimulationResult) => {
      clearSimTimers();

      const fullResult = precomputedResult || run30DaySimulation(placedPods, config);
      activeResultRef.current = fullResult;
      setSimulationResult(fullResult);
      setSimulationPhase('operational');
      setSimPaused(false);
      simPausedRef.current = false;
      setSimulationFailed(false);

      const stopDay = fullResult.passed ? 30 : Math.max(1, fullResult.daysSurviving);
      const firstLog = fullResult.logs[0] || null;
      setCurrentSimulationDay(1);
      setSimulationProgress(1 / 30);
      setCurrentSimulationLog(firstLog);

      // 450ms per day at 1x, 225ms per day at 2x (50ms substeps for smooth 3D sun sweep)
      const tickMs = 50;
      const msPerDayBase = 450;
      let virtualElapsedMs = 0;
      let lastRecordedDay = 1;
      let completed = false;

      simulationIntervalRef.current = window.setInterval(() => {
        if (simPausedRef.current || completed) return;

        virtualElapsedMs += tickMs * simSpeedRef.current;
        const floatDay = 1 + virtualElapsedMs / msPerDayBase;

        if (floatDay >= stopDay) {
          completed = true;
          clearSimTimers();

          const finalLog =
            fullResult.logs.find((l) => l.day === stopDay) ||
            fullResult.logs[fullResult.logs.length - 1] ||
            null;
          setCurrentSimulationDay(stopDay);
          setSimulationProgress(stopDay / 30);
          setCurrentSimulationLog(finalLog);

          if (!fullResult.passed) {
            setSimulationFailed(true);
            audioManager.playError();
            failureHoldTimeoutRef.current = window.setTimeout(() => {
              setSimulationPhase('evaluation');
              setShowEvaluationModal(true);
            }, 1250);
          } else {
            audioManager.playDayTick();
            failureHoldTimeoutRef.current = window.setTimeout(() => {
              setSimulationPhase('evaluation');
              setShowEvaluationModal(true);
            }, 450);
          }
          return;
        }

        const day = Math.min(stopDay, Math.floor(floatDay));
        setSimulationProgress(Math.min(1, floatDay / 30));

        if (day !== lastRecordedDay) {
          lastRecordedDay = day;
          setCurrentSimulationDay(day);
          const log = fullResult.logs.find((l) => l.day === day) || null;
          setCurrentSimulationLog(log);
          audioManager.playDayTick();
        }
      }, tickMs);
    },
    [placedPods, config, clearSimTimers]
  );

  // Trigger single unified 30-Day Simulation directly on the 3D base
  const handleStartSimulationSequence = () => {
    setTutorialProgress((prev) => ({ ...prev, checkedOptionsOrLaunch: true }));
    if (!launchCheck.canLaunch || simulationPhase !== 'idle') return;

    audioManager.playClick();
    setSelectedCatalogPod(null);
    setSelectedPlacedPod(null);
    setDeleteMode(false);

    const fullResult = run30DaySimulation(placedPods, config);
    startMainOperationalLoop(fullResult);
  };

  // Optional Launch Cutscene viewer from Options menu (returns cleanly to idle)
  const handleWatchCutscene = () => {
    if (simulationPhase !== 'idle') return;
    audioManager.playClick();
    setSelectedCatalogPod(null);
    setSelectedPlacedPod(null);
    setDeleteMode(false);
    setSimulationPhase('transit');
  };

  // Skip simulation straight to evaluation report (honoring exact stopDay)
  const handleSkipToEvaluation = () => {
    clearSimTimers();
    const res = activeResultRef.current || simulationResult;
    const stopDay = res ? (res.passed ? 30 : Math.max(1, res.daysSurviving)) : 30;
    const finalLog =
      res?.logs.find((l) => l.day === stopDay) ||
      res?.logs[res.logs.length - 1] ||
      null;

    setSimulationProgress(stopDay / 30);
    setCurrentSimulationDay(stopDay);
    setCurrentSimulationLog(finalLog);
    setSimulationFailed(Boolean(res && !res.passed));
    setSimulationPhase('evaluation');
    setShowEvaluationModal(true);
  };

  const openGuidedTutorial = useCallback(() => {
    setTutorialStepIndex(0);
    setTutorialProgress({
      openedBalances: false,
      pickedModule: false,
      rotatedModule: false,
      placedModule: false,
      inspectedModule: false,
      openedRadar: false,
      checkedOptionsOrLaunch: false,
    });
    setControlledHeaderMenu('none');
    setForcedCatalogGroup(null);
    setSelectedCatalogPod(null);
    setSelectedPlacedPod(null);
    setDeleteMode(false);
    setShowTutorialModal(true);
  }, []);

  const closeGuidedTutorial = useCallback(() => {
    setShowTutorialModal(false);
    setControlledHeaderMenu('none');
    setForcedCatalogGroup(null);
  }, []);

  // Track real-time user actions for action-gated tutorial steps
  useEffect(() => {
    if (!showTutorialModal) return;
    setTutorialProgress((prev) => ({
      ...prev,
      openedBalances: prev.openedBalances || controlledHeaderMenu === 'telemetry',
      pickedModule: prev.pickedModule || selectedCatalogPod !== null,
      inspectedModule: prev.inspectedModule || selectedPlacedPod !== null,
      openedRadar: prev.openedRadar || controlledHeaderMenu === 'radar',
      checkedOptionsOrLaunch:
        prev.checkedOptionsOrLaunch ||
        controlledHeaderMenu === 'actions' ||
        controlledHeaderMenu === 'missing',
    }));
  }, [showTutorialModal, controlledHeaderMenu, selectedCatalogPod, selectedPlacedPod]);

  const handleTutorialAction = useCallback((action: TutorialStepAction) => {
    if (action.openHeaderMenu !== undefined) {
      setControlledHeaderMenu(action.openHeaderMenu);
    }
    if (action.selectCatalogGroup) {
      setSelectedCatalogPod(null);
      setForcedCatalogGroup(action.selectCatalogGroup);
    }
    if (action.clearPlacement) {
      setSelectedCatalogPod(null);
    }
    if (action.focusCenter) {
      setTargetFocusCoord({ gridX: 0, gridZ: 0 });
    }
  }, []);

  // Welcome modal confirmed
  const handleWelcomeConfirm = (
    newConfig: MissionConfig,
    mode: 'preset' | 'scratch' | 'tutorial' | 'apply'
  ) => {
    setConfig(newConfig);
    setShowWelcomeModal(false);

    if (mode === 'tutorial') {
      if (placedPods.length === 0) loadPresetBase();
      openGuidedTutorial();
    } else if (mode === 'preset') {
      loadPresetBase();
    } else if (mode === 'scratch') {
      handleClearBase();
    }
    audioManager.playMusic();
  };

  // Minimap sector click
  const handleMinimapClick = (gridX: number, gridZ: number) => {
    setTargetFocusCoord({ gridX, gridZ });
    const pod = placedPods.find((p) => p.gridX === gridX && p.gridZ === gridZ);
    if (pod) {
      setSelectedPlacedPod(pod);
    }
  };

  const activeTutorialStepId = showTutorialModal
    ? TUTORIAL_STEPS[tutorialStepIndex]?.id
    : null;
  const tutorialHeaderHighlight: TutorialHighlightTarget =
    activeTutorialStepId === 'telemetry'
      ? 'telemetry'
      : activeTutorialStepId === 'radar'
      ? 'radar'
      : activeTutorialStepId === 'simulate'
      ? 'actions'
      : null;
  const tutorialCatalogHighlight =
    activeTutorialStepId === 'catalog' || activeTutorialStepId === 'place';

  const isSimulating = simulationPhase === 'operational';
  const isPreSimulating = simulationPhase === 'transit' || simulationPhase === 'construction';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#07060B] text-[#F4F3F8] font-sans select-none">
      {/* 3D Martian Surface Canvas (Expanded 24x24 Grid, Zero Hotkeys) */}
      <ThreeCanvas
        placedPods={placedPods}
        selectedCatalogPod={selectedCatalogPod}
        selectedPlacedPod={selectedPlacedPod}
        onPlacePod={handlePlacePod}
        onSelectPlacedPod={(pod) => setSelectedPlacedPod(pod)}
        onCancelPlacement={() => setSelectedCatalogPod(null)}
        isSimulating={isSimulating}
        simulationProgress={simulationProgress}
        currentSimulationDay={currentSimulationDay}
        crewSize={config.crewSize}
        onCameraUpdate={setCameraState}
        onRoversUpdate={setRovers}
        targetFocusCoord={targetFocusCoord}
        externalRotation={placementRotation}
        onRotateGhost={handleRotateGhost}
        simulationLog={currentSimulationLog}
        simulationFailed={simulationFailed}
        deleteMode={deleteMode}
        onDemolishPod={handleDemolishPlacedPod}
      />

      {/* Top Floating Spatial Bar */}
      <HeaderNav
        telemetry={telemetry}
        warnings={advisorWarnings}
        placedPods={placedPods}
        cameraState={cameraState}
        rovers={rovers}
        selectedPlacedPod={selectedPlacedPod}
        canLaunch={launchCheck.canLaunch}
        missingEssentialCount={launchCheck.missingCount}
        isSimulating={isSimulating || isPreSimulating}
        deleteMode={deleteMode}
        onToggleDeleteMode={handleToggleDeleteMode}
        onStartSimulation={handleStartSimulationSequence}
        onOpenTutorial={openGuidedTutorial}
        onOpenConfig={() => setShowWelcomeModal(true)}
        onGoHome={() => {
          setShowTutorialModal(false);
          setControlledHeaderMenu('none');
          setSelectedCatalogPod(null);
          setSelectedPlacedPod(null);
          setDeleteMode(false);
          setShowWelcomeModal(true);
        }}
        onLoadPreset={loadPresetBase}
        onClearBase={handleClearBase}
        onSelectCatalogPod={(pod) => {
          setSelectedCatalogPod(pod);
          if (pod) {
            setSelectedPlacedPod(null);
            setDeleteMode(false);
          }
        }}
        onMinimapClick={handleMinimapClick}
        onWatchCutscene={placedPods.length > 0 ? handleWatchCutscene : undefined}
        controlledMenu={controlledHeaderMenu}
        onControlledMenuChange={setControlledHeaderMenu}
        tutorialHighlight={tutorialHeaderHighlight}
      />

      {/* Bottom Module Catalog Dock / Placement Bar */}
      {!isSimulating && !isPreSimulating && (
        <PodCatalogSidebar
          selectedCatalogPod={selectedCatalogPod}
          onSelectCatalogPod={(pod) => {
            setSelectedCatalogPod(pod);
            if (pod) {
              setSelectedPlacedPod(null);
              setDeleteMode(false);
            }
          }}
          placedPods={placedPods}
          placementRotation={placementRotation}
          onRotateGhost={handleRotateGhost}
          deleteMode={deleteMode}
          onExitDeleteMode={() => setDeleteMode(false)}
          forcedGroup={forcedCatalogGroup}
          highlightTutorial={tutorialCatalogHighlight}
        />
      )}

      {/* Optional Launch Cutscene (Triggered from Options menu) */}
      {isPreSimulating && (
        <PreSimulationSequence
          onComplete={() => setSimulationPhase('idle')}
          onSkip={() => setSimulationPhase('idle')}
          transitDays={210}
          constructionDays={14}
          placedPods={placedPods}
        />
      )}

      {/* Simulation Overlay (Active during operational simulation) */}
      {isSimulating && (
        <SimulationOverlay
          currentDay={currentSimulationDay}
          totalDays={30}
          progress={simulationProgress}
          currentLog={currentSimulationLog}
          isPaused={simPaused}
          speed={simSpeed}
          hasFailed={simulationFailed}
          onTogglePause={() => {
            audioManager.playClick();
            setSimPaused((prev) => !prev);
          }}
          onToggleSpeed={() => {
            audioManager.playClick();
            setSimSpeed((prev) => (prev === 1 ? 2 : 1));
          }}
          onSkip={handleSkipToEvaluation}
        />
      )}

      {/* Inspector Modal (Triggered by clicking placed pod or UI button) */}
      {selectedPlacedPod && !isSimulating && !isPreSimulating && (
        <PodInspectorModal
          placedPod={selectedPlacedPod}
          onClose={() => setSelectedPlacedPod(null)}
          onRotatePod={handleRotatePlacedPod}
          onDemolishPod={handleDemolishPlacedPod}
        />
      )}

      {/* Initial Welcome & Budget Configuration Modal */}
      {showWelcomeModal && (
        <WelcomeModal
          config={config}
          onConfirm={handleWelcomeConfirm}
          onClose={() => setShowWelcomeModal(false)}
          canClose={placedPods.length > 0}
        />
      )}

      {/* Interactive Step-by-Step Guided Tutorial */}
      {showTutorialModal && !isSimulating && !isPreSimulating && (
        <TutorialModal
          currentStepIndex={tutorialStepIndex}
          progress={tutorialProgress}
          onStepChange={setTutorialStepIndex}
          onExecuteAction={handleTutorialAction}
          onClose={closeGuidedTutorial}
        />
      )}

      {/* Final Simulation Evaluation Modal */}
      {showEvaluationModal && simulationResult && (
        <EvaluationModal
          result={simulationResult}
          onClose={() => {
            setShowEvaluationModal(false);
            setSimulationFailed(false);
            setSimulationPhase('idle');
          }}
          onReset={() => {
            setShowEvaluationModal(false);
            setSimulationFailed(false);
            setSimulationPhase('idle');
            loadPresetBase();
          }}
          onSelectRecommendedPod={(pod) => {
            setShowEvaluationModal(false);
            setSimulationFailed(false);
            setSimulationPhase('idle');
            setSelectedPlacedPod(null);
            setSelectedCatalogPod(pod);
          }}
        />
      )}
    </div>
  );
}
