import { render, screen, fireEvent } from '@/tests/helpers/render';
import { Modal } from './Modal';

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  title: 'Test Modal',
  children: <p>Modal content</p>,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Modal', () => {
  // --- Visibility ---

  it('renders nothing when isOpen is false', () => {
    render(<Modal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog when isOpen is true', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  // --- Content ---

  it('renders the title', () => {
    render(<Modal {...defaultProps} title="My Dialog" />);
    expect(screen.getByText('My Dialog')).toBeInTheDocument();
  });

  it('renders children inside the modal', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  // --- Accessibility ---

  it('has role="dialog" and aria-modal="true"', () => {
    render(<Modal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('links the title via aria-labelledby', () => {
    render(<Modal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    expect(document.getElementById('modal-title')).toHaveTextContent('Test Modal');
  });

  // --- Close interactions ---

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    // The backdrop is the sibling div before the panel
    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the X button is clicked', () => {
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose on Escape when modal is closed', () => {
    const onClose = jest.fn();
    render(<Modal {...defaultProps} isOpen={false} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  // --- Size variants ---

  it('applies sm size class', () => {
    render(<Modal {...defaultProps} size="sm" />);
    expect(screen.getByRole('dialog').className).toContain('max-w-sm');
  });

  it('applies md size class by default', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByRole('dialog').className).toContain('max-w-lg');
  });

  it('applies lg size class', () => {
    render(<Modal {...defaultProps} size="lg" />);
    expect(screen.getByRole('dialog').className).toContain('max-w-2xl');
  });

  it('applies xl size class', () => {
    render(<Modal {...defaultProps} size="xl" />);
    expect(screen.getByRole('dialog').className).toContain('max-w-4xl');
  });
});
