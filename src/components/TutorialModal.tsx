import React from 'react';
import {
  X,
  Activity,
  Grid2x2,
  RotateCw,
  Eye,
  Radar,
  Play,
  ChevronRight,
  CheckCircle2,
  Circle,
  Lock,
} from 'lucide-react';
import { audioManager } from '../utils/audioManager';
import { CatalogGroupId } from './PodCatalogSidebar';
import { HeaderMenuId } from './HeaderNav';

export interface TutorialStepAction {
  openHeaderMenu?: HeaderMenuId;
  selectCatalogGroup?: CatalogGroupId;
  focusCenter?: boolean;
  clearPlacement?: boolean;
}

export interface TutorialProgressState {
  openedBalances: boolean;
  pickedModule: boolean;
  rotatedModule: boolean;
  placedModule: boolean;
  inspectedModule: boolean;
  openedRadar: boolean;
  checkedOptionsOrLaunch: boolean;
}

export interface TutorialCheckItem {
  label: string;
  done: boolean;
}

interface TutorialStepDef {
  id: string;
  title: string;
  instruction: string;
  icon: React.ReactNode;
  onEnter?: TutorialStepAction;
  getChecks: (p: TutorialProgressState) => TutorialCheckItem[];
}

export const TUTORIAL_STEPS: TutorialStepDef[] = [
  {
    id: 'telemetry',
    title: 'Check Live Balances',
    instruction:
      'Click Balances in the top-right bar (or the top resource strip) to open the right-side telemetry panel.',
    icon: <Activity className="w-4 h-4 text-emerald-400" />,
    onEnter: { openHeaderMenu: 'none' },
    getChecks: (p) => [{ label: 'Open Balances panel', done: p.openedBalances }],
  },
  {
    id: 'catalog',
    title: 'Select a Module',
    instruction:
      'Pick any module from the bottom dock (try Solar Power Array or Oxygen Generation) to preview it on the 3D surface.',
    icon: <Grid2x2 className="w-4 h-4 text-[#A78BFA]" />,
    onEnter: { openHeaderMenu: 'none', selectCatalogGroup: 'power' },
    getChecks: (p) => [{ label: 'Select a module from dock', done: p.pickedModule }],
  },
  {
    id: 'place',
    title: 'Rotate & Deploy',
    instruction:
      'Click Rotate 90° in the bottom placement bar, then click any green tile on the Mars terrain to deploy it.',
    icon: <RotateCw className="w-4 h-4 text-[#A78BFA]" />,
    getChecks: (p) => [
      { label: 'Click Rotate 90°', done: p.rotatedModule },
      { label: 'Place module on Mars grid', done: p.placedModule },
    ],
  },
  {
    id: 'inspect',
    title: 'Inspect a Placed Module',
    instruction:
      'Click any module on the 3D Mars surface to open its technical Inspector and 3D architecture preview.',
    icon: <Eye className="w-4 h-4 text-sky-400" />,
    onEnter: { openHeaderMenu: 'none', focusCenter: true, clearPlacement: true },
    getChecks: (p) => [{ label: 'Click a module on Mars to inspect it', done: p.inspectedModule }],
  },
  {
    id: 'radar',
    title: 'Open Orbital Radar',
    instruction:
      'Click the Radar icon in the top-right bar to view your 24 × 24 orbital map and rover positions.',
    icon: <Radar className="w-4 h-4 text-[#A78BFA]" />,
    onEnter: { openHeaderMenu: 'none' },
    getChecks: (p) => [{ label: 'Open Tactical Radar menu', done: p.openedRadar }],
  },
  {
    id: 'simulate',
    title: 'Options & Launch Check',
    instruction:
      'Open Options or click Simulate in the top-right bar to check crew size, budget, and launch readiness.',
    icon: <Play className="w-4 h-4 text-emerald-400" />,
    onEnter: { openHeaderMenu: 'none' },
    getChecks: (p) => [
      { label: 'Open Options or Simulate check', done: p.checkedOptionsOrLaunch },
    ],
  },
];

