import React from 'react';
import { FastForward, Sun, Moon, AlertTriangle, ShieldCheck, Thermometer } from 'lucide-react';
import { DailySimulationLog } from '../types';

interface SimulationOverlayProps {
  currentDay: number;
  totalDays: number;
  progress: number; // 0 to 1
  currentLog: DailySimulationLog | null;
  onSkip: () => void;
}

export const SimulationOverlay: React.FC<SimulationOverlayProps> = ({
  currentDay,
  totalDays,
  progress,
  currentLog,
  onSkip,
}) => {
  // Compute day/night phase for HUD
  const sunCycle = (progress * 6) % 1;
  const isNight = sunCycle > 0.5;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-6 pt-16">
      {/* Top Simulation HUD Bar */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[#100505cc] border border-[#ff552255] backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-mono font-black text-white uppercase tracking-wider">
              30-Day Endurance Simulation in Progress
            </span>
          </div>

          <div className="w-px h-4 bg-white/20" />

          <div className="flex items-center gap-1.5 text-xs font-mono">
            {isNight ? (
              <span className="flex items-center gap-1 text-indigo-300">
                <Moon className="w-3.5 h-3.5" />
                <span>Martian Night</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-orange-400">
                <Sun className="w-3.5 h-3.5" />
                <span>Martian Sol</span>
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onSkip}
          className="px-3.5 py-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/20 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg"
        >
          <FastForward className="w-3.5 h-3.5 text-orange-400" />
          <span>Skip to Evaluation</span>
        </button>
      </div>

      {/* Center Event Notice Toast (if special event) */}
      {currentLog && currentLog.type !== 'normal' && (
        <div className="self-center pointer-events-auto max-w-md p-3.5 rounded-xl bg-[#100505ee] border border-orange-500/50 backdrop-blur-md shadow-[0_0_30px_#ff552233] text-center animate-bounce">
          <div className="flex items-center justify-center gap-1.5 text-xs font-mono font-bold text-orange-400 mb-1">
            {currentLog.type === 'hazard' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            )}
            <span>{currentLog.title}</span>
          </div>
          <p className="text-xs text-white/80 font-mono leading-relaxed">
            {currentLog.description}
          </p>
        </div>
      )}

      {/* Bottom Progress Bar & Telemetry HUD */}
      <div className="pointer-events-auto max-w-3xl w-full mx-auto p-4 rounded-2xl bg-[#100505dd] border border-[#ff552244] backdrop-blur-md shadow-2xl">
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">
              Earth Day {currentDay} of {totalDays}
            </span>
            <span className="text-[11px] text-white/50">
              (Sol {(currentDay * 1.027).toFixed(1)})
            </span>
          </div>

          <div className="flex items-center gap-4 text-white/70">
            <div className="flex items-center gap-1">
              <Thermometer className="w-3.5 h-3.5 text-orange-400" />
              <span>{currentLog?.temperatureC ?? -58}°C</span>
            </div>
            <div>
              <span>O2: </span>
              <span className="text-cyan-400 font-bold">{currentLog?.o2Level ?? 100}%</span>
            </div>
            <div>
              <span>Power: </span>
              <span className="text-yellow-400 font-bold">{currentLog?.powerLevel ?? 100}%</span>
            </div>
          </div>
        </div>

        {/* Continuous Progress Bar */}
        <div className="w-full h-3 rounded-full bg-black/60 border border-white/10 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-[#ff5522] via-[#e11d48] to-cyan-400 transition-all duration-150"
            style={{ width: `${Math.min(100, Math.round(progress * 100))}%` }}
          />
        </div>

        {/* Live Sol Status Ticker */}
        <div className="mt-2 text-[11px] font-mono text-white/60 truncate">
          {currentLog ? currentLog.description : 'Simulating continuous atmospheric and electrical loads...'}
        </div>
      </div>
    </div>
  );
};
