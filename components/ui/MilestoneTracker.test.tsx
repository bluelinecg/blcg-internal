import { render, screen } from '@/tests/helpers/render';
import { MilestoneTracker } from './MilestoneTracker';
import { createMockMilestone } from '@/tests/helpers/factories';
import type { Milestone } from '@/lib/types/projects';

describe('MilestoneTracker', () => {
  // --- Rendering ---

  it('renders all milestone names', () => {
    const milestones: Milestone[] = [
      createMockMilestone({ id: 'm-1', name: 'Discovery', order: 1 }),
      createMockMilestone({ id: 'm-2', name: 'Design', order: 2 }),
      createMockMilestone({ id: 'm-3', name: 'Development', order: 3 }),
    ];
    render(<MilestoneTracker milestones={milestones} />);
    expect(screen.getByText('Discovery')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
    expect(screen.getByText('Development')).toBeInTheDocument();
  });

  it('renders nothing when milestones array is empty', () => {
    const { container } = render(<MilestoneTracker milestones={[]} />);
    // The wrapper div should be empty (no milestone items)
    expect(container.querySelectorAll('[class*="flex-1 flex-col"]')).toHaveLength(0);
  });

  // --- Status labels ---

  it('shows "Completed" label for a completed milestone', () => {
    const milestones = [createMockMilestone({ status: 'completed' })];
    render(<MilestoneTracker milestones={milestones} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('shows "In Progress" label for an in_progress milestone', () => {
    const milestones = [createMockMilestone({ status: 'in_progress' })];
    render(<MilestoneTracker milestones={milestones} />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('shows "Blocked" label for a blocked milestone', () => {
    const milestones = [createMockMilestone({ status: 'blocked' })];
    render(<MilestoneTracker milestones={milestones} />);
    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });

  it('shows "Pending" label for a pending milestone', () => {
    const milestones = [createMockMilestone({ status: 'pending' })];
    render(<MilestoneTracker milestones={milestones} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  // --- Order sorting ---

  it('renders milestones sorted by order, not insertion order', () => {
    const milestones: Milestone[] = [
      createMockMilestone({ id: 'm-3', name: 'Launch', order: 3 }),
      createMockMilestone({ id: 'm-1', name: 'Discovery', order: 1 }),
      createMockMilestone({ id: 'm-2', name: 'Build', order: 2 }),
    ];
    render(<MilestoneTracker milestones={milestones} />);
    const names = screen.getAllByText(/Discovery|Build|Launch/).map((el) => el.textContent);
    expect(names).toEqual(['Discovery', 'Build', 'Launch']);
  });

  // --- Due dates ---

  it('renders a due date when provided', () => {
    // Use noon UTC so the date renders as Jun 15 in all timezones
    const milestones = [
      createMockMilestone({ dueDate: '2026-06-15T12:00:00Z' }),
    ];
    render(<MilestoneTracker milestones={milestones} />);
    // The component formats it as 'Jun 15' (short month + day)
    expect(screen.getByText('Jun 15')).toBeInTheDocument();
  });

  it('does not render a date when dueDate is omitted', () => {
    const milestones = [createMockMilestone({ dueDate: undefined })];
    render(<MilestoneTracker milestones={milestones} />);
    // No date text should appear — only the name and status label
    expect(screen.queryByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)).not.toBeInTheDocument();
  });

  // --- Custom className ---

  it('merges additional className onto the wrapper', () => {
    const milestones = [createMockMilestone()];
    const { container } = render(
      <MilestoneTracker milestones={milestones} className="mt-8" />,
    );
    expect(container.firstChild).toHaveClass('mt-8');
  });
});
