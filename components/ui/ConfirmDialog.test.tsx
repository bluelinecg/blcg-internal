import { render, screen, fireEvent } from '@/tests/helpers/render';
import { ConfirmDialog } from './ConfirmDialog';

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onConfirm: jest.fn(),
  title: 'Delete Client',
  description: 'This action cannot be undone.',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ConfirmDialog', () => {
  // --- Visibility ---

  it('renders nothing when isOpen is false', () => {
    render(<ConfirmDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog when isOpen is true', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  // --- Content ---

  it('renders the title', () => {
    render(<ConfirmDialog {...defaultProps} title="Remove User" />);
    expect(screen.getByText('Remove User')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<ConfirmDialog {...defaultProps} description="Are you sure?" />);
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  // --- Default confirm button ---

  it('shows "Delete" as the default confirm label', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('renders a custom confirmLabel', () => {
    render(<ConfirmDialog {...defaultProps} confirmLabel="Remove" />);
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  // --- Unblocked flow ---

  it('calls onConfirm when the confirm button is clicked (unblocked)', () => {
    const onConfirm = jest.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = jest.fn();
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not show the dependency list when blockedBy is empty', () => {
    render(<ConfirmDialog {...defaultProps} blockedBy={[]} />);
    expect(screen.queryByText(/Cannot delete/i)).not.toBeInTheDocument();
  });

  // --- Blocked flow (dependency-delete rule) ---

  it('shows the "Cannot delete" heading when blockedBy has items', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        blockedBy={['1 active proposal (resolve first)']}
      />,
    );
    expect(screen.getByText(/Cannot delete/i)).toBeInTheDocument();
  });

  it('renders each blocker as a list item', () => {
    const blockers = [
      '1 active proposal (resolve first)',
      '2 outstanding invoices',
    ];
    render(<ConfirmDialog {...defaultProps} blockedBy={blockers} />);
    expect(screen.getByText('1 active proposal (resolve first)')).toBeInTheDocument();
    expect(screen.getByText('2 outstanding invoices')).toBeInTheDocument();
  });

  it('disables the confirm button when blocked', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        blockedBy={['1 active project']}
      />,
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });

  it('does not call onConfirm when the confirm button is clicked while blocked', () => {
    const onConfirm = jest.fn();
    render(
      <ConfirmDialog
        {...defaultProps}
        onConfirm={onConfirm}
        blockedBy={['1 active project']}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('still allows Cancel when blocked', () => {
    const onClose = jest.fn();
    render(
      <ConfirmDialog
        {...defaultProps}
        onClose={onClose}
        blockedBy={['1 active project']}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
