import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  XCircle,
  Zap,
  Wind,
  Droplets,
  Apple,
  Shield,
  Smile,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  FlaskConical,
  Network,
  Plus,
} from 'lucide-react';
import { SimulationResult, DailySimulationLog, PodDefinition } from '../types';
import { audioManager } from '../utils/audioManager';
import { POD_MAP } from '../utils/podCatalog';
import { ModulePreviewImage } from './ModulePreviewImage';

interface EvaluationModalProps {
  result: SimulationResult;
  onClose: () => void;
  onReset: () => void;
  onSelectRecommendedPod?: (pod: PodDefinition) => void;
}

export const EvaluationModal: React.FC<EvaluationModalProps> = ({
  result,
  onClose,
  onReset,
  onSelectRecommendedPod,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'audit'>('overview');
  const [selectedDay, setSelectedDay] = useState<number>(
    result.logs.length > 0 ? result.logs[result.logs.length - 1].day : 1
  );
  const [logFilter, setLogFilter] = useState<'all' | 'events'>('all');

  useEffect(() => {
    if (result.passed) {
      audioManager.playVictory();
      confetti({
        particleCount: 95,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#C4B5FD', '#A855F7', '#38bdf8'],
      });
    } else {
      audioManager.playError();
    }
  }, [result.passed]);

  const b = result.systemBreakdown;
  const t = result.telemetrySnapshot;

  const subsystems = [
    { label: 'Power', value: b.powerReliability, icon: Zap, color: 'text-amber-400', bar: 'bg-amber-400' },
    { label: 'Oxygen', value: b.oxygenStability, icon: Wind, color: 'text-sky-400', bar: 'bg-sky-400' },
    { label: 'Water', value: b.waterReserve, icon: Droplets, color: 'text-cyan-400', bar: 'bg-cyan-400' },
    { label: 'Food', value: b.foodSustainability, icon: Apple, color: 'text-emerald-400', bar: 'bg-emerald-400' },
    { label: 'Integrity', value: b.lifeSupportIntegrity, icon: Shield, color: 'text-violet-400', bar: 'bg-violet-400' },
    { label: 'Morale', value: b.crewMorale, icon: Smile, color: 'text-fuchsia-400', bar: 'bg-fuchsia-400' },
  ];

  const selectedLog: DailySimulationLog | undefined =
    result.logs.find((l) => l.day === selectedDay) || result.logs[result.logs.length - 1];

  const visibleLogs =
    logFilter === 'events'
      ? result.logs.filter((l) => l.type !== 'normal')
      : result.logs;

  // Build SVG path helpers for the 30-day timeline chart
  const chartW = 540;
  const chartH = 140;
  const padL = 28;
  const padR = 12;
  const padT = 12;
  const padB = 22;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const xForDay = (day: number) => padL + ((day - 1) / 29) * innerW;
  const yForPct = (pct: number) => padT + (1 - Math.max(0, Math.min(100, pct)) / 100) * innerH;

  const buildPath = (getter: (l: DailySimulationLog) => number) => {
    if (result.logs.length === 0) return '';
    return result.logs
      .map((l, idx) => `${idx === 0 ? 'M' : 'L'}${xForDay(l.day).toFixed(1)},${yForPct(getter(l)).toFixed(1)}`)
      .join(' ');
  };

  const gradeColor =
    result.grade === 'S' || result.grade === 'A'
      ? 'text-emerald-300 border-emerald-400/35 bg-emerald-500/15'
      : result.grade === 'B' || result.grade === 'C'
      ? 'text-violet-200 border-violet-400/35 bg-violet-500/20'
      : 'text-rose-300 border-rose-400/35 bg-rose-500/15';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07060B]/88">
      <div className="w-full max-w-3xl rounded-xl bg-[#0B0914] border border-[#C4B5FD]/[0.14] shadow-[0_24px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Summary */}
        <div className="px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="text-left">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg mb-2 bg-[#171422] border border-white/[0.08] text-xs font-medium">
                {result.passed ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">30-Day Endurance Passed</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-rose-300">
                      Halted on Day {result.daysSurviving} of {result.totalDays}
                    </span>
                  </>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-semibold text-violet-50">
                {result.passed
                  ? 'Colony Mission Report'
                  : `${result.failureReason?.subsystem || 'System'} Failure on Day ${result.daysSurviving}`}
              </h2>
              <p className="text-xs text-violet-200/70 mt-1 max-w-xl leading-relaxed">
                {result.passed
                  ? 'All primary life support and power subsystems sustained the crew through dust storms and solar particle events.'
                  : result.failureReason?.summary ||
                    'Life support equilibrium collapsed before reaching Sol 30.'}
              </p>
            </div>

            {/* Grade + Score Badge */}
            <div className="flex items-center gap-2.5 tabular-nums shrink-0">
              <div className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center ${gradeColor}`}>
                <span className="text-[9px] uppercase tracking-wider opacity-75">Grade</span>
                <span className="text-lg font-mono font-bold leading-none">{result.grade}</span>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-[#171422] border border-white/[0.08] text-left">
                <div className="text-[10px] text-[#8E87AB]">Habitability</div>
                <div className="text-lg font-mono font-semibold text-[#F4F3F8] leading-tight">
                  {result.habitabilityScore}
                  <span className="text-xs font-normal text-[#8E87AB]">/100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Mission KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 tabular-nums">
            <div className="px-3 py-2 rounded-xl bg-[#171422] border border-white/[0.06] flex items-center justify-between">
              <span className="text-[11px] text-[#8E87AB]">Survived</span>
              <span className={`text-xs font-mono font-semibold ${result.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                {result.daysSurviving} / 30d
              </span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-[#171422] border border-white/[0.06] flex items-center justify-between">
              <span className="text-[11px] text-[#8E87AB] flex items-center gap-1">
                <FlaskConical className="w-3 h-3 text-[#A78BFA]" />
                <span>Science</span>
              </span>
              <span className="text-xs font-mono font-semibold text-[#F4F3F8]">
                {result.scienceYieldTotal} pts
              </span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-[#171422] border border-white/[0.06] flex items-center justify-between">
              <span className="text-[11px] text-[#8E87AB] flex items-center gap-1">
                <Network className="w-3 h-3 text-sky-400" />
                <span>Linked</span>
              </span>
              <span className="text-xs font-mono font-semibold text-[#F4F3F8]">
                {result.networkConnectivityPct}%
              </span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-[#171422] border border-white/[0.06] flex items-center justify-between">
              <span className="text-[11px] text-[#8E87AB]">Final CO₂</span>
              <span className={`text-xs font-mono font-semibold ${result.finalReserves.co2KPa >= 1.2 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {result.finalReserves.co2KPa.toFixed(2)} kPa
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#171422] border border-white/[0.06] mt-4">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'timeline', label: `Telemetry Chart & Log (${result.logs.length}d)` },
              { id: 'audit', label: 'Base Audit' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  audioManager.playClick();
                  setActiveTab(tab.id as typeof activeTab);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-[#9B94B8] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Tab Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-left flex-1">
          {activeTab === 'overview' && (
            <>
              {!result.passed && result.failureReason && (
                <div className="rounded-xl bg-[#171422] border border-rose-500/35 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/[0.06] bg-rose-500/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>
                        Why It Failed · {result.failureReason.subsystem} (Sol {result.daysSurviving})
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-[11px] font-medium text-[#8E87AB] mb-1">
                          Root Cause
                        </div>
                        <p className="text-xs text-[#EAE6F7] leading-relaxed">
                          {result.failureReason.whyItFailed}
                        </p>
                      </div>
                      <div>
                        <div className="text-[11px] font-medium text-emerald-400 mb-1">
                          What Is Needed
                        </div>
                        <p className="text-xs text-[#EAE6F7] leading-relaxed">
                          {result.failureReason.whatIsNeeded}
                        </p>
                      </div>
                    </div>

                    {result.failureReason.recommendedPodIds.length > 0 && (
                      <div className="pt-3 border-t border-white/[0.08]">
                        <div className="text-[11px] font-medium text-[#9B94B8] mb-2.5">
                          Recommended Module{result.failureReason.recommendedPodIds.length > 1 ? 's' : ''} to Fix This
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {result.failureReason.recommendedPodIds.slice(0, 2).map((podId) => {
                            const pod = POD_MAP.get(podId);
                            if (!pod) return null;
                            const statLabel =
                              pod.powerKW < 0
                                ? `+${Math.abs(pod.powerKW)} kW Power`
                                : pod.o2Rate < 0
                                ? `+${Math.abs(pod.o2Rate)} kg/d O₂`
                                : pod.waterRate < 0
                                ? `+${Math.abs(pod.waterRate)} L/d Water`
                                : pod.foodRate && pod.foodRate < 0
                                ? `+${Math.abs(pod.foodRate)} kg/d Food`
                                : pod.co2ScrubKg
                                ? `${pod.co2ScrubKg} kg/d CO₂ Scrub`
                                : pod.modelType === 'battery_bank'
                                ? '+250 kWh Storage'
                                : pod.category;
                            return (
                              <div
                                key={pod.id}
                                className="flex items-center gap-3 p-2.5 rounded-xl bg-[#0F0D16] border border-white/[0.08]"
                              >
                                <ModulePreviewImage
                                  pod={pod}
                                  className="w-24 h-20 rounded-lg shrink-0"
                                />
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="text-xs font-semibold text-[#F4F3F8] truncate">
                                    {pod.name}
                                  </div>
                                  <div className="text-[11px] font-mono text-emerald-400">
                                    {statLabel}
                                  </div>
                                  <p className="text-[11px] text-[#9B94B8] line-clamp-2 leading-snug">
                                    {pod.description}
                                  </p>
                                  {onSelectRecommendedPod && (
                                    <button
                                      onClick={() => {
                                        audioManager.playClick();
                                        onSelectRecommendedPod(pod);
                                      }}
                                      className="mt-1 px-2.5 py-1 rounded-md bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>Place Module</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {result.passed && result.criticalFailures.length > 0 && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                  <div className="text-xs font-semibold text-rose-300 mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Failure Diagnostics</span>
                  </div>
                  <ul className="space-y-1 text-xs text-rose-100/90">
                    {result.criticalFailures.map((fail, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-rose-400 font-bold">•</span>
                        <span>{fail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <div className="text-xs font-medium text-violet-200 mb-2.5">
                  Subsystem Reliability
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 tabular-nums">
                  {subsystems.map((sub) => {
                    const Icon = sub.icon;
                    return (
                      <div
                        key={sub.label}
                        className="p-3 rounded-xl bg-[#171422] border border-white/[0.06]"
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="flex items-center gap-1.5 text-[#D7D2EA]">
                            <Icon className={`w-3.5 h-3.5 ${sub.color}`} />
                            <span>{sub.label}</span>
                          </span>
                          <span className="font-mono font-semibold text-[#F4F3F8]">
                            {sub.value}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                          <div className={`h-full ${sub.bar}`} style={{ width: `${sub.value}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Final Physical Reserves */}
              <div>
                <div className="text-xs font-medium text-[#D7D2EA] mb-2.5">
                  Reserves at Day {result.daysSurviving}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 tabular-nums">
                  <div className="p-3 rounded-xl bg-[#171422] border border-white/[0.06]">
                    <div className="text-[11px] text-[#8E87AB]">Oxygen Tank</div>
                    <div className="text-sm font-mono font-semibold text-sky-400 mt-0.5">
                      {result.finalReserves.o2Kg} kg
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#171422] border border-white/[0.06]">
                    <div className="text-[11px] text-[#8E87AB]">Water Tank</div>
                    <div className="text-sm font-mono font-semibold text-cyan-400 mt-0.5">
                      {result.finalReserves.waterL} L
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#171422] border border-white/[0.06]">
                    <div className="text-[11px] text-[#8E87AB]">Food Pantry</div>
                    <div className="text-sm font-mono font-semibold text-emerald-400 mt-0.5">
                      {result.finalReserves.foodKg} kg
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#171422] border border-white/[0.06]">
                    <div className="text-[11px] text-[#8E87AB]">Battery Bank</div>
                    <div className="text-sm font-mono font-semibold text-[#C4B5FD] mt-0.5">
                      {result.finalReserves.batteryKWh} kWh
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#171422] border border-white/[0.06]">
                <div className="text-xs font-semibold text-[#F4F3F8] mb-2">
                  Recommended Next Steps
                </div>
                <ul className="space-y-1.5 text-xs text-[#B9B3D1]">
                  {result.actionableSteps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-[#A78BFA] shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {activeTab === 'timeline' && (
            <>
              {result.logs.length > 0 ? (
                <>
                  {/* Multi-Series SVG Telemetry Chart */}
                  <div className="p-4 rounded-xl bg-[#171422] border border-white/[0.06] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-violet-100">
                        Daily Reserve Trajectory (Day 1 – {result.daysSurviving})
                      </span>
                      <div className="flex items-center gap-3 text-[11px] font-mono">
                        <span className="flex items-center gap-1 text-amber-300">
                          <span className="w-2 h-2 rounded-full bg-amber-400" /> Power
                        </span>
                        <span className="flex items-center gap-1 text-sky-300">
                          <span className="w-2 h-2 rounded-full bg-sky-400" /> O₂
                        </span>
                        <span className="flex items-center gap-1 text-cyan-300">
                          <span className="w-2 h-2 rounded-full bg-cyan-400" /> Water
                        </span>
                        <span className="flex items-center gap-1 text-emerald-300">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" /> Food
                        </span>
                      </div>
                    </div>

                    <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-36 overflow-visible">
                      {/* Dust storm window shading (Days 14-16) */}
                      <rect
                        x={xForDay(14)}
                        y={padT}
                        width={xForDay(16) - xForDay(14)}
                        height={innerH}
                        fill="rgba(245, 158, 11, 0.08)"
                      />

                      {/* Horizontal grid lines */}
                      {[0, 50, 100].map((pct) => (
                        <g key={pct}>
                          <line
                            x1={padL}
                            x2={chartW - padR}
                            y1={yForPct(pct)}
                            y2={yForPct(pct)}
                            stroke="rgba(196,181,253,0.12)"
                            strokeDasharray="3 3"
                          />
                          <text
                            x={padL - 5}
                            y={yForPct(pct) + 3}
                            textAnchor="end"
                            className="fill-violet-300/50 text-[9px] font-mono"
                          >
                            {pct}
                          </text>
                        </g>
                      ))}

                      {/* Series paths */}
                      <path d={buildPath((l) => l.powerLevel)} fill="none" stroke="#fbbf24" strokeWidth="2" />
                      <path d={buildPath((l) => l.o2Level)} fill="none" stroke="#38bdf8" strokeWidth="2" />
                      <path d={buildPath((l) => l.waterLevel)} fill="none" stroke="#22d3ee" strokeWidth="2" />
                      <path d={buildPath((l) => l.foodLevel)} fill="none" stroke="#34d399" strokeWidth="2" />

                      {/* Interactive day markers */}
                      {result.logs.map((l) => {
                        const isSel = l.day === selectedDay;
                        const isFail = l.type === 'failure';
                        return (
                          <g
                            key={l.day}
                            onClick={() => setSelectedDay(l.day)}
                            className="cursor-pointer"
                          >
                            <rect
                              x={xForDay(l.day) - 7}
                              y={padT}
                              width={14}
                              height={innerH}
                              fill="transparent"
                            />
                            {(isSel || isFail) && (
                              <line
                                x1={xForDay(l.day)}
                                x2={xForDay(l.day)}
                                y1={padT}
                                y2={padT + innerH}
                                stroke={isFail ? '#f43f5e' : '#a78bfa'}
                                strokeWidth={isFail ? 1.5 : 1}
                                strokeDasharray={isFail ? undefined : '2 2'}
                              />
                            )}
                            {isFail && (
                              <circle
                                cx={xForDay(l.day)}
                                cy={yForPct(0)}
                                r={4}
                                fill="#f43f5e"
                              />
                            )}
                          </g>
                        );
                      })}

                      {/* X axis labels */}
                      {[1, 10, 20, 30].map((d) => (
                        <text
                          key={d}
                          x={xForDay(d)}
                          y={chartH - 4}
                          textAnchor="middle"
                          className="fill-violet-300/50 text-[9px] font-mono"
                        >
                          D{d}
                        </text>
                      ))}
                    </svg>

                    {/* Inspected Day Snapshot */}
                    {selectedLog && (
                      <div className="p-3 rounded-lg bg-[#0F0D16] border border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
                        <div className="min-w-0">
                          <span className="font-semibold text-[#F4F3F8]">{selectedLog.title}</span>
                          <span className="text-[#9B94B8] ml-2">{selectedLog.description}</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-[11px] text-[#B9B3D1] shrink-0">
                          <span>Net {selectedLog.netPowerKW >= 0 ? `+${selectedLog.netPowerKW}` : selectedLog.netPowerKW} kW</span>
                          <span>O₂ {selectedLog.o2KgRemaining}kg</span>
                          <span>H₂O {selectedLog.waterLRemaining}L</span>
                          <span>Food {selectedLog.foodKgRemaining}kg</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sol Log List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#D7D2EA]">Daily Log</span>
                      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#171422] border border-white/[0.06] text-[11px]">
                        <button
                          onClick={() => setLogFilter('all')}
                          className={`px-2 py-0.5 rounded-md cursor-pointer ${
                            logFilter === 'all' ? 'bg-[#7C3AED] text-white' : 'text-[#9B94B8]'
                          }`}
                        >
                          All Days
                        </button>
                        <button
                          onClick={() => setLogFilter('events')}
                          className={`px-2 py-0.5 rounded-md cursor-pointer ${
                            logFilter === 'events' ? 'bg-[#7C3AED] text-white' : 'text-[#9B94B8]'
                          }`}
                        >
                          Events & Failures
                        </button>
                      </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {visibleLogs.map((log) => (
                        <button
                          key={log.day}
                          onClick={() => setSelectedDay(log.day)}
                          className={`w-full p-2.5 rounded-xl border text-left transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs ${
                            selectedDay === log.day
                              ? 'bg-[#211C33] border-[#7C3AED]/60'
                              : log.type === 'failure'
                              ? 'bg-rose-500/10 border-rose-500/30'
                              : 'bg-[#171422] border-white/[0.06] hover:border-white/[0.14]'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className={`font-medium truncate ${log.type === 'failure' ? 'text-rose-300' : 'text-[#F4F3F8]'}`}>
                              {log.title}
                            </div>
                            <div className="text-[11px] text-[#8E87AB] truncate">
                              {log.description}
                            </div>
                          </div>
                          <div className="font-mono text-[11px] text-[#9B94B8] shrink-0 tabular-nums">
                            {log.temperatureC}°C · {log.co2KPa} kPa
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-6 rounded-xl bg-[#171422] text-center text-xs text-[#9B94B8]">
                  No operational logs recorded because launch prerequisites were incomplete.
                </div>
              )}
            </>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4 tabular-nums">
              <div className="rounded-xl bg-[#171422] border border-white/[0.06] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/[0.06] text-xs font-semibold text-[#F4F3F8]">
                  Colony Supply vs Demand
                </div>
                <div className="divide-y divide-white/[0.05] text-xs">
                  {[
                    {
                      name: 'Electrical Power',
                      supply: `${t.powerSupplyKW} kW`,
                      demand: `${t.powerDemandKW} kW`,
                      net: `${t.netPowerKW >= 0 ? `+${t.netPowerKW}` : t.netPowerKW} kW`,
                      ok: t.netPowerKW >= 0,
                    },
                    {
                      name: 'Oxygen Generation',
                      supply: `${t.o2SupplyKg} kg/d`,
                      demand: `${t.o2DemandKg} kg/d`,
                      net: `${t.netO2Kg >= 0 ? `+${t.netO2Kg}` : t.netO2Kg} kg/d`,
                      ok: t.netO2Kg >= 0,
                    },
                    {
                      name: 'Water Loop',
                      supply: `${t.waterSupplyL} L/d`,
                      demand: `${t.waterDemandL} L/d`,
                      net: `${t.netWaterL >= 0 ? `+${t.netWaterL}` : t.netWaterL} L/d`,
                      ok: t.netWaterL >= 0,
                    },
                    {
                      name: 'Food Production',
                      supply: `${t.foodSupplyKg} kg/d`,
                      demand: `${t.foodDemandKg} kg/d`,
                      net: `${(t.foodSupplyKg - t.foodDemandKg).toFixed(1)} kg/d`,
                      ok: t.foodSupplyKg >= t.foodDemandKg,
                    },
                    {
                      name: 'CO₂ Scrubbing',
                      supply: `${t.co2ScrubCapacityKg} kg/d`,
                      demand: `${t.co2ProductionKg} kg/d`,
                      net: `${(t.co2ScrubCapacityKg - t.co2ProductionKg).toFixed(1)} kg/d`,
                      ok: t.co2ScrubCapacityKg >= t.co2ProductionKg,
                    },
                  ].map((row) => (
                    <div key={row.name} className="px-4 py-2.5 flex items-center justify-between gap-2">
                      <span className="text-[#D7D2EA]">{row.name}</span>
                      <div className="flex items-center gap-4 font-mono text-[11px]">
                        <span className="text-[#8E87AB] hidden sm:inline">
                          {row.supply} / {row.demand}
                        </span>
                        <span className={`font-semibold w-20 text-right ${row.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {row.net}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#171422] border border-white/[0.06]">
                  <div className="text-[11px] text-[#8E87AB]">Continuous Power</div>
                  <div className="text-sm font-mono font-semibold text-[#F4F3F8] mt-0.5">
                    {t.continuousSupplyKW} kW
                  </div>
                  <div className="text-[11px] text-[#6E6887] mt-0.5">Dust-storm immune</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#171422] border border-white/[0.06]">
                  <div className="text-[11px] text-[#8E87AB]">Solar Array Output</div>
                  <div className="text-sm font-mono font-semibold text-amber-300 mt-0.5">
                    {t.solarSupplyKW} kW
                  </div>
                  <div className="text-[11px] text-[#6E6887] mt-0.5">Variable during storms</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#171422] border border-white/[0.06]">
                  <div className="text-[11px] text-[#8E87AB]">Battery Storage</div>
                  <div className="text-sm font-mono font-semibold text-[#C4B5FD] mt-0.5">
                    {t.batteryCapacityKWh} kWh
                  </div>
                  <div className="text-[11px] text-[#6E6887] mt-0.5">Night & storm buffer</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] flex items-center justify-between">
          <button
            onClick={() => {
              audioManager.playClick();
              onReset();
            }}
            className="px-4 py-2 rounded-lg bg-[#171422] hover:bg-[#1E1A2D] border border-white/[0.08] text-[#D7D2EA] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Preset</span>
          </button>

          <button
            onClick={() => {
              audioManager.playClick();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Continue Building</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
