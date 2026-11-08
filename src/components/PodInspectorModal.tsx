import React from 'react';
import {
  X,
  RotateCw,
  Trash2,
  Info,
  Zap,
  Droplets,
  Wind,
  Layers,
  Scale,
  DollarSign,
  Shield,
} from 'lucide-react';
import { PlacedPod } from '../types';
import { POD_MAP } from '../utils/podCatalog';
import { audioManager } from '../utils/audioManager';

interface PodInspectorModalProps {
  placedPod: PlacedPod | null;
  onClose: () => void;
  onRotatePod: (instanceId: string) => void;
  onDemolishPod: (instanceId: string) => void;
}

export const PodInspectorModal: React.FC<PodInspectorModalProps> = ({
  placedPod,
  onClose,
  onRotatePod,
  onDemolishPod,
}) => {
  if (!placedPod) return null;
  const def = POD_MAP.get(placedPod.podId);
  if (!def) return null;

  const formatCost = (val: number) => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    return `$${(val / 1e6).toFixed(0)}M`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-[#100505f2] border border-[#ff552255] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2.5">
            <span
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: def.colorAccent }}
            />
            <div>
              <div className="text-[10px] font-mono text-white/50 uppercase tracking-wider">
                {def.category} Module
              </div>
              <h3 className="text-base font-mono font-bold text-white tracking-wide">
                {def.name}
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              audioManager.playClick();
              onClose();
            }}
            className="p-1 rounded text-white/50 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-left">
          {/* Scientific Description */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
            <div className="text-[10px] font-mono text-orange-400 uppercase tracking-wider mb-1 font-bold">
              Functional Overview
            </div>
            <p className="text-xs text-white/80 leading-relaxed">{def.description}</p>
          </div>

          {/* NASA Technical Specification */}
          <div className="p-3.5 rounded-xl bg-orange-950/20 border border-orange-500/20">
            <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1 font-bold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>NASA Technical Architecture</span>
            </div>
            <p className="text-xs text-cyan-200/90 leading-relaxed font-mono">
              {def.nasaTechSpec}
            </p>
          </div>

          {/* Core Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
              <div className="text-[10px] text-white/40 uppercase">Hardware Cost</div>
              <div className="text-emerald-400 font-bold mt-0.5">{formatCost(def.cost)}</div>
            </div>

            <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
              <div className="text-[10px] text-white/40 uppercase">Launch Mass</div>
              <div className="text-white font-bold mt-0.5">{(def.mass / 1000).toFixed(1)}t</div>
            </div>

            <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
              <div className="text-[10px] text-white/40 uppercase">Power Rate</div>
              <div
                className={`font-bold mt-0.5 ${
                  def.powerKW <= 0 ? 'text-yellow-400' : 'text-white'
                }`}
              >
                {def.powerKW <= 0 ? `+${Math.abs(def.powerKW)}` : `-${def.powerKW}`} kW
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
              <div className="text-[10px] text-white/40 uppercase">O2 Balance</div>
              <div
                className={`font-bold mt-0.5 ${
                  def.o2Rate < 0 ? 'text-sky-400' : 'text-white'
                }`}
              >
                {def.o2Rate < 0 ? `+${Math.abs(def.o2Rate)}` : `-${def.o2Rate}`} kg/d
              </div>
            </div>
          </div>

          {/* Grid Position & Orientation */}
          <div className="text-[11px] font-mono text-white/50 flex items-center justify-between px-1">
            <span>
              Coordinates: Grid [{placedPod.gridX}, {placedPod.gridZ}]
            </span>
            <span>Orientation: {placedPod.rotation}°</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between">
          <button
            onClick={() => {
              audioManager.playDemolish();
              onDemolishPod(placedPod.instanceId);
              onClose();
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Demolish Pod</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                audioManager.playRotate();
                onRotatePod(placedPod.instanceId);
              }}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate 90°</span>
            </button>

            <button
              onClick={() => {
                audioManager.playClick();
                onClose();
              }}
              className="px-4 py-1.5 rounded-lg bg-[#ff5522] hover:bg-[#ff6633] text-white text-xs font-mono font-bold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
