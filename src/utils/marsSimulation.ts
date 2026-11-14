import {
  PlacedPod,
  MissionConfig,
  ResourceTelemetry,
  AdvisorWarning,
  SimulationResult,
  DailySimulationLog,
  SimulationFailureReason,
} from '../types';
import { POD_MAP, ESSENTIAL_POD_IDS } from './podCatalog';

export function computeNetworkConnectivity(placedPods: PlacedPod[]): number {
  if (placedPods.length === 0) return 100;
  if (placedPods.length === 1) return 100;

  const coordMap = new Map<string, number>();
  placedPods.forEach((p, idx) => {
    coordMap.set(`${p.gridX},${p.gridZ}`, idx);
  });

  const visited = new Set<number>();
  let largestCluster = 0;

  for (let i = 0; i < placedPods.length; i++) {
    if (visited.has(i)) continue;
    const queue = [i];
    visited.add(i);
    let clusterSize = 0;

    while (queue.length > 0) {
      const currIdx = queue.shift()!;
      clusterSize++;
      const p = placedPods[currIdx];
      const neighbors = [
        `${p.gridX + 1},${p.gridZ}`,
        `${p.gridX - 1},${p.gridZ}`,
        `${p.gridX},${p.gridZ + 1}`,
        `${p.gridX},${p.gridZ - 1}`,
      ];
      for (const key of neighbors) {
        const nIdx = coordMap.get(key);
        if (nIdx !== undefined && !visited.has(nIdx)) {
          visited.add(nIdx);
          queue.push(nIdx);
        }
      }
    }
    if (clusterSize > largestCluster) {
      largestCluster = clusterSize;
    }
  }

  return Math.round((largestCluster / placedPods.length) * 100);
}

