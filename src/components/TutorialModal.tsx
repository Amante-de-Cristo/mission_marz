import React from 'react';
import {
  X,
  Compass,
  RotateCw,
  Info,
  ShieldAlert,
  Play,
  MousePointer,
  Sparkles,
  Layers,
  Eye,
} from 'lucide-react';
import { audioManager } from '../utils/audioManager';

interface TutorialModalProps {
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-2xl bg-[#100505ee] border border-[#ff552255] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5522]" />
            <h3 className="text-sm font-mono font-bold uppercase text-white tracking-wider">
              Flight Director Onboarding Manual
            </h3>
          </div>
          <button
            onClick={() => {
              audioManager.playClick();
              onClose();
            }}
            className="p-1 rounded text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-white/10 text-left">
          {/* Section 1: Navigation Controls & Dedicated UI Buttons */}
          <div>
            <div className="text-xs font-mono font-bold text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Compass className="w-4 h-4" />
              <span>3D Viewport Controls & Dedicated On-Screen Tools</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-start gap-2.5">
                <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold text-[10px] flex items-center gap-1">
                  <RotateCw className="w-3 h-3" />
                  Rotate
                </span>
                <span className="text-white/80 text-[11px]">
                  Rotate pods via dedicated on-screen "Rotate 90°" button in top toolbar or inspector.
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-start gap-2.5">
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[10px] flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  Inspect
                </span>
                <span className="text-white/80 text-[11px]">
                  Click any placed module on the Martian grid to view NASA technical specifications.
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-start gap-2.5">
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold text-[10px]">
                  Left-Click
                </span>
                <span className="text-white/80 text-[11px]">
                  Drag to pan camera across terrain, or click grid tile to deploy selected pod.
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-start gap-2.5">
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold text-[10px]">
                  Right-Click
                </span>
                <span className="text-white/80 text-[11px]">
                  Drag to orbit and tilt camera viewing angle (synced with 2D Tactical Radar).
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Layout & Automatic Tunnels */}
          <div className="p-3.5 rounded-xl bg-black/30 border border-white/5">
            <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              <span>Expanded 24x24 Grid & Auto-Connecting Tunnels</span>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              Modules snap to a calibrated 6-meter Martian grid across an expanded 24x24 envelope (144m). When two pods are placed adjacently in orthogonal directions, an airtight pressurized connector tube with safety luminescence strips automatically links their airlocks.
            </p>
          </div>

          {/* Section 3: Essential 10 Pods Validation Rule */}
          <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30">
            <div className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              <span>Mandatory Launch Prerequisite (10 Essential Pods)</span>
            </div>
            <p className="text-xs text-white/70 leading-relaxed mb-2">
              The 30-Day Sol Simulation cannot start until all 10 Essential Pods are constructed:
            </p>
            <div className="text-[11px] font-mono text-amber-200/90 grid grid-cols-2 gap-1 bg-black/40 p-2 rounded-lg">
              <span>• Main Living Pod</span>
              <span>• Oxygen Generation Pod</span>
              <span>• Water Recycling Pod</span>
              <span>• Airlock Pod</span>
              <span>• Emergency Shelter</span>
              <span>• Power Generation Pod</span>
              <span>• Medical Pod</span>
              <span>• Communication Pod</span>
              <span>• Waste Management</span>
              <span>• Storage Pod</span>
            </div>
          </div>

          {/* Section 4: Telemetry & Advisor */}
          <div className="p-3.5 rounded-xl bg-black/30 border border-white/5">
            <div className="text-xs font-mono font-bold text-yellow-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>Live Optimization Advisor & Multi-Track Audio</span>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              Use the telemetry drawer on the right to track net kW power, L/day water, and kg/day O2. The Base Advisor will warn you if solar arrays lack night batteries or if crops lack water recyclers! Background music features 4 multi-track Martian ambient compositions.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-white/10 bg-black/40 flex justify-end">
          <button
            onClick={() => {
              audioManager.playClick();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-[#ff5522] hover:bg-[#ff6633] text-white text-xs font-mono font-bold transition-colors cursor-pointer"
          >
            Acknowledge & Enter Command Console
          </button>
        </div>
      </div>
    </div>
  );
};
