import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Zap,
  Droplets,
  Wind,
  Apple,
  Filter,
  DollarSign,
  Rocket,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Info,
  Compass,
  Boxes,
  Users,
} from 'lucide-react';
import { ResourceTelemetry, AdvisorWarning, PlacedPod, CameraState, RoverState } from '../types';
import { MinimapRadar } from './MinimapRadar';
import { audioManager } from '../utils/audioManager';
import { CATEGORIES, CATEGORY_COLORS } from '../utils/podCatalog';

interface TelemetryDrawerProps {
  telemetry: ResourceTelemetry;
  warnings: AdvisorWarning[];
  placedPods: PlacedPod[];
  cameraState: CameraState;
  rovers?: RoverState[];
  selectedPlacedPod?: PlacedPod | null;
  onMinimapClick?: (gridX: number, gridZ: number) => void;
}

export const TelemetryDrawer: React.FC<TelemetryDrawerProps> = ({
  telemetry,
  warnings,
  placedPods,
  cameraState,
  rovers = [],
  selectedPlacedPod,
  onMinimapClick,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'caps' | 'advisor'>('telemetry');

  const criticalWarnings = warnings.filter((w) => w.type === 'critical');
  const advisoryWarnings = warnings.filter((w) => w.type !== 'critical');

  const formatCurrency = (val: number) => {
    if (!Number.isFinite(val)) return '∞ Uncapped';
    if (Math.abs(val) >= 1e9) {
      return `$${(val / 1e9).toFixed(2)}B`;
    }
    if (Math.abs(val) >= 1e6) {
      return `$${(val / 1e6).toFixed(1)}M`;
    }
    return `$${val.toLocaleString()}`;
  };

  return (
    <aside
      className={`absolute right-3 sm:right-4 top-16 bottom-3 z-20 flex flex-col transition-all duration-300 pointer-events-auto ${
        isCollapsed ? 'w-12' : 'w-72 sm:w-80 md:w-96'
      }`}
    >
      <div className="flex-1 flex flex-col rounded-2xl bg-[#100505e6] border border-[#ff552233] backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Header / Tab Switcher */}
        <div className="p-2 border-b border-white/10 flex items-center justify-between bg-black/40">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded text-white/50 hover:text-white transition-colors"
            title={isCollapsed ? 'Expand Telemetry' : 'Collapse Telemetry'}
            aria-label={isCollapsed ? 'Expand Telemetry' : 'Collapse Telemetry'}
          >
            {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {!isCollapsed && (
            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => {
                  audioManager.playClick();
                  setActiveTab('telemetry');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-colors ${
                  activeTab === 'telemetry'
                    ? 'bg-[#ff552233] text-[#ff7744] border border-[#ff552255]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Telemetry</span>
              </button>

              <button
                onClick={() => {
                  audioManager.playClick();
                  setActiveTab('caps');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-colors ${
                  activeTab === 'caps'
                    ? 'bg-[#ff552233] text-[#ff7744] border border-[#ff552255]'
                    : 'text-white/60 hover:text-white'
                }`}
                title="Pod Placement Limits & Quantities"
              >
                <Boxes className="w-3.5 h-3.5 text-cyan-400" />
                <span>Caps</span>
              </button>

              <button
                onClick={() => {
                  audioManager.playClick();
                  setActiveTab('advisor');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-colors relative ${
                  activeTab === 'advisor'
                    ? 'bg-[#ff552233] text-[#ff7744] border border-[#ff552255]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Advisor</span>
                {warnings.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-500 text-[9px] font-mono text-white flex items-center justify-center font-bold">
                    {warnings.length}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Collapsed Strip */}
        {isCollapsed ? (
          <div className="flex-1 py-4 flex flex-col items-center gap-4 text-white/50">
            <button
              onClick={() => {
                setIsCollapsed(false);
                setActiveTab('telemetry');
              }}
              title="Telemetry"
              className="p-2 rounded-lg hover:bg-white/5"
            >
              <Activity className="w-4 h-4 text-[#ff5522]" />
            </button>
            <button
              onClick={() => {
                setIsCollapsed(false);
                setActiveTab('caps');
              }}
              title="Caps & Limits"
              className="p-2 rounded-lg hover:bg-white/5"
            >
              <Boxes className="w-4 h-4 text-cyan-400" />
            </button>
            <button
              onClick={() => {
                setIsCollapsed(false);
                setActiveTab('advisor');
              }}
              className="relative p-2 rounded-lg hover:bg-white/5"
              title="Advisor Warnings"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              {warnings.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 absolute top-1 right-1" />
              )}
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10 text-left">
            {/* 2D Tactical Minimap / Radar Section */}
            <div className="flex flex-col">
              <MinimapRadar
                placedPods={placedPods}
                cameraState={cameraState}
                rovers={rovers}
                selectedPlacedPod={selectedPlacedPod}
                onMinimapClick={onMinimapClick}
              />
            </div>

            {/* TAB 1: Real-Time Resource Telemetry */}
            {activeTab === 'telemetry' && (
              <div className="space-y-3">
                {/* Financial Tracker */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        {telemetry.isInfiniteBudget ? 'Total Base Spend ($)' : 'Budget Balance ($)'}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold ${
                        telemetry.isInfiniteBudget || telemetry.budgetRemainingUSD >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {telemetry.isInfiniteBudget
                        ? formatCurrency(telemetry.totalBaseSpendUSD)
                        : formatCurrency(telemetry.budgetRemainingUSD)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-white/70">
                    <div className="bg-white/5 p-1.5 rounded">
                      <div className="text-white/40 text-[9px]">TOTAL MODULE COST</div>
                      <div className="text-white font-bold">{formatCurrency(telemetry.totalCostUSD)}</div>
                    </div>
                    <div className="bg-white/5 p-1.5 rounded">
                      <div className="text-white/40 text-[9px]">LAUNCH MASS</div>
                      <div className="text-cyan-300 font-bold">{(telemetry.totalMassKg / 1000).toFixed(1)}t</div>
                    </div>
                  </div>
                </div>

                {/* 1. Electrical Power Bus */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        Electrical Power Bus
                      </span>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold ${
                        telemetry.netPowerKW >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {telemetry.netPowerKW >= 0 ? `+${telemetry.netPowerKW}` : telemetry.netPowerKW} kW
                    </span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden flex mb-2">
                    <div
                      className="bg-amber-400 h-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (telemetry.powerDemandKW / Math.max(1, telemetry.powerSupplyKW)) * 100
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-white/70">
                    <div className="bg-white/5 p-1.5 rounded">
                      <div className="text-white/40 text-[9px]">TOTAL SUPPLY</div>
                      <div className="text-white font-bold">{telemetry.powerSupplyKW} kW</div>
                    </div>
                    <div className="bg-white/5 p-1.5 rounded">
                      <div className="text-white/40 text-[9px]">TOTAL DEMAND</div>
                      <div className="text-white font-bold">{telemetry.powerDemandKW} kW</div>
                    </div>
                  </div>
                </div>

                {/* 2. Water Reserves & Reclamation */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        Water Reserves
                      </span>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold ${
                        telemetry.netWaterL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {telemetry.netWaterL >= 0 ? `+${telemetry.netWaterL}` : telemetry.netWaterL} L/day
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-white/70">
                    <div className="bg-white/5 p-1.5 rounded">
                      <div className="text-white/40 text-[9px]">PURIFIED / DAY</div>
                      <div className="text-cyan-300 font-bold">{telemetry.waterSupplyL} L</div>
                    </div>
                    <div className="bg-white/5 p-1.5 rounded">
                      <div className="text-white/40 text-[9px]">CONSUMPTION / DAY</div>
                      <div className="text-white font-bold">{telemetry.waterDemandL} L</div>
                    </div>
                  </div>
                </div>

                {/* 3. Atmospheric Oxygen Supply */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Wind className="w-4 h-4 text-sky-400" />
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        Oxygen Supply
                      </span>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold ${
                        telemetry.netO2Kg >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {telemetry.netO2Kg >= 0 ? `+${telemetry.netO2Kg}` : telemetry.netO2Kg} kg/day
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-white/70">
                    <div className="bg-white/5 p-1.5 rounded">
                      <div className="text-white/40 text-[9px]">MOXIE & HARVEST</div>
                      <div className="text-sky-300 font-bold">{telemetry.o2SupplyKg} kg/day</div>
                    </div>
                    <div className="bg-white/5 p-1.5 rounded">
                      <div className="text-white/40 text-[9px]">METABOLIC DRAW</div>
                      <div className="text-white font-bold">{telemetry.o2DemandKg} kg/day</div>
                    </div>
                  </div>
                </div>

                {/* 4. Food & Crops */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Apple className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        Food & Crops
                      </span>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold ${
                        telemetry.foodSupplyKg >= telemetry.foodDemandKg
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {telemetry.foodSupplyKg} kg/day
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-white/70">
                    <div className="bg-white/5 p-1.5 rounded">
                      <div className="text-white/40 text-[9px]">DAILY HARVEST</div>
                      <div className="text-emerald-300 font-bold">{telemetry.foodSupplyKg} kg</div>
                    </div>
                    <div className="bg-white/5 p-1.5 rounded">
                      <div className="text-white/40 text-[9px]">CREW DEMAND</div>
                      <div className="text-white font-bold">{telemetry.foodDemandKg} kg</div>
                    </div>
                  </div>
                </div>

                {/* 5. Crew Berthing Capacity */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        Crew Habitation Bunks
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white">
                      {telemetry.crewCapacity} Bunks
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-white/60">
                    Main Living Pod provides 6 certified pressurized sleeping quarters with acoustic dampening.
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Quantity & Cap Tracking ("Placed: X / Max: Y") */}
            {activeTab === 'caps' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-white/60 pb-1 border-b border-white/10">
                  <span>Category Inventory</span>
                  <span>Placed / Max</span>
                </div>

                <div className="space-y-2">
                  {CATEGORIES.map((cat) => {
                    const capInfo = telemetry.categoryCaps?.[cat] || { placed: 0, maxAllowed: 8 };
                    const theme = CATEGORY_COLORS[cat];
                    const percent = Math.min(100, (capInfo.placed / capInfo.maxAllowed) * 100);

                    return (
                      <div
                        key={cat}
                        className="p-2.5 rounded-xl bg-black/40 border border-white/5 hover:border-white/15 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: theme.hex }}
                            />
                            <span className="text-xs font-mono font-bold text-white truncate">
                              {cat}
                            </span>
                          </div>

                          <span className="text-xs font-mono font-bold text-white/90">
                            Placed: {capInfo.placed} / Max: {capInfo.maxAllowed}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: theme.hex,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: Base Optimization Advisor */}
            {activeTab === 'advisor' && (
              <div className="space-y-2.5">
                <div className="text-[11px] text-white/60 font-mono mb-1 flex items-center justify-between">
                  <span>Advisory Diagnostics Engine</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/80">
                    {warnings.length} Active
                  </span>
                </div>

                {warnings.length === 0 ? (
                  <div className="p-6 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <h4 className="text-xs font-mono font-bold text-white mb-1">
                      All Systems Balanced
                    </h4>
                    <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                      Power grid, ECLSS life support loops, and essential modules are completely certified.
                    </p>
                  </div>
                ) : (
                  <>
                    {criticalWarnings.map((warn) => (
                      <div
                        key={warn.id}
                        className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-left"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-300 mb-1">
                          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                          <span>{warn.title}</span>
                        </div>
                        <p className="text-[11px] text-white/70 leading-relaxed mb-2">
                          {warn.message}
                        </p>
                        {warn.suggestedAction && (
                          <div className="text-[10px] font-mono text-amber-300 bg-black/40 p-1.5 rounded flex items-center gap-1">
                            <span className="font-bold">FIX:</span> {warn.suggestedAction}
                          </div>
                        )}
                      </div>
                    ))}

                    {advisoryWarnings.map((warn) => (
                      <div
                        key={warn.id}
                        className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-left"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300 mb-1">
                          <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <span>{warn.title}</span>
                        </div>
                        <p className="text-[11px] text-white/70 leading-relaxed mb-2">
                          {warn.message}
                        </p>
                        {warn.suggestedAction && (
                          <div className="text-[10px] font-mono text-cyan-300 bg-black/40 p-1.5 rounded flex items-center gap-1">
                            <span className="font-bold">TIP:</span> {warn.suggestedAction}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
