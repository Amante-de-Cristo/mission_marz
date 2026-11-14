import React, { useRef, useEffect } from 'react';
import { PlacedPod, CameraState, RoverState } from '../types';
import { POD_MAP, CATEGORY_COLORS } from '../utils/podCatalog';

interface MinimapRadarProps {
  placedPods: PlacedPod[];
  cameraState: CameraState;
  rovers?: RoverState[];
  selectedPlacedPod?: PlacedPod | null;
  onMinimapClick?: (gridX: number, gridZ: number) => void;
}

export const MinimapRadar: React.FC<MinimapRadarProps> = ({
  placedPods,
  cameraState,
  rovers = [],
  selectedPlacedPod,
  onMinimapClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radarRadius = width / 2 - 12;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radarRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#0B0914';
    ctx.fill();
    ctx.strokeStyle = 'rgba(196, 181, 253, 0.16)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const rings = [0.33, 0.66, 1.0];
    rings.forEach((rScale, i) => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radarRadius * rScale, 0, Math.PI * 2);
      ctx.strokeStyle = i === 2 ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.setLineDash(i === 2 ? [] : [2, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    ctx.beginPath();
    ctx.moveTo(centerX - radarRadius, centerY);
    ctx.lineTo(centerX + radarRadius, centerY);
    ctx.moveTo(centerX, centerY - radarRadius);
    ctx.lineTo(centerX, centerY + radarRadius);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radarRadius - 1, 0, Math.PI * 2);
    ctx.clip();

    ctx.save();
    ctx.translate(centerX, centerY);
    const yaw = -cameraState.rotationY;
    ctx.rotate(yaw);

    const scale = (radarRadius * 0.88) / 72;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 0.7;
    for (let g = -12; g <= 12; g += 2) {
      const pos = g * 6 * scale;
      ctx.beginPath();
      ctx.moveTo(pos, -radarRadius);
      ctx.lineTo(pos, radarRadius);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-radarRadius, pos);
      ctx.lineTo(radarRadius, pos);
      ctx.stroke();
    }

    for (const pod of placedPods) {
      const def = POD_MAP.get(pod.podId);
      const catColor = def ? CATEGORY_COLORS[def.category]?.hex || '#e05a36' : '#e05a36';

      const px = pod.gridX * 6 * scale;
      const pz = pod.gridZ * 6 * scale;
      const isSelected = selectedPlacedPod?.instanceId === pod.instanceId;

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(px, pz, 6.5, 0, Math.PI * 2);
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(px, pz, isSelected ? 4 : 3, 0, Math.PI * 2);
      ctx.fillStyle = catColor;
      ctx.fill();
    }

    for (const rover of rovers) {
      const rx = rover.x * scale;
      const rz = rover.z * scale;
      ctx.beginPath();
      ctx.arc(rx, rz, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#c4b5fd';
      ctx.fill();
    }

    ctx.restore();

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-20, -40);
    ctx.lineTo(20, -40);
    ctx.closePath();
    const fovGrad = ctx.createLinearGradient(0, 0, 0, -40);
    fovGrad.addColorStop(0, 'rgba(139, 92, 246, 0.32)');
    fovGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
    ctx.fillStyle = fovGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f5f3ff';
    ctx.fill();
    ctx.restore();

    ctx.restore();

    ctx.save();
    ctx.font = '600 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const compassPts = [
      { label: 'N', angle: -yaw - Math.PI / 2, color: '#a78bfa' },
      { label: 'E', angle: -yaw, color: '#7e759e' },
      { label: 'S', angle: -yaw + Math.PI / 2, color: '#7e759e' },
      { label: 'W', angle: -yaw + Math.PI, color: '#7e759e' },
    ];

    compassPts.forEach((pt) => {
      const cx = centerX + Math.cos(pt.angle) * (radarRadius + 7);
      const cy = centerY + Math.sin(pt.angle) * (radarRadius + 7);
      ctx.fillStyle = pt.color;
      ctx.fillText(pt.label, cx, cy);
    });

    ctx.restore();
  }, [placedPods, cameraState, rovers, selectedPlacedPod]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onMinimapClick) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - canvas.width / 2;
    const y = e.clientY - rect.top - canvas.height / 2;

    const yaw = -cameraState.rotationY;
    const cos = Math.cos(-yaw);
    const sin = Math.sin(-yaw);
    const unrotatedX = x * cos - y * sin;
    const unrotatedZ = x * sin + y * cos;

    const radarRadius = canvas.width / 2 - 12;
    const scale = (radarRadius * 0.88) / 72;
    const gx = Math.round(unrotatedX / (6 * scale));
    const gz = Math.round(unrotatedZ / (6 * scale));

    onMinimapClick(gx, gz);
  };

  return (
    <div className="w-52 p-3 rounded-xl bg-[#0B0914]/95 border border-[#C4B5FD]/[0.14] shadow-[0_14px_34px_rgba(0,0,0,0.68)] text-left">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <span className="text-xs font-medium text-[#EAE6F7]">Base Radar</span>
        <span className="text-[11px] font-mono text-[#8E87AB] tabular-nums">
          {placedPods.length} pods
        </span>
      </div>

      <div className="flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={168}
          height={168}
          onClick={handleCanvasClick}
          className="cursor-pointer rounded-full"
          title="Click sector to pan camera"
        />
      </div>
    </div>
  );
};