interface TutorialModalProps {
  currentStepIndex: number;
  progress: TutorialProgressState;
  onStepChange: (index: number) => void;
  onExecuteAction: (action: TutorialStepAction) => void;
  onClose: () => void;
}

interface PointerSpec {
  selector: string;
  fallbackSelector?: string;
  label: string;
  placement: 'below' | 'above' | 'canvas';
}

function getActivePointerSpec(
  stepId: string,
  progress: TutorialProgressState,
  isStepComplete: boolean
): PointerSpec | null {
  if (isStepComplete) return null;

  switch (stepId) {
    case 'telemetry':
      return {
        selector: '[data-tutorial-target="balances"]',
        label: 'Click Balances',
        placement: 'below',
      };
    case 'catalog':
      return {
        selector: '[data-tutorial-target="catalog-card"]',
        fallbackSelector: '[data-tutorial-target="open-dock-btn"]',
        label: 'Pick any module',
        placement: 'above',
      };
    case 'place':
      if (!progress.rotatedModule) {
        return {
          selector: '[data-tutorial-target="rotate-btn"]',
          fallbackSelector: '[data-tutorial-target="catalog-card"]',
          label: 'Click Rotate 90°',
          placement: 'above',
        };
      }
      return {
        selector: '[data-testid="three-canvas-container"]',
        label: 'Click any green Mars tile',
        placement: 'canvas',
      };
    case 'inspect':
      return {
        selector: '[data-testid="three-canvas-container"]',
        label: 'Click any 3D module on Mars',
        placement: 'canvas',
      };
    case 'radar':
      return {
        selector: '[data-tutorial-target="radar-btn"]',
        label: 'Click Orbital Radar',
        placement: 'below',
      };
    case 'simulate':
      return {
        selector: '[data-tutorial-target="options-btn"]',
        fallbackSelector: '[data-tutorial-target="simulate-btn"]',
        label: 'Click Options or Simulate',
        placement: 'below',
      };
    default:
      return null;
  }
}

interface TargetRectState {
  left: number;
  top: number;
  width: number;
  height: number;
  vw: number;
  vh: number;
}

