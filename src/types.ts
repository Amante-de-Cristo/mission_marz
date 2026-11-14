export type PodCategory =
  | 'Essential'
  | 'Food & Agriculture'
  | 'Life Support'
  | 'Medical & Health'
  | 'Science & Research'
  | 'Energy & Electricity'
  | 'Engineering & Manufacturing'
  | 'Transportation & Exploration'
  | 'Waste & Recycling'
  | 'Recreation & Community'
  | 'Security & Emergency';

export interface PodDefinition {
  id: string;
  name: string;
  category: PodCategory;
  isEssential?: boolean;
  cost: number; // in USD
  mass: number; // in kg
  powerKW: number; // positive = consumes, negative = generates
  waterRate: number; // L/day, positive = consumes, negative = generates
  o2Rate: number; // kg/day, positive = consumes, negative = generates
  foodRate?: number; // kg/day, positive = consumes, negative = generates
  co2ScrubKg?: number; // kg/day scrubbed
  wasteCapacityKg?: number; // capacity handled
  crewCapacity?: number;
  description: string;
  nasaTechSpec: string;
  modelType: string;
  colorAccent: string;
}

export interface PlacedPod {
  instanceId: string;
  podId: string;
  gridX: number;
  gridZ: number;
  rotation: number; // in increments of 90 degrees (0, 90, 180, 270)
  placedAt: number;
}

export interface MarsLandingSite {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  solarMultiplier: number;
  iceDepositBonus: number;
  avgTempC: number;
  dustRisk: 'Low' | 'Moderate' | 'High';
  terrainTintHex: string;
  description: string;
}

export interface MissionConfig {
  isInfiniteBudget: boolean; // default true (infinite / uncapped)
  constructionBudget: number; // $ if manual
  launchBudget: number; // $ if manual
  costPerKg: number; // $10,000 - $20,000 / kg
  crewSize: number; // 1 to 7 astronauts (default 4)
  landingSite?: MarsLandingSite;
}

export interface ResourceTelemetry {
  isInfiniteBudget: boolean;
  powerDemandKW: number;
  powerSupplyKW: number;
  netPowerKW: number;
  solarSupplyKW: number;
  continuousSupplyKW: number;
  batteryCapacityKWh: number;
  waterDemandL: number;
  waterSupplyL: number;
  netWaterL: number;
  o2DemandKg: number;
  o2SupplyKg: number;
  netO2Kg: number;
  foodSupplyKg: number;
  foodDemandKg: number;
  co2ScrubCapacityKg: number;
  co2ProductionKg: number;
  wasteHandledKg: number;
  wasteProducedKg: number;
  scienceOutputPerDay: number;
  networkConnectedPercent: number;
  totalMassKg: number;
  totalCostUSD: number;
  totalBaseSpendUSD: number;
  budgetRemainingUSD: number;
  launchCapacityKg: number;
  launchBudgetRemainingUSD: number;
  crewCapacity: number;
  categoryCaps: Record<PodCategory, { placed: number; maxAllowed: number }>;
  podCaps: Record<string, { placed: number; maxAllowed: number }>;
}

export interface AdvisorWarning {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  suggestedAction?: string;
  relatedCategory?: PodCategory;
}

export interface DailySimulationLog {
  day: number;
  title: string;
  description: string;
  type: 'normal' | 'event' | 'hazard' | 'success' | 'failure';
  o2Level: number; // percentage 0-100
  powerLevel: number; // percentage 0-100
  waterLevel: number; // percentage 0-100
  foodLevel: number; // percentage 0-100
  moraleLevel: number; // percentage 0-100
  o2KgRemaining: number;
  waterLRemaining: number;
  foodKgRemaining: number;
  netPowerKW: number;
  co2KPa: number;
  radiationMSv: number;
  solarMultiplier: number;
  temperatureC: number;
}

export interface SimulationFailureReason {
  day: number;
  subsystem: 'Power' | 'Oxygen' | 'Water' | 'Food' | 'CO₂ Scrubbing' | 'Radiation' | 'Prerequisites';
  summary: string;
  whyItFailed: string;
  whatIsNeeded: string;
  recommendedPodIds: string[];
}

export interface SimulationResult {
  passed: boolean;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  habitabilityScore: number; // 0 - 100
  daysSurviving: number;
  totalDays: number;
  failureReason: SimulationFailureReason | null;
  criticalFailures: string[];
  scienceYieldTotal: number;
  networkConnectivityPct: number;
  finalReserves: {
    o2Kg: number;
    waterL: number;
    foodKg: number;
    batteryKWh: number;
    co2KPa: number;
  };
  telemetrySnapshot: ResourceTelemetry;
  systemBreakdown: {
    powerReliability: number;
    oxygenStability: number;
    waterReserve: number;
    foodSustainability: number;
    lifeSupportIntegrity: number;
    crewMorale: number;
  };
  actionableSteps: string[];
  logs: DailySimulationLog[];
}

export type SimulationPhase = 'idle' | 'transit' | 'construction' | 'operational' | 'evaluation';

export interface CameraState {
  x: number;
  z: number;
  rotationY: number;
  zoom: number;
}

export interface RoverState {
  id: string;
  x: number;
  z: number;
  angle: number;
  targetX: number;
  targetZ: number;
}

export interface HelicopterState {
  id: string;
  x: number;
  y: number;
  z: number;
  rotorAngle: number;
  status: 'ground' | 'takeoff' | 'hovering' | 'surveying' | 'landing';
}

export interface AstronautState {
  id: string;
  name: string;
  x: number;
  z: number;
  angle: number;
  status: 'walking' | 'inspecting' | 'entering_airlock';
  targetX: number;
  targetZ: number;
}
