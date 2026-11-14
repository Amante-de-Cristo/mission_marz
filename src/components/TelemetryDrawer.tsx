import React, { useState } from 'react';
import { CheckCircle2, X, Plus } from 'lucide-react';
import { ResourceTelemetry, AdvisorWarning, PodDefinition } from '../types';
import { audioManager } from '../utils/audioManager';
import { CATEGORIES, CATEGORY_COLORS, POD_MAP } from '../utils/podCatalog';

interface TelemetryDrawerProps {
  telemetry: ResourceTelemetry;
  warnings: AdvisorWarning[];
  onClose: () => void;
  onSelectCatalogPod?: (pod: PodDefinition) => void;
}

const WARNING_RECOMMENDED_POD: Record<string, string> = {
  'power-deficit': 'power_generation_pod',
  'power-low-margin': 'solar_power_pod',
  'solar-no-storage': 'battery_storage_pod',
  'o2-deficit': 'oxygen_pod',
  'water-deficit': 'water_pod',
  'food-deficit': 'greenhouse_pod',
  'agri-water-leak': 'water_pod',
  'co2-buildup': 'co2_removal_pod',
  'insufficient-berthing': 'living_pod',
};

export const TelemetryDrawer: React.FC<TelemetryDrawerProps> = ({
  telemetry,
  warnings,
  onClose,
  onSelectCatalogPod,
}) => {
  const [activeTab, setActiveTab] = useState<'balances' | 'advisor' | 'limits'>('balances');

  const criticalWarnings = warnings.filter((w) => w.type === 'critical');
  const advisoryWarnings = warnings.filter((w) => w.type !== 'critical');

  const formatCurrency = (val: number) => {
    if (!Number.isFinite(val)) return 'Uncapped';
    if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    return `$${val.toLocaleString()}`;
  };

  return (
    <div className="w-[348px] max-w-[calc(100vw-2rem)] rounded-xl bg-[#0B0914]/95 border border-[#C4B5FD]/[0.14] shadow-[0_18px_40px_rgba(0,0,0,0.72)] overflow-hidden flex flex-col max-h-[calc(100vh-12rem)] text-left">
      <div className="px-3.5 py-2.5 border-b border-white/[0.08] flex items-center justify-between gap-2">
        <div className="flex-1 flex items-center gap-1 p-0.5 rounded-lg bg-[#151121] border border-[#C4B5FD]/[0.08]">
          <button
            onClick={() => {
              audioManager.playClick();
              setActiveTab('balances');
            }}
            className={`flex-1 py-1 px-2 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
              activeTab === 'balances'
                ? 'bg-[#7C3AED] text-white'
                : 'text-[#9B94B8] hover:text-white'
            }`}
          >
            Balances
          </button>

          <button
            onClick={() => {
              audioManager.playClick();
              setActiveTab('advisor');
            }}
            className={`flex-1 py-1 px-2 rounded-md text-[11px] font-medium transition-colors cursor-pointer tabular-nums ${
              activeTab === 'advisor'
                ? 'bg-[#7C3AED] text-white'
                : 'text-[#9B94B8] hover:text-white'
            }`}
          >
            Advisor{warnings.length > 0 ? ` (${warnings.length})` : ''}
          </button>

          <button
            onClick={() => {
              audioManager.playClick();
              setActiveTab('limits');
            }}
            className={`flex-1 py-1 px-2 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
              activeTab === 'limits'
                ? 'bg-[#7C3AED] text-white'
                : 'text-[#9B94B8] hover:text-white'
            }`}
          >
            Caps
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#9B94B8] hover:text-white hover:bg-[#1A1726] transition-colors cursor-pointer"
          aria-label="Close panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3.5 overflow-y-auto space-y-3">
        {activeTab === 'balances' && (
          <div className="space-y-3 text-xs">
            {/* Power & Storage */}
            <div className="rounded-lg bg-[#171422] border border-white/[0.06] p-3 space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8E87AB]">
                Power &amp; Storage
              </div>
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[#CFC9E6]">Net Grid Power</span>
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      telemetry.netPowerKW >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {telemetry.netPowerKW >= 0 ? `+${telemetry.netPowerKW}` : telemetry.netPowerKW} kW
                  </span>
                </div>
                <div className="flex justify-between text-[11px] font-mono text-[#7D7699] tabular-nums">
                  <span>Supply {telemetry.powerSupplyKW} kW</span>
                  <span>Demand {telemetry.powerDemandKW} kW</span>
                </div>
              </div>
              <div className="pt-1.5 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-[#B5AFCE]">Battery Buffer</span>
                <span className="font-mono font-semibold text-[#F4F3F8] tabular-nums">
                  {telemetry.batteryCapacityKWh} kWh
                </span>
              </div>
            </div>

            {/* Life Support */}
            <div className="rounded-lg bg-[#171422] border border-white/[0.06] p-3 space-y-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8E87AB]">
                Life Support
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[#CFC9E6]">Water Loop</span>
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      telemetry.netWaterL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {telemetry.netWaterL >= 0 ? `+${telemetry.netWaterL}` : telemetry.netWaterL} L/d
                  </span>
                </div>
                <div className="flex justify-between text-[11px] font-mono text-[#7D7699] tabular-nums">
                  <span>Supply {telemetry.waterSupplyL} L/d</span>
                  <span>Demand {telemetry.waterDemandL} L/d</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.06]">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[#CFC9E6]">Oxygen Loop</span>
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      telemetry.netO2Kg >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {telemetry.netO2Kg >= 0 ? `+${telemetry.netO2Kg}` : telemetry.netO2Kg} kg/d
                  </span>
                </div>
                <div className="flex justify-between text-[11px] font-mono text-[#7D7699] tabular-nums">
                  <span>Output {telemetry.o2SupplyKg} kg/d</span>
                  <span>Demand {telemetry.o2DemandKg} kg/d</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-[#CFC9E6]">Food Output</span>
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    telemetry.foodSupplyKg >= telemetry.foodDemandKg
                      ? 'text-emerald-400'
                      : 'text-amber-300'
                  }`}
                >
                  {telemetry.foodSupplyKg} / {telemetry.foodDemandKg} kg/d
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#CFC9E6]">CO₂ Scrubbing</span>
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    telemetry.co2ScrubCapacityKg >= telemetry.co2ProductionKg
                      ? 'text-emerald-400'
                      : 'text-amber-300'
                  }`}
                >
                  {telemetry.co2ScrubCapacityKg} / {telemetry.co2ProductionKg} kg/d
                </span>
              </div>
            </div>

            {/* Colony & Logistics */}
            <div className="rounded-lg bg-[#171422] border border-white/[0.06] p-3 space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8E87AB] mb-1">
                Colony &amp; Logistics
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#B5AFCE]">Crew Berths</span>
                <span className="font-mono font-semibold text-[#F4F3F8] tabular-nums">
                  {telemetry.crewCapacity}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#B5AFCE]">Tunnel Network</span>
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    telemetry.networkConnectedPercent >= 80
                      ? 'text-emerald-400'
                      : 'text-amber-300'
                  }`}
                >
                  {telemetry.networkConnectedPercent}% linked
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#B5AFCE]">Research Yield</span>
                <span className="font-mono font-semibold text-[#C4B5FD] tabular-nums">
                  {telemetry.scienceOutputPerDay} pts/d
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#B5AFCE]">Launch Mass</span>
                <span className="font-mono font-semibold text-[#F4F3F8] tabular-nums">
                  {(telemetry.totalMassKg / 1000).toFixed(1)} t
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#B5AFCE]">
                  {telemetry.isInfiniteBudget ? 'Total Spend' : 'Budget Left'}
                </span>
                <span className="font-mono font-semibold text-[#F4F3F8] tabular-nums">
                  {telemetry.isInfiniteBudget
                    ? formatCurrency(telemetry.totalBaseSpendUSD)
                    : formatCurrency(telemetry.budgetRemainingUSD)}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'advisor' && (
          <div className="space-y-2.5">
            {warnings.length === 0 ? (
              <div className="p-4 rounded-lg bg-[#171422] border border-white/[0.06] text-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                <div className="text-xs font-semibold text-[#F4F3F8] mb-0.5">
                  All Systems Balanced
                </div>
                <p className="text-[11px] text-[#9B94B8] leading-relaxed">
                  Power, life support, and essential modules are healthy.
                </p>
              </div>
            ) : (
              <>
                {criticalWarnings.map((warn) => {
                  const recId = WARNING_RECOMMENDED_POD[warn.id];
                  const recPod = recId ? POD_MAP.get(recId) : undefined;
                  return (
                    <div
                      key={warn.id}
                      className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 space-y-1.5"
                    >
                      <div className="text-xs font-semibold text-rose-300">{warn.title}</div>
                      <p className="text-[11px] text-[#EAE6F7]/85 leading-relaxed">{warn.message}</p>
                      {warn.suggestedAction && (
                        <div className="text-[11px] text-[#B5AFCE]">
                          Action: {warn.suggestedAction}
                        </div>
                      )}
                      {recPod && onSelectCatalogPod && (
                        <button
                          onClick={() => {
                            audioManager.playClick();
                            onSelectCatalogPod(recPod);
                            onClose();
                          }}
                          className="mt-1 px-2.5 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-[11px] font-medium text-rose-200 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Place {recPod.name}</span>
                        </button>
                      )}
                    </div>
                  );
                })}

                {advisoryWarnings.map((warn) => {
                  const recId = WARNING_RECOMMENDED_POD[warn.id];
                  const recPod = recId ? POD_MAP.get(recId) : undefined;
                  return (
                    <div
                      key={warn.id}
                      className="p-3 rounded-lg bg-[#171422] border border-white/[0.08] space-y-1.5"
                    >
                      <div className="text-xs font-semibold text-[#C4B5FD]">{warn.title}</div>
                      <p className="text-[11px] text-[#9B94B8] leading-relaxed">{warn.message}</p>
                      {warn.suggestedAction && (
                        <div className="text-[11px] text-[#CFC9E6]">
                          Tip: {warn.suggestedAction}
                        </div>
                      )}
                      {recPod && onSelectCatalogPod && (
                        <button
                          onClick={() => {
                            audioManager.playClick();
                            onSelectCatalogPod(recPod);
                            onClose();
                          }}
                          className="mt-1 px-2.5 py-1 rounded-md bg-[#7C3AED]/20 hover:bg-[#7C3AED]/30 border border-[#8B5CF6]/35 text-[11px] font-medium text-[#E9D5FF] flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Place {recPod.name}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {activeTab === 'limits' && (
          <div className="space-y-2.5">
            {CATEGORIES.map((cat) => {
              const capInfo = telemetry.categoryCaps?.[cat] || { placed: 0, maxAllowed: 8 };
              const theme = CATEGORY_COLORS[cat];
              const percent = Math.min(100, (capInfo.placed / capInfo.maxAllowed) * 100);

              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#EAE6F7] truncate pr-2">{cat}</span>
                    <span className="font-mono text-[11px] text-[#8E87AB] tabular-nums shrink-0">
                      {capInfo.placed} / {capInfo.maxAllowed}
                    </span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${percent}%`, backgroundColor: theme.hex }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
