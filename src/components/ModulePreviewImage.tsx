import React, { useMemo } from 'react';
import { Box } from 'lucide-react';
import { PodDefinition } from '../types';
import { renderPodPreviewDataUrl } from '../utils/podThumbnailRenderer';

interface ModulePreviewImageProps {
  pod: PodDefinition;
  className?: string;
}

export const ModulePreviewImage: React.FC<ModulePreviewImageProps> = ({
  pod,
  className = '',
}) => {
  const src = useMemo(() => {
    try {
      return renderPodPreviewDataUrl(pod);
    } catch {
      return null;
    }
  }, [pod]);

  if (!src) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-[#1A1628] to-[#0E0C17] border border-white/[0.08] text-[#9B94B8] ${className}`}
      >
        <Box className="w-7 h-7" style={{ color: pod.colorAccent }} />
        <span className="text-[11px] font-medium text-[#D7D2EA] px-2 text-center truncate max-w-full">
          {pod.name}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-b from-[#171425] to-[#0D0B14] border border-white/[0.08] flex items-center justify-center ${className}`}
    >
      <img
        src={src}
        alt={`3D render of ${pod.name}`}
        referrerPolicy="no-referrer"
        className="w-full h-full object-contain select-none pointer-events-none"
      />
    </div>
  );
};
