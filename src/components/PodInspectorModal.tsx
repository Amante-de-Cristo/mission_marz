import React from 'react';
import { X, RotateCw, Trash2, Shield } from 'lucide-react';
import { PlacedPod } from '../types';
import { POD_MAP } from '../utils/podCatalog';
import { audioManager } from '../utils/audioManager';
import { ModulePreviewImage } from './ModulePreviewImage';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07060B]/82">
      <div className="w-full max-w-lg rounded-xl bg-[#0B0914] border border-[#C4B5FD]/[0.14] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: def.colorAccent }}
            />
            <div>
              <div className="text-[11px] font-medium text-[#8E87AB] flex items-center gap-2">
                <span>{def.category}</span>
                {def.isEssential && (
                  <span className="px-1.5 py-0.5 rounded bg-[#221D33] text-[#C4B5FD] text-[10px]">
                    Essential
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-[#F4F3F8]">{def.name}</h3>
            </div>
          </div>

          <button
            onClick={() => {
              audioManager.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-[#8E87AB] hover:text-white hover:bg-[#1A1726] transition-colors cursor-pointer"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-left">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch">
            <ModulePreviewImage
              pod={def}
              className="w-full sm:w-44 h-36 sm:h-auto rounded-lg shrink-0"
            />
            <div className="flex-1 space-y-2.5">
              <div>
                <div className="text-[11px] font-medium text-[#8E87AB] mb-0.5">
                  Operational Role
                </div>
                <p className="text-xs text-[#EAE6F7] leading-relaxed">{def.description}</p>
              </div>
              <div className="pt-2.5 border-t border-white/[0.07]">
                <div className="text-[11px] font-medium text-[#C4B5FD] mb-0.5 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Technical Architecture</span>
                </div>
                <p className="text-xs text-[#D5CFE8] leading-relaxed font-mono">
                  {def.nasaTechSpec}
                </p>
              </div>
            </div>
          </div>

          {/* Organized 6-Tile Telemetry Spec Grid */}
          <div className="grid grid-cols-3 gap-2 text-center tabular-nums">
            <div className="p-2.5 rounded-lg bg-[#171422] border border-white/[0.06]">
              <div className="text-[10px] text-[#8E87AB] uppercase">Cost</div>
              <div className="text-xs font-mono font-semibold text-emerald-400 mt-0.5">
                {formatCost(def.cost)}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#171422] border border-white/[0.06]">
              <div className="text-[10px] text-[#8E87AB] uppercase">Launch Mass</div>
              <div className="text-xs font-mono font-semibold text-[#F4F3F8] mt-0.5">
                {(def.mass / 1000).toFixed(1)} t
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#171422] border border-white/[0.06]">
              <div className="text-[10px] text-[#8E87AB] uppercase">Power</div>
              <div
                className={`text-xs font-mono font-semibold mt-0.5 ${
                  def.powerKW <= 0 ? 'text-emerald-400' : 'text-[#F4F3F8]'
                }`}
              >
                {def.powerKW <= 0 ? `+${Math.abs(def.powerKW)}` : `-${def.powerKW}`} kW
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#171422] border border-white/[0.06]">
              <div className="text-[10px] text-[#8E87AB] uppercase">Oxygen</div>
              <div
                className={`text-xs font-mono font-semibold mt-0.5 ${
                  def.o2Rate < 0 ? 'text-sky-400' : 'text-[#F4F3F8]'
                }`}
              >
                {def.o2Rate < 0
                  ? `+${Math.abs(def.o2Rate)}`
                  : def.o2Rate === 0
                  ? '0'
                  : `-${def.o2Rate}`}{' '}
                kg/d
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#171422] border border-white/[0.06]">
              <div className="text-[10px] text-[#8E87AB] uppercase">Water</div>
              <div
                className={`text-xs font-mono font-semibold mt-0.5 ${
                  def.waterRate < 0 ? 'text-sky-400' : 'text-[#F4F3F8]'
                }`}
              >
                {def.waterRate < 0
                  ? `+${Math.abs(def.waterRate)}`
                  : def.waterRate === 0
                  ? '0'
                  : `-${def.waterRate}`}{' '}
                L/d
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#171422] border border-white/[0.06]">
              <div className="text-[10px] text-[#8E87AB] uppercase">
                {def.crewCapacity
                  ? 'Crew Berths'
                  : def.foodRate && def.foodRate < 0
                  ? 'Food Yield'
                  : 'CO₂ Scrub'}
              </div>
              <div className="text-xs font-mono font-semibold text-[#C4B5FD] mt-0.5">
                {def.crewCapacity
                  ? `${def.crewCapacity} crew`
                  : def.foodRate && def.foodRate < 0
                  ? `+${Math.abs(def.foodRate)} kg/d`
                  : `${def.co2ScrubKg || 0} kg/d`}
              </div>
            </div>
          </div>

          <div className="text-[11px] font-mono text-[#8E87AB] flex items-center justify-between px-0.5 tabular-nums">
            <span>
              Sector [{placedPod.gridX}, {placedPod.gridZ}]
            </span>
            <span>Orientation {placedPod.rotation}°</span>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-white/[0.08] flex items-center justify-between">
          <button
            onClick={() => {
              audioManager.playDemolish();
              onDemolishPod(placedPod.instanceId);
              onClose();
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                audioManager.playRotate();
                onRotatePod(placedPod.instanceId);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#171422] hover:bg-[#221D33] border border-white/[0.08] text-[#EAE6F7] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate 90°</span>
            </button>

            <button
              onClick={() => {
                audioManager.playClick();
                onClose();
              }}
              className="px-4 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#8B5CF6] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
