import { render, screen } from '@/tests/helpers/render';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('renders an SVG element', () => {
    render(<Spinner />);
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('has an accessible aria-label of "Loading"', () => {
    render(<Spinner />);
    // SVG uses aria-label without an explicit role — query via label text
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('applies md size classes by default', () => {
    render(<Spinner />);
    // SVG className returns SVGAnimatedString — use getAttribute('class') for string comparison
    const cls = screen.getByLabelText('Loading').getAttribute('class') ?? '';
    expect(cls).toContain('w-6');
    expect(cls).toContain('h-6');
  });

  it('applies sm size classes', () => {
    render(<Spinner size="sm" />);
    const cls = screen.getByLabelText('Loading').getAttribute('class') ?? '';
    expect(cls).toContain('w-4');
    expect(cls).toContain('h-4');
  });

  it('applies lg size classes', () => {
    render(<Spinner size="lg" />);
    const cls = screen.getByLabelText('Loading').getAttribute('class') ?? '';
    expect(cls).toContain('w-8');
    expect(cls).toContain('h-8');
  });

  it('applies animate-spin class', () => {
    render(<Spinner />);
    const cls = screen.getByLabelText('Loading').getAttribute('class') ?? '';
    expect(cls).toContain('animate-spin');
  });
});
