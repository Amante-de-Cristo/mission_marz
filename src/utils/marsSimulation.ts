import { PlacedPod, MissionConfig, ResourceTelemetry, AdvisorWarning, SimulationResult, DailySimulationLog } from '../types';
import { POD_MAP, ESSENTIAL_POD_IDS } from './podCatalog';

export function calculateTelemetry(placedPods: PlacedPod[], config: MissionConfig): ResourceTelemetry {
  let powerDemandKW = 0;
  let powerSupplyKW = 0;
  let waterDemandL = 0;
  let waterSupplyL = 0;
  let o2DemandKg = 0;
  let o2SupplyKg = 0;
  let foodSupplyKg = 0;
  let co2ScrubCapacityKg = 0;
  let wasteHandledKg = 0;
  let totalMassKg = 0;
  let totalCostUSD = 0;
  let crewCapacity = 0;

  // Initialize category counts & caps
  const categoryCounts: Record<string, number> = {};
  const podCounts: Record<string, number> = {};

  // Baseline crew metabolic demands scaled to selected crew size (1 to 7 astronauts, default 4)
  const crewCount = Math.max(1, Math.min(7, config.crewSize || 4));
  const crewO2NeedKg = crewCount * 0.84; // 0.84 kg O2/day/person
  const crewWaterNeedL = crewCount * 3.6; // 3.6 L/day/person
  const crewFoodNeedKg = crewCount * 1.8; // 1.8 kg food/day/person
  const crewCO2OutputKg = crewCount * 1.0; // 1.0 kg CO2/day/person
  const crewWasteOutputKg = crewCount * 1.5; // 1.5 kg waste/day/person

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

    // Power
    if (pod.powerKW > 0) {
      powerDemandKW += pod.powerKW;
    } else {
      powerSupplyKW += Math.abs(pod.powerKW);
    }

    // Water
    if (pod.waterRate > 0) {
      waterDemandL += pod.waterRate;
    } else {
      waterSupplyL += Math.abs(pod.waterRate);
    }

    // Oxygen
    if (pod.o2Rate > 0) {
      o2DemandKg += pod.o2Rate;
    } else {
      o2SupplyKg += Math.abs(pod.o2Rate);
    }

    // Food
    if (pod.foodRate && pod.foodRate < 0) {
      foodSupplyKg += Math.abs(pod.foodRate);
    }

    // CO2 Scrubbing
    if (pod.co2ScrubKg) {
      co2ScrubCapacityKg += pod.co2ScrubKg;
    }

    // Waste
    if (pod.wasteCapacityKg) {
      wasteHandledKg += pod.wasteCapacityKg;
    }
  }

  const isInfinite = config.isInfiniteBudget ?? true;
  const launchCostSpent = totalMassKg * config.costPerKg;
  const totalBaseSpendUSD = totalCostUSD + launchCostSpent;

  const budgetRemainingUSD = isInfinite ? 999999999999 : config.constructionBudget - totalCostUSD;
  const launchCapacityKg = isInfinite ? 9999999 : Math.floor(config.launchBudget / config.costPerKg);
  const launchBudgetRemainingUSD = isInfinite ? 999999999999 : config.launchBudget - launchCostSpent;

  // Build category caps
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
} {
  const missingIds = getMissingEssentialPods(placedPods);
  const missingPodNames = missingIds.map((id) => POD_MAP.get(id)?.name || id);
  return {
    canLaunch: missingIds.length === 0,
    missingCount: missingIds.length,
    missingPodNames,
  };
}

