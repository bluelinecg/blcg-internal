import { render, screen, fireEvent } from '@/tests/helpers/render';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  // --- Null rendering ---

  it('returns null when totalPages is 1', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onPageChange={jest.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when totalPages is 0', () => {
    const { container } = render(
      <Pagination page={1} totalPages={0} onPageChange={jest.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  // --- Button rendering ---

  it('renders a Prev button', () => {
    render(<Pagination page={2} totalPages={5} onPageChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: '← Prev' })).toBeInTheDocument();
  });

  it('renders a Next button', () => {
    render(<Pagination page={2} totalPages={5} onPageChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Next →' })).toBeInTheDocument();
  });

  // --- Disabled states ---

  it('disables Prev on the first page', () => {
    render(<Pagination page={1} totalPages={5} onPageChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: '← Prev' })).toBeDisabled();
  });

  it('does not disable Prev after the first page', () => {
    render(<Pagination page={2} totalPages={5} onPageChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: '← Prev' })).not.toBeDisabled();
  });

  it('disables Next on the last page', () => {
    render(<Pagination page={5} totalPages={5} onPageChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Next →' })).toBeDisabled();
  });

  it('does not disable Next before the last page', () => {
    render(<Pagination page={4} totalPages={5} onPageChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Next →' })).not.toBeDisabled();
  });

  // --- onPageChange ---

  it('calls onPageChange with page - 1 when Prev is clicked', () => {
    const onPageChange = jest.fn();
    render(<Pagination page={3} totalPages={5} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: '← Prev' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange with page + 1 when Next is clicked', () => {
    const onPageChange = jest.fn();
    render(<Pagination page={3} totalPages={5} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next →' }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('calls onPageChange with the correct page when a numbered button is clicked', () => {
    const onPageChange = jest.fn();
    render(<Pagination page={1} totalPages={3} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  // --- Active page ---

  it('marks the current page button as active (bg-brand-blue)', () => {
    render(<Pagination page={2} totalPages={3} onPageChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: '2' }).className).toContain('bg-brand-blue');
  });

  it('does not mark inactive page buttons as active', () => {
    render(<Pagination page={2} totalPages={3} onPageChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: '1' }).className).not.toContain('bg-brand-blue');
  });

  // --- Page range / ellipsis ---

  it('renders all pages when the total is small', () => {
    render(<Pagination page={1} totalPages={3} onPageChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
  });

  it('renders ellipsis when pages are omitted on the right', () => {
    render(<Pagination page={1} totalPages={10} onPageChange={jest.fn()} />);
    expect(screen.getAllByText('…').length).toBeGreaterThan(0);
  });

  it('renders ellipsis when pages are omitted on the left', () => {
    render(<Pagination page={10} totalPages={10} onPageChange={jest.fn()} />);
    expect(screen.getAllByText('…').length).toBeGreaterThan(0);
  });

  it('always renders the first and last page buttons', () => {
    render(<Pagination page={5} totalPages={10} onPageChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument();
  });

  // --- siblingCount ---

  it('respects a larger siblingCount by showing more pages around current', () => {
    render(
      <Pagination page={5} totalPages={10} onPageChange={jest.fn()} siblingCount={2} />,
    );
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7' })).toBeInTheDocument();
  });

  // --- className ---

  it('applies a custom className to the wrapper', () => {
    const { container } = render(
      <Pagination page={2} totalPages={5} onPageChange={jest.fn()} className="my-custom" />,
    );
    expect(container.firstChild).toHaveClass('my-custom');
  });
});
