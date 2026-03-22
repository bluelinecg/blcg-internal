import { render, screen } from '@/tests/helpers/render';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  // --- Required fields ---

  it('renders the metric label', () => {
    render(<StatCard label="Active Clients" value={12} />);
    expect(screen.getByText('Active Clients')).toBeInTheDocument();
  });

  it('renders a numeric value', () => {
    render(<StatCard label="Invoices" value={7} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders a string value', () => {
    render(<StatCard label="Revenue" value="$24,500" />);
    expect(screen.getByText('$24,500')).toBeInTheDocument();
  });

  // --- Optional fields ---

  it('renders the sub text when provided', () => {
    render(<StatCard label="Clients" value={5} sub="↑ 2 this month" />);
    expect(screen.getByText('↑ 2 this month')).toBeInTheDocument();
  });

  it('does not render sub text when omitted', () => {
    render(<StatCard label="Clients" value={5} />);
    expect(screen.queryByText(/this month/i)).not.toBeInTheDocument();
  });

  it('renders an icon when provided', () => {
    render(<StatCard label="Tasks" value={3} icon={<svg data-testid="icon" />} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('does not render icon area content when icon is omitted', () => {
    render(<StatCard label="Tasks" value={3} />);
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
  });

  // --- Accent colors ---

  it('applies blue accent border class by default', () => {
    const { container } = render(<StatCard label="Stat" value={0} />);
    expect(container.firstChild).toHaveClass('border-l-brand-blue');
  });

  it('applies green accent border class', () => {
    const { container } = render(<StatCard label="Stat" value={0} accent="green" />);
    expect(container.firstChild).toHaveClass('border-l-green-500');
  });

  it('applies yellow accent border class', () => {
    const { container } = render(<StatCard label="Stat" value={0} accent="yellow" />);
    expect(container.firstChild).toHaveClass('border-l-yellow-400');
  });

  it('applies red accent border class', () => {
    const { container } = render(<StatCard label="Stat" value={0} accent="red" />);
    expect(container.firstChild).toHaveClass('border-l-red-500');
  });
});