export function calculateTelemetry(placedPods: PlacedPod[], config: MissionConfig): ResourceTelemetry {
  let powerDemandKW = 0;
  let powerSupplyKW = 0;
  let solarSupplyKW = 0;
  let continuousSupplyKW = 0;
  let batteryCapacityKWh = 0;
  let waterDemandL = 0;
  let waterSupplyL = 0;
  let o2DemandKg = 0;
  let o2SupplyKg = 0;
  let foodSupplyKg = 0;
  let co2ScrubCapacityKg = 0;
  let wasteHandledKg = 0;
  let scienceOutputPerDay = 0;
  let totalMassKg = 0;
  let totalCostUSD = 0;
  let crewCapacity = 0;

  const categoryCounts: Record<string, number> = {};
  const podCounts: Record<string, number> = {};

  const crewCount = Math.max(1, Math.min(7, config.crewSize || 4));
  const crewO2NeedKg = crewCount * 0.84;
  const crewWaterNeedL = crewCount * 3.6;
  const crewFoodNeedKg = crewCount * 1.8;
  const crewCO2OutputKg = crewCount * 1.0;
  const crewWasteOutputKg = crewCount * 1.5;

  o2DemandKg += crewO2NeedKg;
  waterDemandL += crewWaterNeedL;
  const foodDemandKg = crewFoodNeedKg;
  const co2ProductionKg = crewCO2OutputKg;
  const wasteProducedKg = crewWasteOutputKg;

  for (const placed of placedPods) {
    const pod = POD_MAP.get(placed.podId);
    if (!pod) continue;

    categoryCounts[pod.category] = (categoryCounts[pod.category] || 0) + 1;
    podCounts[pod.id] = (podCounts[pod.id] || 0) + 1;

    totalCostUSD += pod.cost;
    totalMassKg += pod.mass;

    if (pod.crewCapacity) {
      crewCapacity += pod.crewCapacity;
    }

    if (pod.powerKW > 0) {
      powerDemandKW += pod.powerKW;
    } else if (pod.powerKW < 0) {
      const gen = Math.abs(pod.powerKW);
      powerSupplyKW += gen;
      if (pod.id.includes('solar') || pod.modelType === 'solar_array') {
        solarSupplyKW += gen;
      } else {
        continuousSupplyKW += gen;
      }
    }

    if (pod.id === 'battery_storage_pod' || pod.modelType === 'battery_bank') {
      batteryCapacityKWh += 250;
    }

    if (pod.waterRate > 0) {
      waterDemandL += pod.waterRate;
    } else {
      waterSupplyL += Math.abs(pod.waterRate);
    }

    if (pod.o2Rate > 0) {
      o2DemandKg += pod.o2Rate;
    } else {
      o2SupplyKg += Math.abs(pod.o2Rate);
    }

    if (pod.foodRate && pod.foodRate < 0) {
      foodSupplyKg += Math.abs(pod.foodRate);
    }

    if (pod.co2ScrubKg) {
      co2ScrubCapacityKg += pod.co2ScrubKg;
    }

    if (pod.wasteCapacityKg) {
      wasteHandledKg += pod.wasteCapacityKg;
    }

    if (pod.category === 'Science & Research') {
      scienceOutputPerDay += 18;
    } else if (pod.id === 'plant_research_pod') {
      scienceOutputPerDay += 12;
    } else if (pod.category === 'Medical & Health') {
      scienceOutputPerDay += 5;
    } else if (pod.id === 'comm_pod') {
      scienceOutputPerDay += 4;
    }
  }

  // Apply Mars landing site environmental modifiers when selected
  const site = config.landingSite;
  if (site) {
    const adjustedSolarKW = solarSupplyKW * site.solarMultiplier;
    powerSupplyKW = continuousSupplyKW + adjustedSolarKW;
    solarSupplyKW = adjustedSolarKW;

    const hasWaterExtraction =
      (podCounts['water_pod'] || 0) > 0 ||
      (podCounts['water_extraction_pod'] || 0) > 0 ||
      (podCounts['regolith_driller_pod'] || 0) > 0;
    if (hasWaterExtraction) {
      waterSupplyL += site.iceDepositBonus;
    }
  }

  const isInfinite = config.isInfiniteBudget ?? true;
  const launchCostSpent = totalMassKg * config.costPerKg;
  const totalBaseSpendUSD = totalCostUSD + launchCostSpent;

  const budgetRemainingUSD = isInfinite ? 999999999999 : config.constructionBudget - totalCostUSD;
  const launchCapacityKg = isInfinite ? 9999999 : Math.floor(config.launchBudget / config.costPerKg);
  const launchBudgetRemainingUSD = isInfinite ? 999999999999 : config.launchBudget - launchCostSpent;

  const categoryCaps: any = {
    'Essential': { placed: categoryCounts['Essential'] || 0, maxAllowed: 15 },
    'Food & Agriculture': { placed: categoryCounts['Food & Agriculture'] || 0, maxAllowed: 12 },
    'Life Support': { placed: categoryCounts['Life Support'] || 0, maxAllowed: 12 },
    'Medical & Health': { placed: categoryCounts['Medical & Health'] || 0, maxAllowed: 8 },
    'Science & Research': { placed: categoryCounts['Science & Research'] || 0, maxAllowed: 12 },
    'Energy & Electricity': { placed: categoryCounts['Energy & Electricity'] || 0, maxAllowed: 12 },
    'Engineering & Manufacturing': { placed: categoryCounts['Engineering & Manufacturing'] || 0, maxAllowed: 8 },
    'Transportation & Exploration': { placed: categoryCounts['Transportation & Exploration'] || 0, maxAllowed: 8 },
    'Waste & Recycling': { placed: categoryCounts['Waste & Recycling'] || 0, maxAllowed: 8 },
    'Recreation & Community': { placed: categoryCounts['Recreation & Community'] || 0, maxAllowed: 8 },
    'Security & Emergency': { placed: categoryCounts['Security & Emergency'] || 0, maxAllowed: 8 },
  };

  const podCaps: Record<string, { placed: number; maxAllowed: number }> = {};
  for (const pod of POD_MAP.values()) {
    const defaultMax = pod.isEssential ? 4 : 5;
    podCaps[pod.id] = {
      placed: podCounts[pod.id] || 0,
      maxAllowed: defaultMax,
    };
  }

  return {
    isInfiniteBudget: isInfinite,
    powerDemandKW: Math.round(powerDemandKW * 10) / 10,
    powerSupplyKW: Math.round(powerSupplyKW * 10) / 10,
    netPowerKW: Math.round((powerSupplyKW - powerDemandKW) * 10) / 10,
    solarSupplyKW: Math.round(solarSupplyKW * 10) / 10,
    continuousSupplyKW: Math.round(continuousSupplyKW * 10) / 10,
    batteryCapacityKWh,
    waterDemandL: Math.round(waterDemandL * 10) / 10,
    waterSupplyL: Math.round(waterSupplyL * 10) / 10,
    netWaterL: Math.round((waterSupplyL - waterDemandL) * 10) / 10,
    o2DemandKg: Math.round(o2DemandKg * 10) / 10,
    o2SupplyKg: Math.round(o2SupplyKg * 10) / 10,
    netO2Kg: Math.round((o2SupplyKg - o2DemandKg) * 10) / 10,
    foodSupplyKg: Math.round(foodSupplyKg * 10) / 10,
    foodDemandKg: Math.round(foodDemandKg * 10) / 10,
    co2ScrubCapacityKg: Math.round(co2ScrubCapacityKg * 10) / 10,
    co2ProductionKg: Math.round(co2ProductionKg * 10) / 10,
    wasteHandledKg: Math.round(wasteHandledKg * 10) / 10,
    wasteProducedKg: Math.round(wasteProducedKg * 10) / 10,
    scienceOutputPerDay,
    networkConnectedPercent: computeNetworkConnectivity(placedPods),
    totalMassKg,
    totalCostUSD,
    totalBaseSpendUSD,
    budgetRemainingUSD,
    launchCapacityKg,
    launchBudgetRemainingUSD,
    crewCapacity,
    categoryCaps,
    podCaps,
  };
}

