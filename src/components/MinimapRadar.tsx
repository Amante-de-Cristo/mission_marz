import React, { useRef, useEffect } from 'react';
import { Compass, Maximize2, Crosshair } from 'lucide-react';
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

    // Clear
    ctx.clearRect(0, 0, width, height);

    // 1. Radar background (deep dark Martian tactical grid)
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radarRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#0c0404fa';
    ctx.fill();
    ctx.strokeStyle = '#ff552244';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 2. Concentric Distance Rings (30m, 60m, 90m)
    const rings = [0.33, 0.66, 1.0];
    rings.forEach((rScale, i) => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radarRadius * rScale, 0, Math.PI * 2);
      ctx.strokeStyle = i === 2 ? '#ff552266' : '#ffffff14';
      ctx.lineWidth = 1;
      ctx.setLineDash(i === 2 ? [] : [3, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // 3. Crosshairs
    ctx.beginPath();
    ctx.moveTo(centerX - radarRadius, centerY);
    ctx.lineTo(centerX + radarRadius, centerY);
    ctx.moveTo(centerX, centerY - radarRadius);
    ctx.lineTo(centerX, centerY + radarRadius);
    ctx.strokeStyle = '#ffffff18';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Clip to radar circle for rotating elements
    ctx.beginPath();
    ctx.arc(centerX, centerY, radarRadius - 1, 0, Math.PI * 2);
    ctx.clip();

    // 4. Rotate according to Camera Orbit Yaw Angle
    ctx.save();
    ctx.translate(centerX, centerY);
    // Negative camera yaw so map aligns with the user's forward view
    const yaw = -cameraState.rotationY;
    ctx.rotate(yaw);

    // Grid coordinates scale: Map 24x24 grid into radar circle (72 units radius)
    const scale = (radarRadius * 0.88) / 72;

    // Draw Grid Lines (rotated with world)
    ctx.strokeStyle = '#ff552215';
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

    // Draw Placed Pods
    for (const pod of placedPods) {
      const def = POD_MAP.get(pod.podId);
      const catColor = def ? CATEGORY_COLORS[def.category]?.hex || '#ff5522' : '#ff5522';

      const px = pod.gridX * 6 * scale;
      const pz = pod.gridZ * 6 * scale;

      const isSelected = selectedPlacedPod?.instanceId === pod.instanceId;

      // Selection Halo
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(px, pz, 7, 0, Math.PI * 2);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      // Pod Blip
      ctx.beginPath();
      ctx.arc(px, pz, isSelected ? 4.5 : 3.2, 0, Math.PI * 2);
      ctx.fillStyle = catColor;
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw Active Rovers (if any)
    for (const rover of rovers) {
      const rx = rover.x * scale;
      const rz = rover.z * scale;

      ctx.beginPath();
      ctx.arc(rx, rz, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();

      // Heading arrow
      ctx.beginPath();
      ctx.moveTo(rx, rz);
      ctx.lineTo(rx + Math.sin(rover.angle) * 6, rz + Math.cos(rover.angle) * 6);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore(); // restore rotation

    // 5. Draw Camera Observer Node & Field of View Cone at center
    ctx.save();
    ctx.translate(centerX, centerY);

    // FOV Cone pointing North (forward from viewer's perspective)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-24, -48);
    ctx.lineTo(24, -48);
    ctx.closePath();
    const fovGrad = ctx.createLinearGradient(0, 0, 0, -48);
    fovGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
    fovGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
    ctx.fillStyle = fovGrad;
    ctx.fill();

    // Camera Center Dot
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();

    ctx.restore(); // restore clipping

    // 6. Compass Headings around Radar Rim (N, S, E, W)
    ctx.save();
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const compassPts = [
      { label: 'N', angle: -yaw - Math.PI / 2, color: '#ff5522' },
      { label: 'E', angle: -yaw, color: '#ffffff99' },
      { label: 'S', angle: -yaw + Math.PI / 2, color: '#ffffff99' },
      { label: 'W', angle: -yaw + Math.PI, color: '#ffffff99' },
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

    // Convert click back to world grid
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
    <div className="p-3 rounded-2xl bg-black/50 border border-white/10 backdrop-blur-md shadow-xl text-left">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-[#ff5522]" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-white">
            2D Tactical Radar
          </span>
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/60">
          Sync: 3D Yaw
        </span>
      </div>

      <div className="relative flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={180}
          height={180}
          onClick={handleCanvasClick}
          className="cursor-pointer rounded-full bg-black/60 shadow-inner"
          title="Tactical Minimap: Shows colony modules and camera viewpoint. Click to inspect sector."
        />
      </div>

      <div className="flex items-center justify-between text-[9px] font-mono text-white/50 mt-2 px-1">
        <span>Pods: {placedPods.length}</span>
        {rovers.length > 0 && <span className="text-amber-400">Rovers: {rovers.length}</span>}
        <span>Grid: 24x24</span>
      </div>
    </div>
  );
};
