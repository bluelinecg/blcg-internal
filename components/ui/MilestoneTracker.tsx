// Visual horizontal milestone progress tracker.
// Renders a step-by-step timeline with status indicators.
// Suitable for project detail pages, onboarding flows, etc.
//
// Props:
//   milestones — ordered array of milestone items
//   className  — optional wrapper Tailwind classes

import type { Milestone, MilestoneStatus } from '@/lib/types/projects';

const STATUS_CONFIG: Record<
  MilestoneStatus,
  { dotClass: string; label: string; lineClass: string }
> = {
  completed: {
    dotClass: 'bg-green-500 border-green-500 text-white',
    label: 'Completed',
    lineClass: 'bg-green-400',
  },
  in_progress: {
    dotClass: 'bg-brand-blue border-brand-blue text-white',
    label: 'In Progress',
    lineClass: 'bg-gray-200',
  },
  blocked: {
    dotClass: 'bg-red-500 border-red-500 text-white',
    label: 'Blocked',
    lineClass: 'bg-gray-200',
  },
  pending: {
    dotClass: 'bg-white border-gray-300 text-gray-400',
    label: 'Pending',
    lineClass: 'bg-gray-200',
  },
};

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DotIcon() {
  return <span className="w-2 h-2 rounded-full bg-current" />;
}

interface MilestoneTrackerProps {
  milestones: Milestone[];
  className?: string;
}

export function MilestoneTracker({ milestones, className = '' }: MilestoneTrackerProps) {
  const sorted = [...milestones].sort((a, b) => a.order - b.order);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-start">
        {sorted.map((milestone, index) => {
          const cfg = STATUS_CONFIG[milestone.status];
          const isLast = index === sorted.length - 1;

          return (
            <div key={milestone.id} className="flex flex-1 flex-col items-center">
              {/* Dot + connector line */}
              <div className="flex w-full items-center">
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 z-10 ${cfg.dotClass}`}
                >
                  {milestone.status === 'completed' ? <CheckIcon /> : <DotIcon />}
                </div>
                {!isLast && (
                  <div className={`flex-1 h-0.5 ${cfg.lineClass}`} />
                )}
              </div>

              {/* Label */}
              <div className="mt-2 px-1 text-center">
                <p className="text-xs font-semibold text-gray-800 leading-tight">{milestone.name}</p>
                {milestone.dueDate && (
                  <p className="mt-0.5 text-xs text-gray-400">
                    {new Date(milestone.dueDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                )}
                <p className={`mt-0.5 text-xs font-medium ${
                  milestone.status === 'completed' ? 'text-green-600' :
                  milestone.status === 'in_progress' ? 'text-brand-blue' :
                  milestone.status === 'blocked' ? 'text-red-600' :
                  'text-gray-400'
                }`}>
                  {cfg.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
