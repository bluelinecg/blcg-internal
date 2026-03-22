// Summary metric card for dashboard and overview pages.
// Props:
//   label     — metric label (e.g. "Active Clients")
//   value     — primary displayed value (string or number)
//   sub       — optional secondary line (e.g. "↑ 2 this month")
//   icon      — optional icon node rendered in the top-right
//   accent    — optional left-border accent color: 'blue' | 'green' | 'yellow' | 'red' (default: 'blue')

type AccentColor = 'blue' | 'green' | 'yellow' | 'red';

const ACCENT_CLASSES: Record<AccentColor, string> = {
  blue: 'border-l-brand-blue',
  green: 'border-l-green-500',
  yellow: 'border-l-yellow-400',
  red: 'border-l-red-500',
};

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  accent?: AccentColor;
}

export function StatCard({ label, value, sub, icon, accent = 'blue' }: StatCardProps) {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white shadow-sm border-l-4 px-5 py-4 ${ACCENT_CLASSES[accent]}`}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}
