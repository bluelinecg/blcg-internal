// PageShell wraps a page's content area with consistent padding and scroll behaviour.
// Use this as the outermost wrapper inside each dashboard page.
// Props:
//   children  — page content
//   scrollable — when false, disables page-level scroll so inner regions can manage their own overflow (e.g. Kanban boards)

interface PageShellProps {
  children: React.ReactNode;
  scrollable?: boolean;
}

export function PageShell({ children, scrollable = true }: PageShellProps) {
  return (
    <div className={`flex flex-col flex-1 px-4 py-4 md:px-8 md:py-6 ${scrollable ? 'overflow-y-auto' : 'overflow-hidden'}`}>
      {children}
    </div>
  );
}