export function generateBaseAdvisorWarnings(
  placedPods: PlacedPod[],
  telemetry: ResourceTelemetry,
  config?: MissionConfig
): AdvisorWarning[] {
  const warnings: AdvisorWarning[] = [];
  const placedIds = new Set(placedPods.map((p) => p.podId));

  // 1. Essential Check
  const missingEssential = getMissingEssentialPods(placedPods);
  if (missingEssential.length > 0) {
    const missingNames = missingEssential.map((id) => POD_MAP.get(id)?.name || id).join(', ');
    warnings.push({
      id: 'missing-essential',
      type: 'critical',
      title: `Missing ${missingEssential.length} Essential Pod(s)`,
      message: `The base cannot be certified for colonization until all 10 essential modules are constructed. Missing: ${missingNames}.`,
      suggestedAction: 'Deploy the missing essential pods from the catalog.',
      relatedCategory: 'Essential',
    });
  }

  // 2. Power Deficit
  if (telemetry.netPowerKW < 0) {
    warnings.push({
      id: 'power-deficit',
      type: 'critical',
      title: 'Power Grid Overload Deficit',
      message: `Demand exceeds capacity by ${Math.abs(telemetry.netPowerKW)} kW. Critical life support units face immediate rolling blackouts.`,
      suggestedAction: 'Deploy a Nuclear Power Pod or Solar Power Pod.',
      relatedCategory: 'Energy & Electricity',
    });
  } else if (telemetry.netPowerKW < 15 && telemetry.powerDemandKW > 0) {
    warnings.push({
      id: 'power-low-margin',
      type: 'warning',
      title: 'Low Power Operating Margin',
      message: `Operating reserve is only ${telemetry.netPowerKW} kW. A dust storm could plunge the colony into emergency power shedding.`,
      suggestedAction: 'Add Battery Storage or additional solar/nuclear capacity.',
      relatedCategory: 'Energy & Electricity',
    });
  }

  // 3. Solar without battery storage
  const hasSolar = placedIds.has('solar_power_pod');
  const hasBattery = placedIds.has('battery_storage_pod');
  const hasNuclear = placedIds.has('power_generation_pod') || placedIds.has('nuclear_power_pod');
  if (hasSolar && !hasBattery && !hasNuclear) {
    warnings.push({
      id: 'solar-no-storage',
      type: 'warning',
      title: 'Solar Grid Without Night Storage',
      message: 'Solar arrays will generate 0 kW during the 12.3-hour Martian night without battery storage or nuclear baseline.',
      suggestedAction: 'Add a Battery Storage Pod or Nuclear SMR to buffer nighttime loads.',
      relatedCategory: 'Energy & Electricity',
    });
  }

  // 4. Oxygen Deficit
  if (telemetry.netO2Kg < 0) {
    warnings.push({
      id: 'o2-deficit',
      type: 'critical',
      title: 'Atmospheric Oxygen Depletion',
      message: `Base consumes ${Math.abs(telemetry.netO2Kg)} kg/day more oxygen than generation modules produce.`,
      suggestedAction: 'Deploy an Oxygen Generation Pod (MOXIE) or Greenhouses.',
      relatedCategory: 'Life Support',
    });
  }

  // 5. Water Deficit
  if (telemetry.netWaterL < 0) {
    warnings.push({
      id: 'water-deficit',
      type: 'critical',
      title: 'Net Negative Water Balance',
      message: `Colony is draining reserves at ${Math.abs(telemetry.netWaterL)} L/day.`,
      suggestedAction: 'Deploy a Water Extraction Pod (Rodriguez Well) or Water Recovery Pod.',
      relatedCategory: 'Life Support',
    });
  }

  // 6. Food Production vs Demand
  if (telemetry.foodSupplyKg < telemetry.foodDemandKg) {
    const deficit = Math.round((telemetry.foodDemandKg - telemetry.foodSupplyKg) * 10) / 10;
    warnings.push({
      id: 'food-deficit',
      type: 'warning',
      title: 'Crop Deficit (Ration Dependent)',
      message: `Agricultural output is short by ${deficit} kg/day. The crew is currently consuming stored freeze-dried reserves.`,
      suggestedAction: 'Expand with Greenhouse, Hydroponics, or Aeroponics Pods.',
      relatedCategory: 'Food & Agriculture',
    });
  }

  // 7. Agriculture without Water Recycling
  const hasAgri = placedIds.has('greenhouse_pod') || placedIds.has('hydroponics_pod') || placedIds.has('aeroponics_pod');
  const hasWaterRecycling = placedIds.has('water_pod') || placedIds.has('water_purification_pod');
  if (hasAgri && !hasWaterRecycling) {
    warnings.push({
      id: 'agri-water-leak',
      type: 'warning',
      title: 'Agricultural Loops Unclosed',
      message: 'Crops evaporate high volumes of humidity. Without dedicated water recycling/purification, moisture is lost.',
      suggestedAction: 'Build a Water Recycling Pod or Humidity Control Pod.',
      relatedCategory: 'Life Support',
    });
  }

  // 8. CO2 Scrubbing
  if (telemetry.co2ScrubCapacityKg < telemetry.co2ProductionKg) {
    warnings.push({
      id: 'co2-buildup',
      type: 'warning',
      title: 'Inadequate Carbon Dioxide Scrubbing',
      message: `Crew outputs ${telemetry.co2ProductionKg} kg CO2/day but base scrubbing is ${telemetry.co2ScrubCapacityKg} kg/day. Hypercapnia risk.`,
      suggestedAction: 'Deploy a Carbon Dioxide Removal Pod or Air Filtration Pod.',
      relatedCategory: 'Life Support',
    });
  }

  // 9. Crew Living Quarters Check
  const targetCrew = config?.crewSize || 4;
  if (telemetry.crewCapacity < targetCrew && placedPods.length > 0) {
    warnings.push({
      id: 'insufficient-berthing',
      type: 'warning',
      title: 'Insufficient Crew Berthing Quarters',
      message: `Mission crew size is ${targetCrew} astronauts, but current habitat berths only support ${telemetry.crewCapacity}.`,
      suggestedAction: 'Add an additional Main Living Pod or Crew Quarters.',
      relatedCategory: 'Essential',
    });
  }

  // 10. Budget & Launch Overruns (Only active when manual budget is selected)
  if (!telemetry.isInfiniteBudget) {
    if (telemetry.budgetRemainingUSD < 0) {
      warnings.push({
        id: 'budget-exceeded',
        type: 'warning',
        title: 'Construction Budget Overrun',
        message: `Base construction cost has exceeded allocated funds by $${Math.abs(telemetry.budgetRemainingUSD).toLocaleString()}.`,
        suggestedAction: 'Demolish non-essential pods or switch to Infinite Budget.',
      });
    }

    if (telemetry.launchBudgetRemainingUSD < 0) {
      warnings.push({
        id: 'launch-mass-overrun',
        type: 'warning',
        title: 'Rocket Launch Payload Exceeded',
        message: `Total equipment mass (${telemetry.totalMassKg.toLocaleString()} kg) exceeds the allocated rocket lift budget.`,
        suggestedAction: 'Streamline heavy structural components or switch to Infinite Budget.',
        relatedCategory: 'Transportation & Exploration',
      });
    }
  }


  return warnings;
}

