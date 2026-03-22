import { render, screen } from '@/tests/helpers/render';
import { Card } from './Card';

describe('Card', () => {
  it('renders its children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders a <div> element', () => {
    render(<Card>Content</Card>);
    expect(screen.getByText('Content').tagName).toBe('DIV');
  });

  it('applies base surface classes', () => {
    render(<Card>Content</Card>);
    const el = screen.getByText('Content');
    expect(el.className).toContain('rounded-lg');
    expect(el.className).toContain('bg-white');
    expect(el.className).toContain('border-gray-200');
    expect(el.className).toContain('shadow-sm');
  });

  it('merges additional className onto the wrapper', () => {
    render(<Card className="p-6 mt-4">Content</Card>);
    const el = screen.getByText('Content');
    expect(el.className).toContain('p-6');
    expect(el.className).toContain('mt-4');
  });

  it('renders complex children', () => {
    render(
      <Card>
        <h2>Title</h2>
        <p>Body text</p>
      </Card>,
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Body text')).toBeInTheDocument();
  });
});
