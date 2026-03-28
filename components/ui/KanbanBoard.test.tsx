import { render, screen, fireEvent } from '@/tests/helpers/render';
import { KanbanBoard, type KanbanColumn } from './KanbanBoard';

interface Task {
  id: string;
  title: string;
  status: string;
}

const COLUMNS: KanbanColumn[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
];

const TASKS: Task[] = [
  { id: 'task-1', title: 'Write tests', status: 'todo' },
  { id: 'task-2', title: 'Review PR', status: 'in_progress' },
  { id: 'task-3', title: 'Deploy', status: 'done' },
];

const getItemId = (task: Task) => task.id;
const getItemColumn = (task: Task) => task.status;
const renderCard = (task: Task) => <div>{task.title}</div>;

describe('KanbanBoard', () => {
  // --- Column rendering ---

  it('renders all column labels', () => {
    render(
      <KanbanBoard
        columns={COLUMNS}
        items={TASKS}
        getItemId={getItemId}
        getItemColumn={getItemColumn}
        onMoveItem={jest.fn()}
        renderCard={renderCard}
      />,
    );
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('renders the correct item count badge per column', () => {
    render(
      <KanbanBoard
        columns={COLUMNS}
        items={TASKS}
        getItemId={getItemId}
        getItemColumn={getItemColumn}
        onMoveItem={jest.fn()}
        renderCard={renderCard}
      />,
    );
    // Each column header has a count badge — find them by their sibling text
    const todoBadge = screen.getByText('To Do').nextSibling;
    expect(todoBadge).toHaveTextContent('1');
  });

  // --- Item rendering ---

  it('renders items via renderCard in their correct column', () => {
    render(
      <KanbanBoard
        columns={COLUMNS}
        items={TASKS}
        getItemId={getItemId}
        getItemColumn={getItemColumn}
        onMoveItem={jest.fn()}
        renderCard={renderCard}
      />,
    );
    expect(screen.getByText('Write tests')).toBeInTheDocument();
    expect(screen.getByText('Review PR')).toBeInTheDocument();
    expect(screen.getByText('Deploy')).toBeInTheDocument();
  });

  it('shows "No items" placeholder in an empty column', () => {
    const tasksWithEmptyDone = TASKS.filter((t) => t.status !== 'done');
    render(
      <KanbanBoard
        columns={COLUMNS}
        items={tasksWithEmptyDone}
        getItemId={getItemId}
        getItemColumn={getItemColumn}
        onMoveItem={jest.fn()}
        renderCard={renderCard}
      />,
    );
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('shows "No items" in all columns when items array is empty', () => {
    render(
      <KanbanBoard
        columns={COLUMNS}
        items={[]}
        getItemId={getItemId}
        getItemColumn={getItemColumn}
        onMoveItem={jest.fn()}
        renderCard={renderCard}
      />,
    );
    expect(screen.getAllByText('No items')).toHaveLength(3);
  });

  // --- Drag interactions ---

  it('calls onMoveItem when an item is dropped onto a column', () => {
    const onMoveItem = jest.fn();
    render(
      <KanbanBoard
        columns={COLUMNS}
        items={TASKS}
        getItemId={getItemId}
        getItemColumn={getItemColumn}
        onMoveItem={onMoveItem}
        renderCard={renderCard}
      />,
    );

    const card = screen.getByText('Write tests').closest('[draggable]') as HTMLElement;
    const doneColumn = screen.getByText('Done').closest('[ondragover]') as HTMLElement ??
      screen.getByText('Done').parentElement?.parentElement as HTMLElement;

    fireEvent.dragStart(card);
    fireEvent.dragOver(doneColumn, { preventDefault: jest.fn() });
    fireEvent.drop(doneColumn);

    expect(onMoveItem).toHaveBeenCalledWith('task-1', 'done');
  });

  it('calls onReorderColumn when a card is dropped onto a card in the same column', () => {
    const onMoveItem      = jest.fn();
    const onReorderColumn = jest.fn();
    const tasks: Task[] = [
      { id: 'task-1', title: 'First',  status: 'todo' },
      { id: 'task-2', title: 'Second', status: 'todo' },
      { id: 'task-3', title: 'Third',  status: 'done' },
    ];
    render(
      <KanbanBoard
        columns={COLUMNS}
        items={tasks}
        getItemId={getItemId}
        getItemColumn={getItemColumn}
        onMoveItem={onMoveItem}
        onReorderColumn={onReorderColumn}
        renderCard={renderCard}
      />,
    );

    const dragCard   = screen.getByText('First').closest('[draggable]') as HTMLElement;
    const targetCard = screen.getByText('Second').closest('[draggable]') as HTMLElement;

    fireEvent.dragStart(dragCard);
    fireEvent.dragOver(targetCard);
    fireEvent.drop(targetCard);

    expect(onReorderColumn).toHaveBeenCalledWith('todo', ['task-2', 'task-1']);
    expect(onMoveItem).not.toHaveBeenCalled();
  });

  it('calls onMoveItem (not onReorderColumn) when a card is dropped onto a card in a different column', () => {
    const onMoveItem      = jest.fn();
    const onReorderColumn = jest.fn();
    render(
      <KanbanBoard
        columns={COLUMNS}
        items={TASKS}
        getItemId={getItemId}
        getItemColumn={getItemColumn}
        onMoveItem={onMoveItem}
        onReorderColumn={onReorderColumn}
        renderCard={renderCard}
      />,
    );

    const dragCard   = screen.getByText('Write tests').closest('[draggable]') as HTMLElement;  // todo
    const targetCard = screen.getByText('Review PR').closest('[draggable]') as HTMLElement;    // in_progress

    fireEvent.dragStart(dragCard);
    fireEvent.dragOver(targetCard);
    fireEvent.drop(targetCard);

    expect(onMoveItem).toHaveBeenCalledWith('task-1', 'in_progress');
    expect(onReorderColumn).not.toHaveBeenCalled();
  });

  it('does not crash and does not call onMoveItem when onReorderColumn is absent and drop is same-column', () => {
    const onMoveItem = jest.fn();
    const tasks: Task[] = [
      { id: 'task-1', title: 'First',  status: 'todo' },
      { id: 'task-2', title: 'Second', status: 'todo' },
    ];
    render(
      <KanbanBoard
        columns={COLUMNS}
        items={tasks}
        getItemId={getItemId}
        getItemColumn={getItemColumn}
        onMoveItem={onMoveItem}
        renderCard={renderCard}
      />,
    );

    const dragCard   = screen.getByText('First').closest('[draggable]') as HTMLElement;
    const targetCard = screen.getByText('Second').closest('[draggable]') as HTMLElement;

    // Should not throw, and onMoveItem should not be called for a same-column card drop
    expect(() => {
      fireEvent.dragStart(dragCard);
      fireEvent.dragOver(targetCard);
      fireEvent.drop(targetCard);
    }).not.toThrow();
    expect(onMoveItem).not.toHaveBeenCalled();
  });

  it('does not call onMoveItem when drag ends without a drop', () => {
    const onMoveItem = jest.fn();
    render(
      <KanbanBoard
        columns={COLUMNS}
        items={TASKS}
        getItemId={getItemId}
        getItemColumn={getItemColumn}
        onMoveItem={onMoveItem}
        renderCard={renderCard}
      />,
    );

    const card = screen.getByText('Write tests').closest('[draggable]') as HTMLElement;
    fireEvent.dragStart(card);
    fireEvent.dragEnd(card);

    expect(onMoveItem).not.toHaveBeenCalled();
  });

  // --- Column accents ---

  it('applies custom column accent class when provided', () => {
    const { container } = render(
      <KanbanBoard
        columns={COLUMNS}
        items={[]}
        getItemId={getItemId}
        getItemColumn={getItemColumn}
        onMoveItem={jest.fn()}
        renderCard={renderCard}
        columnAccent={{ todo: 'border-t-blue-500' }}
      />,
    );
    const todoCol = container.querySelector('.border-t-blue-500');
    expect(todoCol).toBeInTheDocument();
  });
});
