// General-purpose button with variant and size options.
// Props:
//   variant  — visual style: 'primary' | 'secondary' | 'ghost' | 'danger' (default: 'primary')
//   size     — 'sm' | 'md' | 'lg' (default: 'md')
//   children — button label or content
//   ...      — all standard HTMLButtonElement attributes

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-brand-blue text-white border-transparent hover:bg-brand-blue/90',
  secondary: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
  ghost: 'bg-transparent text-gray-600 border-transparent hover:bg-gray-100',
  danger: 'bg-red-600 text-white border-transparent hover:bg-red-700',
};

const SIZE_CLASSES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md border font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
