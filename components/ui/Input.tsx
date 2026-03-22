// Text input with optional label and inline error message.
// Props:
//   label — visible label rendered above the input
//   error — validation error message rendered below the input
//   id    — ties label to input (required when label is used)
//   ...   — all standard HTMLInputElement attributes

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`rounded-md border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed ${
          error ? 'border-red-400' : 'border-gray-300'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
