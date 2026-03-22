import { render, screen, fireEvent } from '@/tests/helpers/render';
import { Button } from './Button';

describe('Button', () => {
  // --- Rendering ---

  it('renders its children', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('renders a native <button> element', () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole('button')).toBeInstanceOf(HTMLButtonElement);
  });

  // --- Variants ---

  it('applies primary variant classes by default', () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-brand-blue');
  });

  it('applies secondary variant classes', () => {
    render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button').className).toContain('bg-white');
  });

  it('applies ghost variant classes', () => {
    render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button').className).toContain('bg-transparent');
  });

  it('applies danger variant classes', () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole('button').className).toContain('bg-red-600');
  });

  // --- Sizes ---

  it('applies md size classes by default', () => {
    render(<Button>Medium</Button>);
    expect(screen.getByRole('button').className).toContain('px-4');
  });

  it('applies sm size classes', () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button').className).toContain('px-3');
  });

  it('applies lg size classes', () => {
    render(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button').className).toContain('px-5');
  });

  // --- Custom className ---

  it('merges additional className onto the button', () => {
    render(<Button className="custom-class">Styled</Button>);
    expect(screen.getByRole('button').className).toContain('custom-class');
  });

  // --- Interactions ---

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick} disabled>Disabled</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  // --- Disabled state ---

  it('is disabled when the disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies disabled opacity class', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button').className).toContain('disabled:opacity-50');
  });

  // --- Native button attributes ---

  it('forwards type attribute', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });
});
