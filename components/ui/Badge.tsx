// Small inline label for status or category display.
// Props:
//   variant  — color scheme: 'green' | 'blue' | 'yellow' | 'red' | 'gray' (default: 'gray')
//   children — badge text

interface BadgeProps {
  variant?: 'green' | 'blue' | 'yellow' | 'red' | 'gray';
  children: React.ReactNode;
}

const VARIANT_CLASSES: Record<NonNullable<BadgeProps['variant']>, string> = {
  green: 'bg-green-100 text-green-800',
  blue: 'bg-brand-blue/10 text-brand-blue',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-700',
};

export function Badge({ variant = 'gray', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  );
}
