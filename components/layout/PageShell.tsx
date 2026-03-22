// PageShell wraps a page's content area with consistent padding and scroll behaviour.
// Use this as the outermost wrapper inside each dashboard page.
// Props:
//   children — page content

interface PageShellProps {
  children: React.ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="flex flex-col flex-1 overflow-y-auto px-8 py-6">
      {children}
    </div>
  );
}
