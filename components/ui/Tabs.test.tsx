import { render, screen, fireEvent } from '@/tests/helpers/render';
import { Tabs, type TabItem } from './Tabs';

const TABS: TabItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'expenses', label: 'Expenses' },
];

describe('Tabs', () => {
  // --- Rendering ---

  it('renders all tab labels', () => {
    render(<Tabs tabs={TABS} activeTab="overview" onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Invoices' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expenses' })).toBeInTheDocument();
  });

  it('renders one button per tab', () => {
    render(<Tabs tabs={TABS} activeTab="overview" onChange={jest.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  // --- Active state ---

  it('applies active border/text classes to the active tab', () => {
    render(<Tabs tabs={TABS} activeTab="invoices" onChange={jest.fn()} />);
    const active = screen.getByRole('button', { name: 'Invoices' });
    expect(active.className).toContain('border-brand-blue');
    expect(active.className).toContain('text-brand-blue');
  });

  it('does not apply active classes to inactive tabs', () => {
    render(<Tabs tabs={TABS} activeTab="invoices" onChange={jest.fn()} />);
    const inactive = screen.getByRole('button', { name: 'Overview' });
    expect(inactive.className).not.toContain('border-brand-blue');
  });

  // --- Interactions ---

  it('calls onChange with the tab id when a tab is clicked', () => {
    const onChange = jest.fn();
    render(<Tabs tabs={TABS} activeTab="overview" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Invoices' }));
    expect(onChange).toHaveBeenCalledWith('invoices');
  });

  it('calls onChange when the already-active tab is clicked', () => {
    const onChange = jest.fn();
    render(<Tabs tabs={TABS} activeTab="overview" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    expect(onChange).toHaveBeenCalledWith('overview');
  });

  // --- Custom className ---

  it('merges additional className onto the wrapper', () => {
    const { container } = render(
      <Tabs tabs={TABS} activeTab="overview" onChange={jest.fn()} className="mt-4" />,
    );
    expect(container.firstChild).toHaveClass('mt-4');
  });

  // --- Empty tabs ---

  it('renders nothing inside the wrapper when tabs array is empty', () => {
    render(<Tabs tabs={[]} activeTab="" onChange={jest.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