export function getMissingEssentialPods(placedPods: PlacedPod[]): string[] {
  const placedIds = new Set(placedPods.map((p) => p.podId));
  return ESSENTIAL_POD_IDS.filter((id) => !placedIds.has(id));
}

export function canLaunchSimulation(placedPods: PlacedPod[]): {
  canLaunch: boolean;
  missingCount: number;
  missingPodNames: string[];
  missingIds: string[];
} {
  const missingIds = getMissingEssentialPods(placedPods);
  const missingPodNames = missingIds.map((id) => POD_MAP.get(id)?.name || id);
  return {
    canLaunch: missingIds.length === 0,
    missingCount: missingIds.length,
    missingPodNames,
    missingIds,
  };
}

export function generateBaseAdvisorWarnings(
  placedPods: PlacedPod[],
  telemetry: ResourceTelemetry,
  config?: MissionConfig
): AdvisorWarning[] {
  const warnings: AdvisorWarning[] = [];
  const placedIds = new Set(placedPods.map((p) => p.podId));

  const missingEssential = getMissingEssentialPods(placedPods);
  if (missingEssential.length > 0) {
    const missingNames = missingEssential.map((id) => POD_MAP.get(id)?.name || id).join(', ');
    warnings.push({
      id: 'missing-essential',
      type: 'critical',
      title: `Missing ${missingEssential.length} Essential Pod(s)`,
      message: `All 10 essential modules are required before running the simulation. Missing: ${missingNames}.`,
      suggestedAction: 'Place the missing essential modules from the Required tab.',
      relatedCategory: 'Essential',
    });
  }

  if (telemetry.netPowerKW < 0) {
    warnings.push({
      id: 'power-deficit',
      type: 'critical',
      title: 'Power Grid Deficit',
      message: `Demand exceeds capacity by ${Math.abs(telemetry.netPowerKW)} kW. Modules will lose power within days.`,
      suggestedAction: 'Add a Nuclear Power Pod or Solar Power Array.',
      relatedCategory: 'Energy & Electricity',
    });
  } else if (telemetry.netPowerKW < 15 && telemetry.powerDemandKW > 0) {
    warnings.push({
      id: 'power-low-margin',
      type: 'warning',
      title: 'Tight Power Reserve',
      message: `Surplus is only ${telemetry.netPowerKW} kW. Dust storms can reduce solar output by up to 60%.`,
      suggestedAction: 'Add Battery Storage or extra nuclear/solar capacity.',
      relatedCategory: 'Energy & Electricity',
    });
  }

  const hasSolar = placedIds.has('solar_power_pod');
  const hasBattery = placedIds.has('battery_storage_pod');
  const hasNuclear = placedIds.has('power_generation_pod') || placedIds.has('nuclear_power_pod');
  if (hasSolar && !hasBattery && !hasNuclear) {
    warnings.push({
      id: 'solar-no-storage',
      type: 'warning',
      title: 'Solar Without Night Storage',
      message: 'Solar arrays produce 0 kW during the 12.3-hour Martian night without batteries or nuclear power.',
      suggestedAction: 'Add a Battery Storage Pod or Nuclear SMR.',
      relatedCategory: 'Energy & Electricity',
    });
  }

  if (telemetry.netO2Kg < 0) {
    warnings.push({
      id: 'o2-deficit',
      type: 'critical',
      title: 'Oxygen Depletion',
      message: `Base consumes ${Math.abs(telemetry.netO2Kg)} kg/day more O₂ than it produces.`,
      suggestedAction: 'Add an Oxygen Generation Pod or Greenhouses.',
      relatedCategory: 'Life Support',
    });
  }

  if (telemetry.netWaterL < 0) {
    warnings.push({
      id: 'water-deficit',
      type: 'critical',
      title: 'Water Deficit',
      message: `Colony drains water reserves at ${Math.abs(telemetry.netWaterL)} L/day.`,
      suggestedAction: 'Add a Water Recycling Pod or Water Extraction Pod.',
      relatedCategory: 'Life Support',
    });
  }

  if (telemetry.foodSupplyKg < telemetry.foodDemandKg) {
    const deficit = Math.round((telemetry.foodDemandKg - telemetry.foodSupplyKg) * 10) / 10;
    warnings.push({
      id: 'food-deficit',
      type: 'warning',
      title: 'Food Output Deficit',
      message: `Crop yield is short by ${deficit} kg/day, drawing down stored rations.`,
      suggestedAction: 'Add Greenhouse, Hydroponics, or Aeroponics modules.',
      relatedCategory: 'Food & Agriculture',
    });
  }

  const hasAgri = placedIds.has('greenhouse_pod') || placedIds.has('hydroponics_pod') || placedIds.has('aeroponics_pod');
  const hasWaterRecycling = placedIds.has('water_pod') || placedIds.has('water_purification_pod');
  if (hasAgri && !hasWaterRecycling) {
    warnings.push({
      id: 'agri-water-leak',
      type: 'warning',
      title: 'Unclosed Agricultural Water Loop',
      message: 'Crops transpire high moisture; add Water Recycling or Humidity Control to prevent loss.',
      suggestedAction: 'Add a Water Recycling Pod or Humidity Control Pod.',
      relatedCategory: 'Life Support',
    });
  }

  if (telemetry.co2ScrubCapacityKg < telemetry.co2ProductionKg) {
    warnings.push({
      id: 'co2-buildup',
      type: 'warning',
      title: 'Insufficient CO₂ Scrubbing',
      message: `Crew exhales ${telemetry.co2ProductionKg} kg/d CO₂ while scrubbing is ${telemetry.co2ScrubCapacityKg} kg/d.`,
      suggestedAction: 'Add a Carbon Dioxide Removal Pod.',
      relatedCategory: 'Life Support',
    });
  }

  const targetCrew = config?.crewSize || 4;
  if (telemetry.crewCapacity < targetCrew && placedPods.length > 0) {
    warnings.push({
      id: 'insufficient-berthing',
      type: 'warning',
      title: 'Insufficient Crew Berths',
      message: `Crew size is ${targetCrew}, but habitat modules only berth ${telemetry.crewCapacity}.`,
      suggestedAction: 'Add another Main Living Pod.',
      relatedCategory: 'Essential',
    });
  }

  if (placedPods.length > 1 && telemetry.networkConnectedPercent < 100) {
    warnings.push({
      id: 'isolated-modules',
      type: 'info',
      title: 'Disconnected Modules',
      message: `${telemetry.networkConnectedPercent}% of modules are connected via pressurized corridors.`,
      suggestedAction: 'Place pods on adjacent tiles to auto-link airlock tunnels.',
    });
  }

  if (!telemetry.isInfiniteBudget) {
    if (telemetry.budgetRemainingUSD < 0) {
      warnings.push({
        id: 'budget-exceeded',
        type: 'warning',
        title: 'Construction Budget Exceeded',
        message: `Construction cost exceeds allocation by $${Math.abs(telemetry.budgetRemainingUSD).toLocaleString()}.`,
        suggestedAction: 'Remove optional modules or enable Uncapped Budget.',
      });
    }

    if (telemetry.launchBudgetRemainingUSD < 0) {
      warnings.push({
        id: 'launch-mass-overrun',
        type: 'warning',
        title: 'Launch Mass Exceeded',
        message: `Equipment mass (${telemetry.totalMassKg.toLocaleString()} kg) exceeds launch allocation.`,
        suggestedAction: 'Reduce heavy modules or enable Uncapped Budget.',
        relatedCategory: 'Transportation & Exploration',
      });
    }
  }

  return warnings;
}