export function run30DaySimulation(placedPods: PlacedPod[], config: MissionConfig): SimulationResult {
  const missingCheck = canLaunchSimulation(placedPods);
  const telemetry = calculateTelemetry(placedPods, config);

  if (!missingCheck.canLaunch) {
    return {
      passed: false,
      habitabilityScore: 12,
      daysSurviving: 0,
      totalDays: 30,
      criticalFailures: [
        `Base certification halted: Missing ${missingCheck.missingCount} mandatory Essential Pods: ${missingCheck.missingPodNames.join(', ')}.`,
      ],
      systemBreakdown: {
        powerReliability: 0,
        oxygenStability: 0,
        waterReserve: 0,
        foodSustainability: 0,
        lifeSupportIntegrity: 0,
        crewMorale: 10,
      },
      actionableSteps: [
        'Place all 10 Essential Pods from the Essential category.',
        'Ensure power generation exceeds baseline consumption.',
      ],
      logs: [],
    };
  }

  const logs: DailySimulationLog[] = [];
  const criticalFailures: string[] = [];

  // Simulated storage tanks
  let o2TankKg = 150; // buffer in reserve
  let waterTankL = 600; // buffer in reserve
  let foodPantryKg = 300; // rations buffer
  let powerHealth = 100;
  let lifeSupportHealth = 100;
  let crewMorale = 95;

  let passed = true;
  let daysSurviving = 30;

  for (let day = 1; day <= 30; day++) {
    // Environmental factors
    let tempC = -60 + Math.sin(day * 0.4) * 15;
    let solarMultiplier = 1.0;
    let dailyLogType: 'normal' | 'event' | 'hazard' | 'success' = 'normal';
    let logTitle = `Sol ${day}: Normal Operations`;
    let logDesc = `Atmospheric pressure 101.3 kPa, cabin temp 21°C. Systems nominal.`;

    // Dynamic simulated events
    if (day === 4) {
      logTitle = `Sol 4: Perihelion Solar Optimal`;
      logDesc = `Martian orbital alignment yields peak photon flux for solar arrays.`;
      dailyLogType = 'success';
      crewMorale = Math.min(100, crewMorale + 2);
    } else if (day === 9) {
      logTitle = `Sol 9: Localized Dust Devil`;
      logDesc = `Vortex tracked 400m north. Minor fine particulate deposition on exterior seals.`;
      dailyLogType = 'event';
    } else if (day === 14) {
      logTitle = `Sol 14: Regional Dust Storm Inbound`;
      logDesc = `High-altitude dust veil reducing atmospheric opacity (tau = 1.8). Solar flux dropped 55%.`;
      dailyLogType = 'hazard';
      solarMultiplier = 0.45;
    } else if (day === 15) {
      logTitle = `Sol 15: Dust Storm Peak`;
      logDesc = `Dust storm persisting. Relying heavily on nuclear and battery storage.`;
      dailyLogType = 'hazard';
      solarMultiplier = 0.4;
    } else if (day === 16) {
      logTitle = `Sol 16: Atmospheric Dust Settling`;
      logDesc = `Skies clearing. Automated electrostatic dust sweepers activated.`;
      dailyLogType = 'event';
      solarMultiplier = 0.8;
    } else if (day === 21) {
      logTitle = `Sol 21: Agricultural Harvest Milestone`;
      logDesc = `First crop cycle yielding fresh sweet potato greens and dwarf wheat.`;
      dailyLogType = 'success';
      crewMorale = Math.min(100, crewMorale + 5);
    } else if (day === 25) {
      logTitle = `Sol 25: Solar Flare / Coronal Mass Ejection Alert`;
      logDesc = `DSOC telemetry warns of CME particle front. Crew temporarily mustered near radiation shelter.`;
      dailyLogType = 'hazard';
    } else if (day === 30) {
      logTitle = `Sol 30: 30-Day Sol Cycle Concluded`;
      logDesc = `Colony operational endurance window completed. Final health diagnostics logged.`;
      dailyLogType = 'success';
    }

    // Daily Resource Delta
    const effectivePowerGen = telemetry.powerSupplyKW * solarMultiplier;
    const dailyNetPower = effectivePowerGen - telemetry.powerDemandKW;

    if (dailyNetPower < 0) {
      powerHealth = Math.max(0, powerHealth - 8);
      if (powerHealth <= 0 && passed) {
        passed = false;
        daysSurviving = day;
        criticalFailures.push(`Day ${day}: Complete electrical blackout. Life support circulation shut down.`);
      }
    } else {
      powerHealth = Math.min(100, powerHealth + 2);
    }

    // Oxygen
    o2TankKg += telemetry.netO2Kg;
    if (o2TankKg <= 0 && passed) {
      passed = false;
      daysSurviving = day;
      criticalFailures.push(`Day ${day}: Oxygen reserve exhausted. Hypoxia threshold crossed.`);
    }

    // Water
    waterTankL += telemetry.netWaterL;
    if (waterTankL <= 0 && passed) {
      passed = false;
      daysSurviving = day;
      criticalFailures.push(`Day ${day}: Water recycling deficit drained reserve tanks dry.`);
    }

    // Food
    const netFood = telemetry.foodSupplyKg - telemetry.foodDemandKg;
    foodPantryKg += netFood;
    if (foodPantryKg <= 0 && passed) {
      passed = false;
      daysSurviving = day;
      criticalFailures.push(`Day ${day}: Food rations depleted.`);
    }

    // CO2 buildup
    if (telemetry.co2ScrubCapacityKg < telemetry.co2ProductionKg) {
      lifeSupportHealth = Math.max(0, lifeSupportHealth - 3);
      if (lifeSupportHealth < 30 && passed) {
        passed = false;
        daysSurviving = day;
        criticalFailures.push(`Day ${day}: Dangerous hypercapnia (CO2 > 1.5 kPa) due to inadequate scrubbing.`);
      }
    }

    // Crew Morale
    if (telemetry.foodSupplyKg > 5) crewMorale = Math.min(100, crewMorale + 0.5);
    if (telemetry.netPowerKW < 0) crewMorale = Math.max(10, crewMorale - 5);

    logs.push({
      day,
      title: logTitle,
      description: logDesc,
      type: dailyLogType,
      o2Level: Math.max(0, Math.min(100, Math.round((o2TankKg / 150) * 100))),
      powerLevel: Math.round(powerHealth),
      waterLevel: Math.max(0, Math.min(100, Math.round((waterTankL / 600) * 100))),
      temperatureC: Math.round(tempC),
    });

    if (!passed && daysSurviving === day) {
      break;
    }
  }

  // System Breakdown calculations
  const powerReliability = Math.max(0, Math.min(100, Math.round(powerHealth * (telemetry.netPowerKW >= 0 ? 1 : 0.4))));
  const oxygenStability = Math.max(0, Math.min(100, Math.round(Math.min(100, (o2TankKg / 150) * 100))));
  const waterReserve = Math.max(0, Math.min(100, Math.round(Math.min(100, (waterTankL / 600) * 100))));
  const foodSustainability = Math.max(
    0,
    Math.min(100, Math.round((telemetry.foodSupplyKg / Math.max(1, telemetry.foodDemandKg)) * 100))
  );
  const lifeSupportIntegrity = Math.max(0, Math.min(100, Math.round(lifeSupportHealth)));

  // Habitability Score (0 - 100)
  let habitabilityScore = Math.round(
    powerReliability * 0.25 +
      oxygenStability * 0.25 +
      waterReserve * 0.2 +
      lifeSupportIntegrity * 0.15 +
      foodSustainability * 0.1 +
      crewMorale * 0.05
  );

  if (!passed) {
    habitabilityScore = Math.min(48, habitabilityScore);
  }

  const actionableSteps: string[] = [];
  if (telemetry.netPowerKW < 20) {
    actionableSteps.push('Add an extra Nuclear Power Pod or Battery Storage Pod to weather severe 3-day dust storms.');
  }
  if (telemetry.netO2Kg < 5) {
    actionableSteps.push('Construct a secondary Oxygen Generation Pod (MOXIE) or Greenhouses for positive surplus.');
  }
  if (telemetry.foodSupplyKg < telemetry.foodDemandKg) {
    actionableSteps.push('Expand Hydroponics or Aeroponics to attain 100% caloric food self-sufficiency.');
  }
  if (telemetry.co2ScrubCapacityKg < telemetry.co2ProductionKg) {
    actionableSteps.push('Deploy a dedicated Carbon Dioxide Removal Pod with amine vacuum desorption beds.');
  }
  if (actionableSteps.length === 0) {
    actionableSteps.push('Base architecture is highly optimized! Consider adding Science Laboratories and Rover Garages for surface exploration.');
  }

  return {
    passed,
    habitabilityScore,
    daysSurviving,
    totalDays: 30,
    criticalFailures,
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
