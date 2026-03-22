// Animated loading spinner.
// Props:
//   size — 'sm' | 'md' | 'lg' (default: 'md')

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function Spinner({ size = 'md' }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin text-brand-blue ${SIZE_CLASSES[size]}`}
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8H4z"
      />
    </svg>
  );
}
