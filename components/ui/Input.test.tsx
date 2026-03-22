import { render, screen } from '@/tests/helpers/render';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  // --- Rendering ---

  it('renders an <input> element', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  // --- Label ---

  it('renders a label when the label prop is provided', () => {
    render(<Input id="email" label="Email Address" />);
    expect(screen.getByText('Email Address')).toBeInTheDocument();
  });

  it('does not render a label when the prop is omitted', () => {
    render(<Input />);
    expect(screen.queryByRole('label')).not.toBeInTheDocument();
  });

  it('associates the label with the input via htmlFor/id', () => {
    render(<Input id="email" label="Email" />);
    const label = screen.getByText('Email');
    expect(label).toHaveAttribute('for', 'email');
  });

  // --- Error state ---

  it('renders the error message when the error prop is provided', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('does not render an error message when error is omitted', () => {
    render(<Input />);
    expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
  });

  it('applies red border class when error is present', () => {
    render(<Input error="Invalid" />);
    expect(screen.getByRole('textbox').className).toContain('border-red-400');
  });

  it('applies normal border class when there is no error', () => {
    render(<Input />);
    expect(screen.getByRole('textbox').className).toContain('border-gray-300');
  });

  // --- Native attributes ---

  it('renders a placeholder', () => {
    render(<Input placeholder="Enter email" />);
    expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
  });

  it('is disabled when the disabled prop is set', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('accepts typed input', async () => {
    const user = userEvent.setup();
    render(<Input />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'hello');
    expect(input).toHaveValue('hello');
  });

  it('merges additional className', () => {
    render(<Input className="w-full" />);
    expect(screen.getByRole('textbox').className).toContain('w-full');
  });
});
