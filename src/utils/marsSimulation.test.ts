import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTelemetry,
  canLaunchSimulation,
  computeNetworkConnectivity,
  getMissingEssentialPods,
  run30DaySimulation,
} from './marsSimulation';
import { PRESET_MARS_BASE } from './podCatalog';
import { deriveLandingSiteFromLatLon, PRESET_MARS_SITES } from './marsSites';
import { MissionConfig, PlacedPod } from '../types';

const testConfig: MissionConfig = {
  isInfiniteBudget: false,
  constructionBudget: 25000000000,
  launchBudget: 15000000000,
  costPerKg: 15000,
  crewSize: 4,
};


test('canLaunchSimulation returns false when pods are missing', () => {
  const emptyBase: PlacedPod[] = [];
  const check = canLaunchSimulation(emptyBase);
  assert.equal(check.canLaunch, false);
  assert.equal(check.missingCount, 10);
});

test('getMissingEssentialPods identifies exact missing pods', () => {
  const partialBase: PlacedPod[] = [
    { instanceId: '1', podId: 'living_pod', gridX: 0, gridZ: 0, rotation: 0, placedAt: 1 },
    { instanceId: '2', podId: 'oxygen_pod', gridX: 1, gridZ: 0, rotation: 0, placedAt: 2 },
  ];
  const missing = getMissingEssentialPods(partialBase);
  assert.equal(missing.length, 8);
  assert.ok(!missing.includes('living_pod'));
  assert.ok(!missing.includes('oxygen_pod'));
  assert.ok(missing.includes('water_pod'));
});

test('Preset base satisfies all 10 essential pods requirement', () => {
  const presetPods: PlacedPod[] = PRESET_MARS_BASE.map((p, idx) => ({
    instanceId: `preset-${idx}`,
    podId: p.podId,
    gridX: p.gridX,
    gridZ: p.gridZ,
    rotation: p.rotation,
    placedAt: idx,
  }));

  const check = canLaunchSimulation(presetPods);
  assert.equal(check.canLaunch, true);
  assert.equal(check.missingCount, 0);
  assert.equal(check.missingPodNames.length, 0);
});

test('calculateTelemetry calculates correct power, O2, and water with preset base', () => {
  const presetPods: PlacedPod[] = PRESET_MARS_BASE.map((p, idx) => ({
    instanceId: `preset-${idx}`,
    podId: p.podId,
    gridX: p.gridX,
    gridZ: p.gridZ,
    rotation: p.rotation,
    placedAt: idx,
  }));

  const telemetry = calculateTelemetry(presetPods, testConfig);
  assert.ok(telemetry.powerSupplyKW >= 100, 'Power supply should include nuclear and solar');
  assert.ok(telemetry.netPowerKW > 0, 'Net power should be positive');
  assert.ok(telemetry.netO2Kg > 0, 'Oxygen balance should be positive');
  assert.ok(telemetry.totalCostUSD > 0, 'Total cost calculated');
  assert.ok(telemetry.budgetRemainingUSD < testConfig.constructionBudget, 'Budget remaining reflects spend');
  assert.ok(telemetry.networkConnectedPercent >= 50, 'Network connectivity calculated');
});

test('run30DaySimulation succeeds with healthy preset base', () => {
  const presetPods: PlacedPod[] = PRESET_MARS_BASE.map((p, idx) => ({
    instanceId: `preset-${idx}`,
    podId: p.podId,
    gridX: p.gridX,
    gridZ: p.gridZ,
    rotation: p.rotation,
    placedAt: idx,
  }));

  const result = run30DaySimulation(presetPods, testConfig);
  assert.equal(result.passed, true);
  assert.equal(result.daysSurviving, 30);
  assert.ok(result.habitabilityScore >= 70, 'Habitability score should be high for preset base');
  assert.equal(result.logs.length, 30);
  assert.equal(result.failureReason, null);
});

test('run30DaySimulation fails when essential pods are missing', () => {
  const invalidBase: PlacedPod[] = [
    { instanceId: '1', podId: 'living_pod', gridX: 0, gridZ: 0, rotation: 0, placedAt: 1 },
  ];
  const result = run30DaySimulation(invalidBase, testConfig);
  assert.equal(result.passed, false);
  assert.ok(result.criticalFailures.length > 0);
  assert.ok(result.criticalFailures[0].includes('Missing 9 mandatory Essential Pods'));
  assert.equal(result.failureReason?.subsystem, 'Prerequisites');
  assert.ok(result.failureReason?.whyItFailed && result.failureReason.whyItFailed.length > 10);
  assert.ok(result.failureReason?.whatIsNeeded && result.failureReason.whatIsNeeded.length > 10);
  assert.ok((result.failureReason?.recommendedPodIds.length || 0) > 0);
});