const TutorialPointerOverlay: React.FC<{ spec: PointerSpec | null }> = ({ spec }) => {
  const [rectState, setRectState] = React.useState<TargetRectState | null>(null);
  const [reducedMotion, setReducedMotion] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  React.useEffect(() => {
    if (!spec) {
      setRectState(null);
      return;
    }

    let rafId = 0;
    const measure = () => {
      const el =
        document.querySelector(spec.selector) ||
        (spec.fallbackSelector ? document.querySelector(spec.fallbackSelector) : null);

      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          setRectState((prev) => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            if (
              prev &&
              Math.abs(prev.left - r.left) < 0.5 &&
              Math.abs(prev.top - r.top) < 0.5 &&
              Math.abs(prev.width - r.width) < 0.5 &&
              Math.abs(prev.height - r.height) < 0.5 &&
              prev.vw === vw &&
              prev.vh === vh
            ) {
              return prev;
            }
            return { left: r.left, top: r.top, width: r.width, height: r.height, vw, vh };
          });
        } else {
          setRectState(null);
        }
      } else {
        setRectState(null);
      }
      rafId = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', measure);
    };
  }, [spec]);

  if (!spec || !rectState) return null;

  const { left, top, width, height, vw, vh } = rectState;

  if (spec.placement === 'canvas') {
    const cx = Math.min(vw - 120, Math.max(left + width * 0.54, 380));
    const cy = Math.min(vh - 210, Math.max(top + height * 0.44, 175));
    return (
      <div
        className="fixed z-40 pointer-events-none select-none flex flex-col items-center"
        style={{ left: cx, top: cy, transform: 'translate(-50%, -100%)' }}
      >
        <div className="px-3 py-1.5 rounded-lg bg-[#7C3AED] text-white text-xs font-semibold shadow-[0_10px_24px_rgba(0,0,0,0.55)] border border-violet-300/40 whitespace-nowrap">
          {spec.label}
        </div>
        <svg
          width="32"
          height="36"
          viewBox="0 0 32 36"
          fill="none"
          className={reducedMotion ? 'mt-0.5' : 'mt-0.5 animate-bounce'}
          aria-hidden="true"
        >
          <path
            d="M16 2V30M16 30L6 20M16 30L26 20"
            stroke="#A78BFA"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  const centerX = left + width / 2;
  const clampedLabelCenterX = Math.min(vw - 108, Math.max(108, centerX));

  if (spec.placement === 'below') {
    const arrowTop = bottomPos(top, height) + 6;
    return (
      <>
        <div
          className="fixed z-40 pointer-events-none rounded-xl border-2 border-[#A78BFA] shadow-[0_0_0_2px_rgba(124,58,237,0.28)]"
          style={{
            left: left - 4,
            top: top - 4,
            width: width + 8,
            height: height + 8,
          }}
        />
        <div
          className="fixed z-40 pointer-events-none select-none flex flex-col items-center"
          style={{
            left: centerX,
            top: arrowTop,
            transform: 'translateX(-50%)',
          }}
        >
          <svg
            width="28"
            height="30"
            viewBox="0 0 28 30"
            fill="none"
            className={reducedMotion ? '' : 'animate-bounce'}
            aria-hidden="true"
          >
            <path
              d="M14 28V4M14 4L5 13M14 4L23 13"
              stroke="#A78BFA"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div
          className="fixed z-40 pointer-events-none select-none px-2.5 py-1 rounded-lg bg-[#7C3AED] text-white text-xs font-semibold shadow-[0_10px_24px_rgba(0,0,0,0.55)] border border-violet-300/40 whitespace-nowrap"
          style={{
            left: clampedLabelCenterX,
            top: arrowTop + 32,
            transform: 'translateX(-50%)',
          }}
        >
          {spec.label}
        </div>
      </>
    );
  }

  // placement === 'above' (pointing DOWN at bottom catalog card / Rotate 90° button)
  const arrowBottomY = top - 6;
  return (
    <>
      <div
        className="fixed z-40 pointer-events-none rounded-xl border-2 border-[#A78BFA] shadow-[0_0_0_2px_rgba(124,58,237,0.28)]"
        style={{
          left: left - 4,
          top: top - 4,
          width: width + 8,
          height: height + 8,
        }}
      />
      <div
        className="fixed z-40 pointer-events-none select-none px-2.5 py-1 rounded-lg bg-[#7C3AED] text-white text-xs font-semibold shadow-[0_10px_24px_rgba(0,0,0,0.55)] border border-violet-300/40 whitespace-nowrap"
        style={{
          left: clampedLabelCenterX,
          top: arrowBottomY - 62,
          transform: 'translateX(-50%)',
        }}
      >
        {spec.label}
      </div>
      <div
        className="fixed z-40 pointer-events-none select-none flex flex-col items-center"
        style={{
          left: centerX,
          top: arrowBottomY - 32,
          transform: 'translateX(-50%)',
        }}
      >
        <svg
          width="28"
          height="30"
          viewBox="0 0 28 30"
          fill="none"
          className={reducedMotion ? '' : 'animate-bounce'}
          aria-hidden="true"
        >
          <path
            d="M14 2V26M14 26L5 17M14 26L23 17"
            stroke="#A78BFA"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </>
  );
};

function bottomPos(top: number, height: number): number {
  return top + height;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({
  currentStepIndex,
  progress,
  onStepChange,
  onExecuteAction,
  onClose,
}) => {
  const step = TUTORIAL_STEPS[currentStepIndex] || TUTORIAL_STEPS[0];
  const isLast = currentStepIndex === TUTORIAL_STEPS.length - 1;
  const checks = step.getChecks(progress);
  const isStepComplete = checks.every((c) => c.done);
  const pointerSpec = getActivePointerSpec(step.id, progress, isStepComplete);

  const handleNext = () => {
    if (!isStepComplete) return;
    audioManager.playClick();
    if (isLast) {
      onClose();
      return;
    }
    const nextIdx = currentStepIndex + 1;
    onStepChange(nextIdx);
    const nextStep = TUTORIAL_STEPS[nextIdx];
    if (nextStep?.onEnter) {
      onExecuteAction(nextStep.onEnter);
    }
  };

  const handleSkipStep = () => {
    audioManager.playClick();
    if (isLast) {
      onClose();
      return;
    }
    const nextIdx = currentStepIndex + 1;
    onStepChange(nextIdx);
    const nextStep = TUTORIAL_STEPS[nextIdx];
    if (nextStep?.onEnter) {
      onExecuteAction(nextStep.onEnter);
    }
  };

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <TutorialPointerOverlay spec={pointerSpec} />

      <aside
        aria-label="Interactive Mission Guide"
        className="pointer-events-auto absolute top-20 left-4 w-[min(92vw,340px)] rounded-xl bg-[#0B0914]/95 border border-[#C4B5FD]/[0.16] shadow-[0_18px_42px_rgba(0,0,0,0.72)] overflow-hidden flex flex-col text-left"
      >
        {/* Clean Minimal Header */}
        <div className="px-4 py-3 border-b border-white/[0.08] bg-[#151121] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 rounded-lg bg-[#221D33] border border-white/[0.08] shrink-0">
              {step.icon}
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-[#8E87AB] tabular-nums">
                Guide · Step {currentStepIndex + 1} of {TUTORIAL_STEPS.length}
              </div>
              <h3 className="text-sm font-semibold text-[#F4F3F8] truncate">{step.title}</h3>
            </div>
          </div>

          <button
            onClick={() => {
              audioManager.playClick();
              onClose();
            }}
            className="p-1 rounded-lg text-[#8E87AB] hover:text-white hover:bg-[#221D33] transition-colors cursor-pointer shrink-0"
            aria-label="Exit guide"
            title="Exit Guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Strip */}
        <div className="px-4 pt-2.5 flex items-center gap-1">
          {TUTORIAL_STEPS.map((s, idx) => (
            <div
              key={s.id}
              className={`h-1 flex-1 rounded-full transition-colors ${
                idx < currentStepIndex
                  ? 'bg-emerald-400'
                  : idx === currentStepIndex
                  ? isStepComplete
                    ? 'bg-emerald-400'
                    : 'bg-[#7C3AED]'
                  : 'bg-white/[0.1]'
              }`}
            />
          ))}
        </div>

        {/* Single Clear Instruction + Mandatory Task Checklist */}
        <div className="p-4 space-y-3.5">
          <p className="text-xs text-[#E4E0F5] leading-relaxed">{step.instruction}</p>

          <div className="space-y-2 pt-2 border-t border-white/[0.07]">
            {checks.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-xs">
                {item.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-[#7C3AED] shrink-0" />
                )}
                <span className={item.done ? 'text-emerald-300 font-medium' : 'text-[#CFC9E6]'}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action-Gated Footer */}
        <div className="px-4 py-3 border-t border-white/[0.08] bg-[#080610] flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                audioManager.playClick();
                onClose();
              }}
              className="text-xs text-[#8E87AB] hover:text-white transition-colors cursor-pointer"
            >
              Exit Guide
            </button>

            {!isStepComplete && (
              <button
                onClick={handleSkipStep}
                className="text-xs text-[#A78BFA] hover:text-[#C4B5FD] transition-colors cursor-pointer"
              >
                {isLast ? 'Finish' : 'Skip Step'}
              </button>
            )}
          </div>

          <button
            onClick={handleNext}
            disabled={!isStepComplete}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              isStepComplete
                ? isLast
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                  : 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white cursor-pointer'
                : 'bg-[#151121] text-[#6E678A] border border-white/[0.07] cursor-not-allowed'
            }`}
          >
            {!isStepComplete && <Lock className="w-3 h-3" />}
            <span>
              {isStepComplete
                ? isLast
                  ? 'Finish Guide'
                  : 'Next Step'
                : 'Complete Task'}
            </span>
            {isStepComplete && !isLast && <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </aside>
    </div>
  );
};
