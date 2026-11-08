import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  XCircle,
  Award,
  Zap,
  Wind,
  Droplets,
  Apple,
  Shield,
  Smile,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { SimulationResult } from '../types';
import { audioManager } from '../utils/audioManager';

interface EvaluationModalProps {
  result: SimulationResult;
  onClose: () => void;
  onReset: () => void;
}

export const EvaluationModal: React.FC<EvaluationModalProps> = ({
  result,
  onClose,
  onReset,
}) => {
  useEffect(() => {
    if (result.passed) {
      audioManager.playVictory();
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff5522', '#38bdf8', '#22c55e', '#eab308'],
      });
    } else {
      audioManager.playError();
    }
  }, [result.passed]);

  const b = result.systemBreakdown;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-2xl bg-[#100505f2] border border-[#ff552255] shadow-[0_0_50px_#ff552244] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Banner */}
        <div
          className={`p-6 border-b border-white/10 text-center relative overflow-hidden ${
            result.passed
              ? 'bg-gradient-to-b from-emerald-950/40 to-transparent'
              : 'bg-gradient-to-b from-rose-950/40 to-transparent'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-2 bg-black/40 border border-white/10 text-xs font-mono">
            {result.passed ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300 font-bold uppercase tracking-wider">
                  MISSION CERTIFICATION: PASSED
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-rose-400" />
                <span className="text-rose-300 font-bold uppercase tracking-wider">
                  MISSION CERTIFICATION: FAILED
                </span>
              </>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-mono font-black text-white tracking-wide">
            {result.passed
              ? '30-DAY MARTIAN ENDURANCE ACHIEVED'
              : `COLONY SYSTEM FAILURE AT DAY ${result.daysSurviving}`}
          </h2>

          <p className="text-xs text-white/70 mt-1 max-w-md mx-auto leading-relaxed">
            {result.passed
              ? 'All primary and secondary ECLSS life support loops sustained the crew through severe dust storm and thermal stress cycles.'
              : 'Life support equilibrium collapsed prior to the conclusion of the 30-day endurance trial.'}
          </p>

          {/* Big Habitability Score Dial */}
          <div className="mt-4 inline-flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-black/60 border border-white/15">
            <Award
              className={`w-8 h-8 ${result.passed ? 'text-emerald-400' : 'text-rose-400'}`}
            />
            <div className="text-left">
              <div className="text-[10px] font-mono text-white/50 uppercase">
                Habitability Rating
              </div>
              <div className="text-2xl font-mono font-black text-white leading-tight">
                {result.habitabilityScore}
                <span className="text-sm font-normal text-white/40">/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 scrollbar-thin scrollbar-thumb-white/10 text-left">
          {/* Critical Failures (if any) */}
          {result.criticalFailures.length > 0 && (
            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40">
              <div className="text-xs font-mono font-bold text-rose-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Critical Incidents Logged</span>
              </div>
              <ul className="space-y-1 text-xs text-rose-200/90 font-mono">
                {result.criticalFailures.map((fail, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{fail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* System Breakdown Sub-scores */}
          <div>
            <div className="text-xs font-mono font-bold text-white/70 uppercase tracking-wider mb-2.5">
              Subsystem Performance Breakdown
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <div className="flex items-center justify-between text-white/50 text-[10px] mb-1">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-yellow-400" /> Power
                  </span>
                  <span className="text-white font-bold">{b.powerReliability}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-yellow-400" style={{ width: `${b.powerReliability}%` }} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <div className="flex items-center justify-between text-white/50 text-[10px] mb-1">
                  <span className="flex items-center gap-1">
                    <Wind className="w-3 h-3 text-sky-400" /> Oxygen
                  </span>
                  <span className="text-white font-bold">{b.oxygenStability}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-sky-400" style={{ width: `${b.oxygenStability}%` }} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <div className="flex items-center justify-between text-white/50 text-[10px] mb-1">
                  <span className="flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-cyan-400" /> Water
                  </span>
                  <span className="text-white font-bold">{b.waterReserve}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-cyan-400" style={{ width: `${b.waterReserve}%` }} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <div className="flex items-center justify-between text-white/50 text-[10px] mb-1">
                  <span className="flex items-center gap-1">
                    <Apple className="w-3 h-3 text-emerald-400" /> Crops/Food
                  </span>
                  <span className="text-white font-bold">{b.foodSustainability}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-emerald-400" style={{ width: `${b.foodSustainability}%` }} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <div className="flex items-center justify-between text-white/50 text-[10px] mb-1">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-purple-400" /> Integrity
                  </span>
                  <span className="text-white font-bold">{b.lifeSupportIntegrity}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-purple-400" style={{ width: `${b.lifeSupportIntegrity}%` }} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <div className="flex items-center justify-between text-white/50 text-[10px] mb-1">
                  <span className="flex items-center gap-1">
                    <Smile className="w-3 h-3 text-pink-400" /> Morale
                  </span>
                  <span className="text-white font-bold">{b.crewMorale}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-pink-400" style={{ width: `${b.crewMorale}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Recommendations */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/10">
            <div className="text-xs font-mono font-bold text-orange-400 uppercase tracking-wider mb-2">
              Actionable Base Optimization Steps:
            </div>
            <ul className="space-y-1.5 text-xs text-white/80 font-mono">
              {result.actionableSteps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-[#ff5522] flex-shrink-0 mt-0.5" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-4 border-t border-white/10 bg-black/50 flex items-center justify-between">
          <button
            onClick={() => {
              audioManager.playClick();
              onReset();
            }}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart Mission</span>
          </button>

          <button
            onClick={() => {
              audioManager.playClick();
              onClose();
            }}
            className="px-5 py-2 rounded-lg bg-[#ff5522] hover:bg-[#ff6633] text-white text-xs font-mono font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-[0_0_20px_#ff552255]"
          >
            <span>Review & Expand Base</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