test('run30DaySimulation halts on exact failure day when power collapses under overload', () => {
  const overloadedBase: PlacedPod[] = [
    'living_pod',
    'oxygen_pod',
    'water_pod',
    'airlock_pod',
    'emergency_shelter_pod',
    'power_generation_pod',
    'medical_pod',
    'comm_pod',
    'waste_mgmt_pod',
    'storage_pod',
  ].map((podId, idx) => ({
    instanceId: `ess-${idx}`,
    podId,
    gridX: idx % 5,
    gridZ: Math.floor(idx / 5),
    rotation: 0,
    placedAt: idx,
  }));

  // Add 4 heavy-draw greenhouses (+140 kW demand, 0 extra power) to cause blackout before Day 30
  for (let i = 0; i < 4; i++) {
    overloadedBase.push({
      instanceId: `draw-${i}`,
      podId: 'greenhouse_pod',
      gridX: 6,
      gridZ: i,
      rotation: 0,
      placedAt: 100 + i,
    });
  }

  const result = run30DaySimulation(overloadedBase, { ...testConfig, crewSize: 7 });
  assert.equal(result.passed, false);
  assert.ok(result.daysSurviving < 30, 'Simulation must terminate before Day 30 on failure');
  assert.equal(result.logs.length, result.daysSurviving, 'Logs should stop cleanly on failure day');
  assert.equal(result.logs[result.logs.length - 1].type, 'failure');
  assert.equal(result.failureReason?.subsystem, 'Power');
  assert.ok(result.failureReason?.whyItFailed && result.failureReason.whyItFailed.includes('kW'));
  assert.ok(result.failureReason?.whatIsNeeded && result.failureReason.whatIsNeeded.includes('kW'));
  assert.ok(result.failureReason?.recommendedPodIds.includes('power_generation_pod'));
});

test('computeNetworkConnectivity measures adjacent pressurized tunnel links', () => {
  const adjacent: PlacedPod[] = [
    { instanceId: 'a', podId: 'living_pod', gridX: 0, gridZ: 0, rotation: 0, placedAt: 1 },
    { instanceId: 'b', podId: 'oxygen_pod', gridX: 1, gridZ: 0, rotation: 0, placedAt: 2 },
    { instanceId: 'c', podId: 'water_pod', gridX: 5, gridZ: 5, rotation: 0, placedAt: 3 },
  ];
  assert.equal(computeNetworkConnectivity(adjacent), 67);
});

test('deriveLandingSiteFromLatLon snaps to curated landmarks and computes polar physics', () => {
  const nearJezero = deriveLandingSiteFromLatLon(18.4, 77.6);
  assert.equal(nearJezero.id, 'jezero_crater');
  assert.equal(nearJezero.name, 'Jezero Crater');

  const highPolar = deriveLandingSiteFromLatLon(72, 10);
  assert.equal(highPolar.name, 'Planum Boreum');
  assert.ok(highPolar.iceDepositBonus > 20, 'Polar cap margin should yield high water ice bonus');
  assert.ok(highPolar.solarMultiplier < 0.85, 'Polar site should have lower solar yield');
});

test('calculateTelemetry reflects landing site solarMultiplier and iceDepositBonus', () => {
  const basePods: PlacedPod[] = [
    { instanceId: 'solar-1', podId: 'solar_power_pod', gridX: 0, gridZ: 0, rotation: 0, placedAt: 1 },
    { instanceId: 'water-1', podId: 'water_pod', gridX: 1, gridZ: 0, rotation: 0, placedAt: 2 },
  ];

  const olympus = PRESET_MARS_SITES.find((s) => s.id === 'olympus_rupes')!;
  const arcadia = PRESET_MARS_SITES.find((s) => s.id === 'arcadia_planitia')!;

  const olympusTelemetry = calculateTelemetry(basePods, { ...testConfig, landingSite: olympus });
  const arcadiaTelemetry = calculateTelemetry(basePods, { ...testConfig, landingSite: arcadia });

  assert.ok(
    olympusTelemetry.solarSupplyKW > arcadiaTelemetry.solarSupplyKW,
    'Equatorial/highland Olympus site should produce more solar power than Arcadia'
  );
  assert.ok(
    arcadiaTelemetry.waterSupplyL > olympusTelemetry.waterSupplyL,
    'Ice-rich Arcadia site should yield more extracted water than Olympus'
  );
});