export function run30DaySimulation(placedPods: PlacedPod[], config: MissionConfig): SimulationResult {
  const missingCheck = canLaunchSimulation(placedPods);
  const telemetry = calculateTelemetry(placedPods, config);
  const placedIds = new Set(placedPods.map((p) => p.podId));

  if (!missingCheck.canLaunch) {
    return {
      passed: false,
      grade: 'F',
      habitabilityScore: 12,
      daysSurviving: 0,
      totalDays: 30,
      failureReason: {
        day: 0,
        subsystem: 'Prerequisites',
        summary: `Missing ${missingCheck.missingCount} mandatory Essential Pod(s): ${missingCheck.missingPodNames.join(', ')}.`,
        whyItFailed: `A Martian colony cannot pass pre-launch flight certification until all 10 core survival modules are deployed on the surface pad.`,
        whatIsNeeded: `Deploy the remaining ${missingCheck.missingCount} required module(s) from the Required dock tab before running the 30-day endurance test.`,
        recommendedPodIds: missingCheck.missingIds.slice(0, 3),
      },
      criticalFailures: [
        `Base certification halted: Missing ${missingCheck.missingCount} mandatory Essential Pods: ${missingCheck.missingPodNames.join(', ')}.`,
      ],
      scienceYieldTotal: 0,
      networkConnectivityPct: telemetry.networkConnectedPercent,
      finalReserves: { o2Kg: 0, waterL: 0, foodKg: 0, batteryKWh: 0, co2KPa: 0.4 },
      telemetrySnapshot: telemetry,
      systemBreakdown: {
        powerReliability: 0,
        oxygenStability: 0,
        waterReserve: 0,
        foodSustainability: 0,
        lifeSupportIntegrity: 0,
        crewMorale: 10,
      },
      actionableSteps: [
        'Place all 10 Essential Pods from the Required tab.',
        'Ensure power generation exceeds baseline consumption.',
      ],
      logs: [],
    };
  }

  const logs: DailySimulationLog[] = [];
  const criticalFailures: string[] = [];
  let failureReason: SimulationFailureReason | null = null;

  const hasRecreation = placedPods.some((p) => POD_MAP.get(p.podId)?.category === 'Recreation & Community');
  const hasThermalCtrl = placedIds.has('temp_control_pod') || placedIds.has('thermal_radiator_pod');
  const hasRadShield = placedIds.has('radiation_monitoring_pod') || placedIds.has('radiation_shield_pod');
  const hasBattery = telemetry.batteryCapacityKWh > 0;
  const crewCount = Math.max(1, Math.min(7, config.crewSize || 4));
  const berthingDeficit = Math.max(0, crewCount - telemetry.crewCapacity);

  // Physical reserves
  const o2MaxKg = 150 + (placedIds.has('storage_pod') ? 40 : 0);
  const waterMaxL = 600 + (placedIds.has('storage_pod') ? 150 : 0);
  const foodMaxKg = 300 + (placedIds.has('food_storage_pod') ? 180 : 0);

  let o2TankKg = 150;
  let waterTankL = 600;
  let foodPantryKg = 300;
  let batteryChargeKWh = telemetry.batteryCapacityKWh;
  let co2KPa = 0.4; // nominal 0.40 kPa, dangerous >= 1.50 kPa
  let cumulativeRadiationMSv = 0;

  let powerHealth = 100;
  let lifeSupportHealth = 100;
  let crewMorale = Math.max(70, 95 - berthingDeficit * 6 + (hasRecreation ? 4 : 0));
  let scienceYieldTotal = 0;

  let passed = true;
  let daysSurviving = 30;

  const siteAvgTemp = config.landingSite?.avgTempC ?? -60;
  const siteDustPenalty =
    config.landingSite?.dustRisk === 'High'
      ? 0.85
      : config.landingSite?.dustRisk === 'Low'
      ? 1.2
      : 1.0;

  for (let day = 1; day <= 30; day++) {
    let tempC = siteAvgTemp + Math.sin(day * 0.4) * 14;
    let solarMultiplier = 1.0;
    let radiationDose = 0.65; // baseline Mars surface GCR mSv/day
    let dailyLogType: DailySimulationLog['type'] = 'normal';
    let logTitle = `Sol ${day}: Nominal Operations`;
    let logDesc = `Cabin pressure 101.3 kPa, interior 21°C. All loops operating within nominal tolerances.`;

    if (day === 4) {
      logTitle = `Sol 4: Peak Solar Alignment`;
      logDesc = `Clear atmospheric window boosts photovoltaic yield by 15%.`;
      dailyLogType = 'success';
      solarMultiplier = 1.15;
      crewMorale = Math.min(100, crewMorale + 2);
    } else if (day === 9) {
      logTitle = `Sol 9: Localized Dust Devil`;
      logDesc = `Convective vortex passed 380m north; electrostatic array cleaners engaged.`;
      dailyLogType = 'event';
      solarMultiplier = 0.92;
    } else if (day === 14) {
      logTitle = `Sol 14: Regional Dust Storm Arrival`;
      logDesc = `Atmospheric optical depth τ = 1.8. Solar irradiance reduced by dust haze.`;
      dailyLogType = 'hazard';
      solarMultiplier = Math.min(0.7, 0.45 * siteDustPenalty);
      tempC -= 12;
    } else if (day === 15) {
      logTitle = `Sol 15: Dust Storm Peak`;
      logDesc = `Dense dust veil cuts solar generation. Colony relying on nuclear & battery reserve.`;
      dailyLogType = 'hazard';
      solarMultiplier = Math.min(0.65, 0.40 * siteDustPenalty);
      tempC -= 16;
    } else if (day === 16) {
      logTitle = `Sol 16: Storm Subsiding`;
      logDesc = `Particulates settling; solar arrays recovering output.`;
      dailyLogType = 'event';
      solarMultiplier = Math.min(0.95, 0.80 * siteDustPenalty);
      tempC -= 6;
    } else if (day === 21) {
      logTitle = `Sol 21: Hydroponic Harvest`;
      logDesc = `First full crop rotation harvested (+12 kg fresh produce bonus to pantry).`;
      dailyLogType = 'success';
      if (telemetry.foodSupplyKg > 0) {
        foodPantryKg = Math.min(foodMaxKg, foodPantryKg + 12);
      }
      crewMorale = Math.min(100, crewMorale + 5);
    } else if (day === 25) {
      logTitle = `Sol 25: Coronal Mass Ejection (SPE)`;
      logDesc = `Solar particle event detected. Crew sheltered in regolith-shielded vault.`;
      dailyLogType = 'hazard';
      radiationDose = hasRadShield ? 2.2 : 4.5;
      if (!hasThermalCtrl) tempC -= 8;
    } else if (day === 30) {
      logTitle = `Sol 30: Endurance Trial Complete`;
      logDesc = `30-day planetary certification cycle finished cleanly.`;
      dailyLogType = 'success';
    }

    cumulativeRadiationMSv += radiationDose;

    // Effective power: nuclear/continuous unaffected by dust; solar scales by solarMultiplier
    const effectivePowerGen = telemetry.continuousSupplyKW + telemetry.solarSupplyKW * solarMultiplier;
    let dailyNetPower = Math.round((effectivePowerGen - telemetry.powerDemandKW) * 10) / 10;

    // Battery buffering during temporary storm deficits
    if (dailyNetPower < 0 && batteryChargeKWh > 0) {
      const kwhNeeded = Math.abs(dailyNetPower) * 12; // 12h peak/night buffer
      const drawn = Math.min(batteryChargeKWh, kwhNeeded);
      batteryChargeKWh -= drawn;
      dailyNetPower = Math.round((dailyNetPower + drawn / 12) * 10) / 10;
    } else if (dailyNetPower > 0 && hasBattery) {
      batteryChargeKWh = Math.min(telemetry.batteryCapacityKWh, batteryChargeKWh + dailyNetPower * 8);
    }

    const failOnDay = (
      subsystem: SimulationFailureReason['subsystem'],
      message: string,
      whyItFailed: string,
      whatIsNeeded: string,
      recommendedPodIds: string[]
    ) => {
      if (!passed) return;
      passed = false;
      daysSurviving = day;
      dailyLogType = 'failure';
      logTitle = `Sol ${day}: ${subsystem} Failure`;
      logDesc = message;
      failureReason = {
        day,
        subsystem,
        summary: message,
        whyItFailed,
        whatIsNeeded,
        recommendedPodIds,
      };
      criticalFailures.push(`Day ${day}: ${message}`);
    };

    if (dailyNetPower < 0) {
      const severity = Math.min(28, Math.max(8, Math.abs(dailyNetPower) * 0.25));
      powerHealth = Math.max(0, powerHealth - severity);
      if (powerHealth <= 0) {
        const deficitKw = Math.abs(dailyNetPower).toFixed(1);
        const stormNote =
          day >= 14 && day <= 16
            ? ' During the Sol 14–16 regional dust storm, solar irradiance drops sharply, exposing insufficient nuclear baseload or battery reserves.'
            : ' Total electrical demand exceeds your continuous generation capacity.';
        failOnDay(
          'Power',
          `Electrical blackout (${dailyNetPower} kW deficit). Life support circulation lost.`,
          `Your colony suffered a -${deficitKw} kW power shortfall on Sol ${day}.${stormNote} When grid health reaches 0%, oxygen and water life-support pumps lose power.`,
          `Add at least +${Math.ceil(Math.abs(dailyNetPower) + 25)} kW of continuous power or Battery Storage (250 kWh) so storm and night loads stay online.`,
          ['power_generation_pod', 'battery_storage_pod', 'nuclear_power_pod']
        );
      }
    } else {
      powerHealth = Math.min(100, powerHealth + 3);
    }

    // Oxygen (reduced generation if powerHealth severely degraded)
    const powerFactor = powerHealth < 40 ? 0.5 : 1.0;
    const effectiveO2Net = telemetry.o2SupplyKg * powerFactor - telemetry.o2DemandKg;
    o2TankKg = Math.min(o2MaxKg, o2TankKg + effectiveO2Net);
    if (o2TankKg <= 0) {
      o2TankKg = 0;
      const lossKg = Math.abs(effectiveO2Net).toFixed(1);
      failOnDay(
        'Oxygen',
        `Oxygen reserves exhausted (${effectiveO2Net.toFixed(1)} kg/d net loss).`,
        `Your ${crewCount}-astronaut crew and habitats consume ${telemetry.o2DemandKg} kg/day of O₂, leaving a net drain of -${lossKg} kg/day${powerFactor < 1 ? ' (made worse by low grid power cutting O₂ output in half)' : ''}.`,
        `Generate at least +${Math.ceil(Math.abs(effectiveO2Net) + 4)} kg/day of extra oxygen using an Oxygen Generation Pod (+16 kg/d) or Greenhouse (+8 kg/d).`,
        ['oxygen_pod', 'greenhouse_pod', 'backup_life_support_pod']
      );
    }

    // Water
    const effectiveWaterNet = telemetry.waterSupplyL * powerFactor - telemetry.waterDemandL;
    waterTankL = Math.min(waterMaxL, waterTankL + effectiveWaterNet);
    if (waterTankL <= 0) {
      waterTankL = 0;
      const lossL = Math.abs(effectiveWaterNet).toFixed(1);
      failOnDay(
        'Water',
        `Water reserves depleted (${effectiveWaterNet.toFixed(1)} L/d net loss).`,
        `Habitats, crops, and crew draw ${telemetry.waterDemandL} L/day while recycling recovers ${telemetry.waterSupplyL} L/day, draining reserves by -${lossL} L/day until tanks hit zero on Sol ${day}.`,
        `Recover at least +${Math.ceil(Math.abs(effectiveWaterNet) + 15)} L/day by deploying a Water Recycling Pod (+90 L/d) or Water Extraction Pod.`,
        ['water_pod', 'water_extraction_pod', 'water_purification_pod']
      );
    }

    // Food
    const netFood = telemetry.foodSupplyKg - telemetry.foodDemandKg;
    foodPantryKg = Math.min(foodMaxKg, foodPantryKg + netFood);
    if (foodPantryKg <= 0) {
      foodPantryKg = 0;
      const deficitFood = Math.abs(netFood).toFixed(1);
      failOnDay(
        'Food',
        `Food rations exhausted (${netFood.toFixed(1)} kg/d net deficit).`,
        `Your ${crewCount}-person crew consumes ${telemetry.foodDemandKg} kg/day while colony farms yield ${telemetry.foodSupplyKg} kg/day, depleting the emergency pantry at -${deficitFood} kg/day.`,
        `Add at least +${Math.ceil(Math.abs(netFood) + 3)} kg/day of crop yield using Greenhouse (+15 kg/d), Aeroponics (+14 kg/d), or Hydroponics (+12 kg/d) modules.`,
        ['greenhouse_pod', 'aeroponics_pod', 'hydroponics_pod']
      );
    }

    // CO2 scrubbing
    const netCo2Excess = telemetry.co2ProductionKg - telemetry.co2ScrubCapacityKg;
    if (netCo2Excess > 0) {
      co2KPa = Math.min(2.2, co2KPa + netCo2Excess * 0.08);
      lifeSupportHealth = Math.max(0, lifeSupportHealth - Math.max(4, netCo2Excess * 2.5));
      if ((co2KPa >= 1.5 || lifeSupportHealth < 30)) {
        failOnDay(
          'CO₂ Scrubbing',
          `Cabin CO₂ reached ${co2KPa.toFixed(2)} kPa (hypercapnia limit exceeded).`,
          `The crew exhales ${telemetry.co2ProductionKg} kg/day of CO₂, exceeding your scrubber capacity (${telemetry.co2ScrubCapacityKg} kg/day) by +${netCo2Excess.toFixed(1)} kg/day and pushing cabin air past safe limits.`,
          `Add at least +${Math.ceil(netCo2Excess + 2)} kg/day of CO₂ scrubbing capacity with a Carbon Dioxide Removal Pod or secondary Oxygen Pod.`,
          ['co2_removal_pod', 'oxygen_pod', 'backup_life_support_pod']
        );
      }
    } else {
      co2KPa = Math.max(0.35, co2KPa - 0.04);
      lifeSupportHealth = Math.min(100, lifeSupportHealth + 1);
    }

    // Morale & Science accumulation
    if (telemetry.foodSupplyKg >= telemetry.foodDemandKg) crewMorale = Math.min(100, crewMorale + 0.6);
    if (hasRecreation) crewMorale = Math.min(100, crewMorale + 0.4);
    if (berthingDeficit > 0) crewMorale = Math.max(20, crewMorale - berthingDeficit * 1.2);
    if (dailyNetPower < 0) crewMorale = Math.max(10, crewMorale - 5);

    const connectivityFactor = 0.75 + (telemetry.networkConnectedPercent / 100) * 0.25;
    scienceYieldTotal += Math.round((telemetry.scienceOutputPerDay + 6) * connectivityFactor);

    logs.push({
      day,
      title: logTitle,
      description: logDesc,
      type: dailyLogType,
      o2Level: Math.max(0, Math.min(100, Math.round((o2TankKg / 150) * 100))),
      powerLevel: Math.round(powerHealth),
      waterLevel: Math.max(0, Math.min(100, Math.round((waterTankL / 600) * 100))),
      foodLevel: Math.max(0, Math.min(100, Math.round((foodPantryKg / 300) * 100))),
      moraleLevel: Math.round(crewMorale),
      o2KgRemaining: Math.round(o2TankKg * 10) / 10,
      waterLRemaining: Math.round(waterTankL * 10) / 10,
      foodKgRemaining: Math.round(foodPantryKg * 10) / 10,
      netPowerKW: dailyNetPower,
      co2KPa: Math.round(co2KPa * 100) / 100,
      radiationMSv: Math.round(cumulativeRadiationMSv * 10) / 10,
      solarMultiplier,
      temperatureC: Math.round(tempC),
    });

    if (!passed && daysSurviving === day) {
      break;
    }
  }

  const powerReliability = Math.max(0, Math.min(100, Math.round(powerHealth * (telemetry.netPowerKW >= 0 ? 1 : 0.4))));
  const oxygenStability = Math.max(0, Math.min(100, Math.round(Math.min(100, (o2TankKg / 150) * 100))));
  const waterReserve = Math.max(0, Math.min(100, Math.round(Math.min(100, (waterTankL / 600) * 100))));
  const foodSustainability = Math.max(
    0,
    Math.min(100, Math.round((telemetry.foodSupplyKg / Math.max(1, telemetry.foodDemandKg)) * 100))
  );
  const lifeSupportIntegrity = Math.max(0, Math.min(100, Math.round(lifeSupportHealth)));

  let habitabilityScore = Math.round(
    powerReliability * 0.25 +
      oxygenStability * 0.25 +
      waterReserve * 0.2 +
      lifeSupportIntegrity * 0.15 +
      foodSustainability * 0.1 +
      crewMorale * 0.05
  );

  if (!passed) {
    habitabilityScore = Math.min(48, Math.round((daysSurviving / 30) * 45));
  }

  const grade: SimulationResult['grade'] = !passed
    ? daysSurviving >= 20
      ? 'D'
      : 'F'
    : habitabilityScore >= 92
    ? 'S'
    : habitabilityScore >= 84
    ? 'A'
    : habitabilityScore >= 74
    ? 'B'
    : 'C';

  const actionableSteps: string[] = [];
  if (telemetry.netPowerKW < 20) {
    actionableSteps.push('Add a Nuclear Power Pod or Battery Storage Pod to sustain loads through 3-day dust storms.');
  }
  if (telemetry.netO2Kg < 5) {
    actionableSteps.push('Add a secondary Oxygen Generation Pod (MOXIE) or Greenhouses for safe O₂ margin.');
  }
  if (telemetry.netWaterL < 15) {
    actionableSteps.push('Add a Water Recycling Pod or Water Extraction Pod to stabilize water reserves.');
  }
  if (telemetry.foodSupplyKg < telemetry.foodDemandKg) {
    actionableSteps.push('Expand Greenhouse, Hydroponics, or Aeroponics modules to reach 100% food self-sufficiency.');
  }
  if (telemetry.co2ScrubCapacityKg < telemetry.co2ProductionKg) {
    actionableSteps.push('Add a Carbon Dioxide Removal Pod to keep cabin CO₂ below 0.5 kPa.');
  }
  if (telemetry.networkConnectedPercent < 100) {
    actionableSteps.push('Place isolated modules adjacent to existing pods so pressurized tunnels link the entire colony.');
  }
  if (actionableSteps.length === 0) {
    actionableSteps.push('Colony loops are balanced. Expand with Science Laboratories, Observatories, or Rover Garages for higher research yield.');
  }

  return {
    passed,
    grade,
    habitabilityScore,
    daysSurviving,
    totalDays: 30,
    failureReason,
    criticalFailures,
    scienceYieldTotal,
    networkConnectivityPct: telemetry.networkConnectedPercent,
    finalReserves: {
      o2Kg: Math.round(o2TankKg * 10) / 10,
      waterL: Math.round(waterTankL * 10) / 10,
      foodKg: Math.round(foodPantryKg * 10) / 10,
      batteryKWh: Math.round(batteryChargeKWh),
      co2KPa: Math.round(co2KPa * 100) / 100,
    },
    telemetrySnapshot: telemetry,
    systemBreakdown: {
      powerReliability,
      oxygenStability,
      waterReserve,
      foodSustainability,
      lifeSupportIntegrity,
      crewMorale: Math.round(crewMorale),
    },
    actionableSteps,
    logs,
  };
}
