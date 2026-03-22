import { render, screen } from '@/tests/helpers/render';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders a <span> element', () => {
    render(<Badge>Label</Badge>);
    expect(screen.getByText('Label').tagName).toBe('SPAN');
  });

  it('applies gray variant classes by default', () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText('Default').className).toContain('bg-gray-100');
  });

  it('applies green variant classes', () => {
    render(<Badge variant="green">Active</Badge>);
    expect(screen.getByText('Active').className).toContain('bg-green-100');
    expect(screen.getByText('Active').className).toContain('text-green-800');
  });

  it('applies blue variant classes', () => {
    render(<Badge variant="blue">Info</Badge>);
    expect(screen.getByText('Info').className).toContain('text-brand-blue');
  });

  it('applies yellow variant classes', () => {
    render(<Badge variant="yellow">Pending</Badge>);
    expect(screen.getByText('Pending').className).toContain('bg-yellow-100');
    expect(screen.getByText('Pending').className).toContain('text-yellow-800');
  });

  it('applies red variant classes', () => {
    render(<Badge variant="red">Error</Badge>);
    expect(screen.getByText('Error').className).toContain('bg-red-100');
    expect(screen.getByText('Error').className).toContain('text-red-800');
  });

  it('applies gray variant classes explicitly', () => {
    render(<Badge variant="gray">Inactive</Badge>);
    expect(screen.getByText('Inactive').className).toContain('bg-gray-100');
    expect(screen.getByText('Inactive').className).toContain('text-gray-700');
  });
});
