// PageHeader renders the title section at the top of a dashboard page.
// Props:
//   title    — primary page heading (required)
//   subtitle — optional secondary description line
//   actions  — optional slot for buttons or controls rendered on the right

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3">{actions}</div>
      )}
    </div>
  );
}
