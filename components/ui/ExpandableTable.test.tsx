import { render, screen, fireEvent } from '@/tests/helpers/render';
import { ExpandableTable, type TableColumn } from './ExpandableTable';

interface Row {
  id: string;
  name: string;
  status: string;
}

const ROWS: Row[] = [
  { id: 'row-1', name: 'Alpha Project', status: 'active' },
  { id: 'row-2', name: 'Beta Project', status: 'on_hold' },
];

const COLUMNS: TableColumn<Row>[] = [
  { key: 'name', header: 'Name', render: (row) => row.name },
  { key: 'status', header: 'Status', render: (row) => row.status },
];

const getRowId = (row: Row) => row.id;
const renderExpanded = (row: Row) => <div>Details for {row.name}</div>;

describe('ExpandableTable', () => {
  // --- Empty state ---

  it('shows the default empty message when rows is empty', () => {
    render(
      <ExpandableTable
        columns={COLUMNS}
        rows={[]}
        getRowId={getRowId}
        renderExpanded={renderExpanded}
      />,
    );
    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });

  it('shows a custom emptyMessage when rows is empty', () => {
    render(
      <ExpandableTable
        columns={COLUMNS}
        rows={[]}
        getRowId={getRowId}
        renderExpanded={renderExpanded}
        emptyMessage="No proposals yet."
      />,
    );
    expect(screen.getByText('No proposals yet.')).toBeInTheDocument();
  });

  // --- Table structure ---

  it('renders column headers', () => {
    render(
      <ExpandableTable
        columns={COLUMNS}
        rows={ROWS}
        getRowId={getRowId}
        renderExpanded={renderExpanded}
      />,
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders all row data', () => {
    render(
      <ExpandableTable
        columns={COLUMNS}
        rows={ROWS}
        getRowId={getRowId}
        renderExpanded={renderExpanded}
      />,
    );
    expect(screen.getByText('Alpha Project')).toBeInTheDocument();
    expect(screen.getByText('Beta Project')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('on_hold')).toBeInTheDocument();
  });

  // --- Row expansion ---

  it('does not show expanded content before clicking a row', () => {
    render(
      <ExpandableTable
        columns={COLUMNS}
        rows={ROWS}
        getRowId={getRowId}
        renderExpanded={renderExpanded}
      />,
    );
    expect(screen.queryByText('Details for Alpha Project')).not.toBeInTheDocument();
  });

  it('shows expanded content after clicking a row', () => {
    render(
      <ExpandableTable
        columns={COLUMNS}
        rows={ROWS}
        getRowId={getRowId}
        renderExpanded={renderExpanded}
      />,
    );
    fireEvent.click(screen.getByText('Alpha Project'));
    expect(screen.getByText('Details for Alpha Project')).toBeInTheDocument();
  });

  it('collapses an already-expanded row when clicked again', () => {
    render(
      <ExpandableTable
        columns={COLUMNS}
        rows={ROWS}
        getRowId={getRowId}
        renderExpanded={renderExpanded}
      />,
    );
    fireEvent.click(screen.getByText('Alpha Project'));
    expect(screen.getByText('Details for Alpha Project')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Alpha Project'));
    expect(screen.queryByText('Details for Alpha Project')).not.toBeInTheDocument();
  });

  it('only shows one expanded row at a time', () => {
    render(
      <ExpandableTable
        columns={COLUMNS}
        rows={ROWS}
        getRowId={getRowId}
        renderExpanded={renderExpanded}
      />,
    );
    fireEvent.click(screen.getByText('Alpha Project'));
    expect(screen.getByText('Details for Alpha Project')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Beta Project'));
    expect(screen.queryByText('Details for Alpha Project')).not.toBeInTheDocument();
    expect(screen.getByText('Details for Beta Project')).toBeInTheDocument();
  });
});
