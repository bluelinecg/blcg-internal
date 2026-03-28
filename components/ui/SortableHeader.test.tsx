import { render, screen, fireEvent } from '@/tests/helpers/render';
import { SortableHeader } from './SortableHeader';

describe('SortableHeader', () => {
  // --- Rendering ---

  it('renders the column label', () => {
    render(
      <table><thead><tr>
        <SortableHeader column="name" currentSort="name" order="asc" onSort={jest.fn()}>
          Name
        </SortableHeader>
      </tr></thead></table>,
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('renders a <th> element', () => {
    render(
      <table><thead><tr>
        <SortableHeader column="name" currentSort="name" order="asc" onSort={jest.fn()}>
          Name
        </SortableHeader>
      </tr></thead></table>,
    );
    expect(screen.getByRole('columnheader')).toBeInTheDocument();
  });

  // --- Sort indicators ---

  it('shows ↕ when the column is not the active sort', () => {
    render(
      <table><thead><tr>
        <SortableHeader column="name" currentSort="status" order="asc" onSort={jest.fn()}>
          Name
        </SortableHeader>
      </tr></thead></table>,
    );
    expect(screen.getByText(/↕/)).toBeInTheDocument();
  });

  it('shows ↑ when the column is active and order is asc', () => {
    render(
      <table><thead><tr>
        <SortableHeader column="name" currentSort="name" order="asc" onSort={jest.fn()}>
          Name
        </SortableHeader>
      </tr></thead></table>,
    );
    expect(screen.getByText(/↑/)).toBeInTheDocument();
  });

  it('shows ↓ when the column is active and order is desc', () => {
    render(
      <table><thead><tr>
        <SortableHeader column="name" currentSort="name" order="desc" onSort={jest.fn()}>
          Name
        </SortableHeader>
      </tr></thead></table>,
    );
    expect(screen.getByText(/↓/)).toBeInTheDocument();
  });

  // --- onSort ---

  it('calls onSort with the column name when clicked', () => {
    const onSort = jest.fn();
    render(
      <table><thead><tr>
        <SortableHeader column="name" currentSort="status" order="asc" onSort={onSort}>
          Name
        </SortableHeader>
      </tr></thead></table>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onSort).toHaveBeenCalledWith('name');
  });

  it('calls onSort with the correct column when multiple headers are rendered', () => {
    const onSort = jest.fn();
    render(
      <table><thead><tr>
        <SortableHeader column="name" currentSort="name" order="asc" onSort={onSort}>Name</SortableHeader>
        <SortableHeader column="date" currentSort="name" order="asc" onSort={onSort}>Date</SortableHeader>
      </tr></thead></table>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Date/ }));
    expect(onSort).toHaveBeenCalledWith('date');
  });

  // --- Active vs inactive styling ---

  it('applies text-gray-900 to the button when active', () => {
    render(
      <table><thead><tr>
        <SortableHeader column="name" currentSort="name" order="asc" onSort={jest.fn()}>
          Name
        </SortableHeader>
      </tr></thead></table>,
    );
    expect(screen.getByRole('button').className).toContain('text-gray-900');
  });

  it('applies text-gray-500 to the button when inactive', () => {
    render(
      <table><thead><tr>
        <SortableHeader column="name" currentSort="status" order="asc" onSort={jest.fn()}>
          Name
        </SortableHeader>
      </tr></thead></table>,
    );
    expect(screen.getByRole('button').className).toContain('text-gray-500');
  });

  // --- Alignment ---

  it('applies text-left to the <th> by default', () => {
    render(
      <table><thead><tr>
        <SortableHeader column="name" currentSort="name" order="asc" onSort={jest.fn()}>
          Name
        </SortableHeader>
      </tr></thead></table>,
    );
    expect(screen.getByRole('columnheader').className).toContain('text-left');
  });

  it('applies text-right to the <th> when align="right"', () => {
    render(
      <table><thead><tr>
        <SortableHeader column="amount" currentSort="name" order="asc" onSort={jest.fn()} align="right">
          Amount
        </SortableHeader>
      </tr></thead></table>,
    );
    expect(screen.getByRole('columnheader').className).toContain('text-right');
  });

  it('applies text-center to the <th> when align="center"', () => {
    render(
      <table><thead><tr>
        <SortableHeader column="status" currentSort="name" order="asc" onSort={jest.fn()} align="center">
          Status
        </SortableHeader>
      </tr></thead></table>,
    );
    expect(screen.getByRole('columnheader').className).toContain('text-center');
  });

  // --- className ---

  it('applies a custom className to the <th>', () => {
    render(
      <table><thead><tr>
        <SortableHeader column="name" currentSort="name" order="asc" onSort={jest.fn()} className="w-48">
          Name
        </SortableHeader>
      </tr></thead></table>,
    );
    expect(screen.getByRole('columnheader').className).toContain('w-48');
  });
});
