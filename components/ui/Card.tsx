// White surface container with border and shadow.
// Props:
//   children  — card content
//   className — additional Tailwind classes (e.g. 'p-6' for padding)

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}
