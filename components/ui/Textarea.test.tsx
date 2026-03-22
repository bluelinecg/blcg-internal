import { render, screen } from '@/tests/helpers/render';
import userEvent from '@testing-library/user-event';
import { Textarea } from './Textarea';

describe('Textarea', () => {
  it('renders a <textarea> element', () => {
    render(<Textarea />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders a label when the label prop is provided', () => {
    render(<Textarea id="notes" label="Notes" />);
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('associates the label with the textarea via htmlFor/id', () => {
    render(<Textarea id="notes" label="Notes" />);
    expect(screen.getByText('Notes')).toHaveAttribute('for', 'notes');
  });

  it('renders an error message when the error prop is provided', () => {
    render(<Textarea error="Notes are required" />);
    expect(screen.getByText('Notes are required')).toBeInTheDocument();
  });

  it('applies red border class when error is present', () => {
    render(<Textarea error="Required" />);
    expect(screen.getByRole('textbox').className).toContain('border-red-400');
  });

  it('applies normal border class when no error', () => {
    render(<Textarea />);
    expect(screen.getByRole('textbox').className).toContain('border-gray-300');
  });

  it('defaults to 4 rows', () => {
    render(<Textarea />);
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '4');
  });

  it('accepts typed input', async () => {
    const user = userEvent.setup();
    render(<Textarea />);
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Some notes here');
    expect(textarea).toHaveValue('Some notes here');
  });

  it('is disabled when the disabled prop is set', () => {
    render(<Textarea disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('merges additional className', () => {
    render(<Textarea className="h-32" />);
    expect(screen.getByRole('textbox').className).toContain('h-32');
  });
});
