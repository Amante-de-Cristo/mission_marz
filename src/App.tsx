import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ThreeCanvas } from './components/ThreeCanvas';
import { HeaderNav } from './components/HeaderNav';
import { PodCatalogSidebar } from './components/PodCatalogSidebar';
import { TelemetryDrawer } from './components/TelemetryDrawer';
import { WelcomeModal } from './components/WelcomeModal';
import { TutorialModal } from './components/TutorialModal';
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

  // Modals state
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(true);
  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState<boolean>(false);

  // Simulation lifecycle: idle -> transit -> construction -> operational -> evaluation
  const [simulationPhase, setSimulationPhase] = useState<SimulationPhase>('idle');
  const [simulationProgress, setSimulationProgress] = useState<number>(0);
  const [currentSimulationDay, setCurrentSimulationDay] = useState<number>(1);
  const [currentSimulationLog, setCurrentSimulationLog] = useState<DailySimulationLog | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

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
    audioManager.playPlacePod();
  };

  // Clear / Reset Grid
  const handleClearBase = () => {
    setPlacedPods([]);
    setSelectedCatalogPod(null);
    setSelectedPlacedPod(null);
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
    audioManager.playPlacePod();
  };

  // Rotate ghost pod during placement
  const handleRotateGhost = () => {
    setPlacementRotation((prev) => (prev + 90) % 360);
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

  // Trigger Pre-Simulation Logistics & Construction Sequence
  const handleStartSimulationSequence = () => {
    if (!launchCheck.canLaunch || simulationPhase !== 'idle') return;

    audioManager.playClick();
    setSelectedCatalogPod(null);
    setSelectedPlacedPod(null);

    // Precalculate simulation outcome
    const fullResult = run30DaySimulation(placedPods, config);
    setSimulationResult(fullResult);

    // Enter Pre-Simulation Logistics Sequence (Earth -> Mars transit, then robotic assembly)
    setSimulationPhase('transit');
  };

  // Start Main 30-Day Sol Operational Simulation loop
  const startMainOperationalLoop = useCallback(() => {
    setSimulationPhase('operational');
    setSimulationProgress(0);
    setCurrentSimulationDay(1);

    const fullResult = simulationResult || run30DaySimulation(placedPods, config);
    setSimulationResult(fullResult);

    // Run 18-second cinematic simulation
    const totalSimDurationMs = 18000;
    const intervalMs = 100;
    const totalSteps = totalSimDurationMs / intervalMs;
    let step = 0;

    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }

    simulationIntervalRef.current = window.setInterval(() => {
      step++;
      const prog = Math.min(1, step / totalSteps);
      setSimulationProgress(prog);

      const day = Math.min(30, Math.floor(prog * 29) + 1);
      setCurrentSimulationDay(day);

      const log = fullResult.logs.find((l) => l.day === day) || null;
      setCurrentSimulationLog(log);

      if (step % 10 === 0) {
        audioManager.playDayTick();
      }

      if (step >= totalSteps) {
        if (simulationIntervalRef.current) {
          clearInterval(simulationIntervalRef.current);
          simulationIntervalRef.current = null;
        }
        setSimulationPhase('evaluation');
        setShowEvaluationModal(true);
      }
    }, intervalMs);
  }, [placedPods, config, simulationResult]);

  // Skip simulation straight to evaluation report
  const handleSkipToEvaluation = () => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    setSimulationProgress(1);
    setCurrentSimulationDay(30);
    setSimulationPhase('evaluation');
    setShowEvaluationModal(true);
  };

  // Welcome modal confirmed
  const handleWelcomeConfirm = (newConfig: MissionConfig, mode: 'preset' | 'scratch' | 'tutorial') => {
    setConfig(newConfig);
    setShowWelcomeModal(false);

    if (mode === 'tutorial') {
      loadPresetBase();
      setShowTutorialModal(true);
    } else if (mode === 'preset') {
      loadPresetBase();
    } else {
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

  const isSimulating = simulationPhase === 'operational';
  const isPreSimulating = simulationPhase === 'transit' || simulationPhase === 'construction';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#100505] text-white font-sans select-none">
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
      />

      {/* Top Header Navigation */}
      <HeaderNav
        telemetry={telemetry}
        canLaunch={launchCheck.canLaunch}
        missingEssentialCount={launchCheck.missingCount}
        missingPodNames={launchCheck.missingPodNames}
        isSimulating={isSimulating || isPreSimulating}
        onStartSimulation={handleStartSimulationSequence}
        onOpenTutorial={() => setShowTutorialModal(true)}
        onOpenConfig={() => setShowWelcomeModal(true)}
        onLoadPreset={loadPresetBase}
        onClearBase={handleClearBase}
        selectedCatalogPod={selectedCatalogPod}
        onRotateGhost={handleRotateGhost}
        selectedPlacedPod={selectedPlacedPod}
        onRotatePlacedPod={handleRotatePlacedPod}
      />

      {/* Left Pod Catalog Sidebar (Color-Coded 11 Categories) */}
      {!isSimulating && !isPreSimulating && (
        <PodCatalogSidebar
          selectedCatalogPod={selectedCatalogPod}
          onSelectCatalogPod={(pod) => {
            setSelectedCatalogPod(pod);
            if (pod) {
              setSelectedPlacedPod(null);
            }
          }}
          placedPods={placedPods}
        />
      )}

      {/* Right Resource Telemetry, Caps & 2D Tactical Minimap Drawer */}
      {!isSimulating && !isPreSimulating && (
        <TelemetryDrawer
          telemetry={telemetry}
          warnings={advisorWarnings}
          placedPods={placedPods}
          cameraState={cameraState}
          rovers={rovers}
          selectedPlacedPod={selectedPlacedPod}
          onMinimapClick={handleMinimapClick}
        />
      )}

      {/* Pre-Simulation Sequence: Interplanetary Transit & Robotic Assembly */}
      {isPreSimulating && (
        <PreSimulationSequence
          onComplete={startMainOperationalLoop}
          onSkip={startMainOperationalLoop}
          transitDays={210}
          constructionDays={14}
          placedPods={placedPods}
        />
      )}

      {/* Simulation Overlay (Active during 30-Day operational simulation) */}
      {isSimulating && (
        <SimulationOverlay
          currentDay={currentSimulationDay}
          totalDays={30}
          progress={simulationProgress}
          currentLog={currentSimulationLog}
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

      {/* Interactive Onboarding Tutorial Modal */}
      {showTutorialModal && (
        <TutorialModal onClose={() => setShowTutorialModal(false)} />
      )}

      {/* Final 30-Day Simulation Evaluation Modal */}
      {showEvaluationModal && simulationResult && (
        <EvaluationModal
          result={simulationResult}
          onClose={() => {
            setShowEvaluationModal(false);
            setSimulationPhase('idle');
          }}
          onReset={() => {
            setShowEvaluationModal(false);
            setSimulationPhase('idle');
            loadPresetBase();
          }}
        />
      )}
    </div>
  );
}
