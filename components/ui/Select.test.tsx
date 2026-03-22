import { render, screen } from '@/tests/helpers/render';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

const OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'prospect', label: 'Prospect' },
];

describe('Select', () => {
  // --- Rendering ---

  it('renders a <select> element', () => {
    render(<Select options={OPTIONS} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders all provided options', () => {
    render(<Select options={OPTIONS} />);
    expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Inactive' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Prospect' })).toBeInTheDocument();
  });

  it('renders with empty options array without crashing', () => {
    render(<Select options={[]} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  // --- Label ---

  it('renders a label when the label prop is provided', () => {
    render(<Select id="status" label="Status" options={OPTIONS} />);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('associates the label with the select via htmlFor/id', () => {
    render(<Select id="status" label="Status" options={OPTIONS} />);
    expect(screen.getByText('Status')).toHaveAttribute('for', 'status');
  });

  it('does not render a label when omitted', () => {
    render(<Select options={OPTIONS} />);
    expect(screen.queryByRole('label')).not.toBeInTheDocument();
  });

  // --- Error state ---

  it('renders an error message when the error prop is provided', () => {
    render(<Select options={OPTIONS} error="Selection required" />);
    expect(screen.getByText('Selection required')).toBeInTheDocument();
  });

  it('applies red border when error is present', () => {
    render(<Select options={OPTIONS} error="Required" />);
    expect(screen.getByRole('combobox').className).toContain('border-red-400');
  });

  it('applies normal border when no error', () => {
    render(<Select options={OPTIONS} />);
    expect(screen.getByRole('combobox').className).toContain('border-gray-300');
  });

  // --- Interactions ---

  it('calls onChange when the user selects an option', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Select options={OPTIONS} onChange={onChange} />);
    await user.selectOptions(screen.getByRole('combobox'), 'inactive');
    expect(onChange).toHaveBeenCalled();
  });

  it('shows the selected value', async () => {
    const user = userEvent.setup();
    render(<Select options={OPTIONS} />);
    await user.selectOptions(screen.getByRole('combobox'), 'prospect');
    expect(screen.getByRole('combobox')).toHaveValue('prospect');
  });

  // --- Disabled ---

  it('is disabled when the disabled prop is set', () => {
    render(<Select options={OPTIONS} disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
