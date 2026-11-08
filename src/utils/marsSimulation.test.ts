import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTelemetry, canLaunchSimulation, getMissingEssentialPods, run30DaySimulation } from './marsSimulation';
import { PRESET_MARS_BASE, ESSENTIAL_POD_IDS } from './podCatalog';
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
});

test('run30DaySimulation fails when essential pods are missing', () => {
  const invalidBase: PlacedPod[] = [
    { instanceId: '1', podId: 'living_pod', gridX: 0, gridZ: 0, rotation: 0, placedAt: 1 },
  ];
  const result = run30DaySimulation(invalidBase, testConfig);
  assert.equal(result.passed, false);
  assert.ok(result.criticalFailures.length > 0);
  assert.ok(result.criticalFailures[0].includes('Missing 9 mandatory Essential Pods'));
});
