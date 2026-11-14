import React from 'react';
import {
  FastForward,
  Sun,
  Moon,
  AlertTriangle,
  ShieldCheck,
  Thermometer,
  Pause,
  Play,
  Gauge,
  XCircle,
} from 'lucide-react';
import { DailySimulationLog } from '../types';

interface SimulationOverlayProps {
  currentDay: number;
  totalDays: number;
  progress: number;
  currentLog: DailySimulationLog | null;
  isPaused: boolean;
  speed: 1 | 2;
  hasFailed: boolean;
  onTogglePause: () => void;
  onToggleSpeed: () => void;
  onSkip: () => void;
}

export const SimulationOverlay: React.FC<SimulationOverlayProps> = ({
  currentDay,
  totalDays,
  progress,
  currentLog,
  isPaused,
  speed,
  hasFailed,
  onTogglePause,
  onToggleSpeed,
  onSkip,
}) => {
  const sunCycle = (progress * 6) % 1;
  const isNight = sunCycle > 0.5;
  const isStorm = (currentLog?.solarMultiplier ?? 1) < 0.75;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-4 sm:p-5 pt-18">
      {/* Top Simulation HUD Bar */}
      <div className="flex flex-wrap items-center justify-between pointer-events-auto gap-3">
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[#0B0914]/92 border border-[#C4B5FD]/[0.14] shadow-[0_10px_28px_rgba(0,0,0,0.55)]">
          <span className="text-xs font-semibold text-[#F4F3F8]">
            {hasFailed ? `Simulation Halted · Day ${currentDay}` : '30-Day Simulation'}
          </span>

          <div className="w-px h-3.5 bg-white/[0.1]" />

          <div className="flex items-center gap-1.5 text-xs font-medium">
            {hasFailed ? (
              <span className="flex items-center gap-1.5 text-rose-400">
                <XCircle className="w-3.5 h-3.5" />
                <span>System Failure</span>
              </span>
            ) : isStorm ? (
              <span className="flex items-center gap-1.5 text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Dust Storm</span>
              </span>
            ) : isNight ? (
              <span className="flex items-center gap-1.5 text-[#C4B5FD]">
                <Moon className="w-3.5 h-3.5" />
                <span>Night Cycle</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-300">
                <Sun className="w-3.5 h-3.5" />
                <span>Sol Daylight</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0B0914]/92 border border-[#C4B5FD]/[0.14] shadow-[0_10px_28px_rgba(0,0,0,0.55)]">
          {!hasFailed && (
            <>
              <button
                onClick={onTogglePause}
                className="px-2.5 py-1.5 rounded-lg hover:bg-[#1A1726] text-[#EAE6F7] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title={isPaused ? 'Resume simulation' : 'Pause simulation'}
              >
                {isPaused ? (
                  <Play className="w-3.5 h-3.5 text-[#A78BFA]" />
                ) : (
                  <Pause className="w-3.5 h-3.5 text-[#A78BFA]" />
                )}
                <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
              </button>

              <button
                onClick={onToggleSpeed}
                className="px-2.5 py-1.5 rounded-lg hover:bg-[#1A1726] text-[#EAE6F7] text-xs font-mono font-medium flex items-center gap-1 transition-colors cursor-pointer tabular-nums"
                title="Toggle simulation speed"
              >
                <Gauge className="w-3.5 h-3.5 text-[#A78BFA]" />
                <span>{speed}x</span>
              </button>
            </>
          )}

          <button
            onClick={onSkip}
            className="px-3 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#8B5CF6] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>{hasFailed ? 'View Report' : 'Skip'}</span>
          </button>
        </div>
      </div>

      {/* Center Event / Failure Notice Toast */}
      {currentLog && currentLog.type !== 'normal' && (
        <div
          className={`self-center pointer-events-auto max-w-md px-4 py-3 rounded-xl bg-[#0B0914]/95 border shadow-[0_14px_34px_rgba(0,0,0,0.65)] text-center ${
            currentLog.type === 'failure'
              ? 'border-rose-500/60'
              : currentLog.type === 'hazard'
              ? 'border-amber-400/40'
              : 'border-[#C4B5FD]/[0.14]'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#F4F3F8] mb-1">
            {currentLog.type === 'failure' ? (
              <XCircle className="w-4 h-4 text-rose-400" />
            ) : currentLog.type === 'hazard' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            )}
            <span>{currentLog.title}</span>
          </div>
          <p className="text-xs text-[#B5AFCE] leading-relaxed">
            {currentLog.description}
          </p>
        </div>
      )}

      {/* Bottom Progress Bar & Live Subsystem Strip */}
      <div className="pointer-events-auto max-w-2xl w-full mx-auto p-4 rounded-xl bg-[#0B0914]/92 border border-[#C4B5FD]/[0.14] shadow-[0_16px_40px_rgba(0,0,0,0.65)] space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-violet-50">
              Day {currentDay} of {totalDays}
            </span>
            <span className="text-[11px] font-mono text-violet-200/60">
              Sol {(currentDay * 1.027).toFixed(1)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-violet-100 font-mono text-[11px]">
            <div className="flex items-center gap-1">
              <Thermometer className="w-3.5 h-3.5 text-violet-400" />
              <span>{currentLog?.temperatureC ?? -58}°C</span>
            </div>
            <div>
              <span className="text-violet-200/55">Power </span>
              <span className={(currentLog?.powerLevel ?? 100) < 30 ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                {currentLog?.powerLevel ?? 100}%
              </span>
            </div>
            <div>
              <span className="text-violet-200/55">O₂ </span>
              <span className={(currentLog?.o2Level ?? 100) < 30 ? 'text-rose-400 font-semibold' : 'text-sky-400 font-semibold'}>
                {currentLog?.o2Level ?? 100}%
              </span>
            </div>
            <div>
              <span className="text-violet-200/55">H₂O </span>
              <span className={(currentLog?.waterLevel ?? 100) < 30 ? 'text-rose-400 font-semibold' : 'text-cyan-400 font-semibold'}>
                {currentLog?.waterLevel ?? 100}%
              </span>
            </div>
            <div>
              <span className="text-violet-200/55">Food </span>
              <span className={(currentLog?.foodLevel ?? 100) < 30 ? 'text-rose-400 font-semibold' : 'text-violet-300 font-semibold'}>
                {currentLog?.foodLevel ?? 100}%
              </span>
            </div>
          </div>
        </div>

        <div className="w-full h-2 rounded-full bg-violet-300/12 overflow-hidden">
          <div
            className={`h-full transition-all duration-150 ${
              hasFailed ? 'bg-rose-500' : 'bg-[#8B5CF6]'
            }`}
            style={{ width: `${Math.min(100, Math.round((currentDay / totalDays) * 100))}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-violet-200/65">
          <span className="truncate">
            {currentLog ? currentLog.description : 'Simulating atmospheric and electrical loads...'}
          </span>
          <span className="font-mono text-[11px] text-violet-300/60 shrink-0 tabular-nums">
            CO₂ {currentLog?.co2KPa?.toFixed(2) ?? '0.40'} kPa
          </span>
        </div>
      </div>
    </div>
  );
};
