import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/tests/helpers/render';
import { useRouter } from 'next/navigation';
import { OrganizationDetailView } from './OrganizationDetailView';
import type { Organization, Contact } from '@/lib/types/crm';

// ---------------------------------------------------------------------------
// Mock heavy child components
// ---------------------------------------------------------------------------

jest.mock('@/components/modules', () => ({
  ActivityFeed: () => <div data-testid="activity-feed" />,
  OrganizationFormModal: ({
    isOpen,
    onClose,
    onSave,
    saveError,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: unknown) => void;
    saveError: string | null;
  }) =>
    isOpen ? (
      <div data-testid="org-form-modal">
        {saveError && <p data-testid="save-error">{saveError}</p>}
        <button onClick={onClose}>Cancel modal</button>
        <button
          onClick={() =>
            onSave({
              name: 'Updated Corp',
              website: null,
              phone: null,
              industry: null,
              address: null,
              notes: null,
            })
          }
        >
          Save modal
        </button>
      </div>
    ) : null,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockOrg: Organization = {
  id: 'org-1',
  name: 'ACME Corp',
  website: 'https://acme.example.com',
  phone: '555-9999',
  industry: 'Technology',
  address: '123 Main St, Atlanta, GA',
  notes: 'Key enterprise account.',
  contactCount: 2,
  createdAt: '2024-01-10T08:00:00Z',
  updatedAt: '2024-07-01T12:00:00Z',
};

const mockContacts: Contact[] = [
  {
    id: 'contact-1',
    firstName: 'Alice',
    lastName: 'Walker',
    email: 'alice@acme.example.com',
    phone: '555-1111',
    title: 'CEO',
    organizationId: 'org-1',
    status: 'active',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'contact-2',
    firstName: 'Bob',
    lastName: 'Smith',
    email: 'bob@acme.example.com',
    organizationId: 'org-1',
    status: 'active',
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z',
  },
];

const mockFetch = jest.fn();

beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockClear();
  // Default: contacts fetch returns mock contacts
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ data: mockContacts, error: null }),
  });
});

// ---------------------------------------------------------------------------
// Static rendering
// ---------------------------------------------------------------------------

describe('OrganizationDetailView — static rendering', () => {
  it('renders the organization name in the header', async () => {
    render(<OrganizationDetailView organization={mockOrg} />);
    expect(screen.getByRole('heading', { name: 'ACME Corp' })).toBeInTheDocument();
  });

  it('renders initials in the avatar', async () => {
    render(<OrganizationDetailView organization={mockOrg} />);
    expect(screen.getByText('AC')).toBeInTheDocument();
  });

  it('renders the industry below the name', async () => {
    render(<OrganizationDetailView organization={mockOrg} />);
    // Industry appears in header subtitle and in details card
    expect(screen.getAllByText('Technology').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the phone number', async () => {
    render(<OrganizationDetailView organization={mockOrg} />);
    expect(screen.getByText('555-9999')).toBeInTheDocument();
  });

  it('renders the website as an external link', async () => {
    render(<OrganizationDetailView organization={mockOrg} />);
    const link = screen.getByRole('link', { name: 'https://acme.example.com' });
    expect(link).toHaveAttribute('href', 'https://acme.example.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders the address', async () => {
    render(<OrganizationDetailView organization={mockOrg} />);
    expect(screen.getByText('123 Main St, Atlanta, GA')).toBeInTheDocument();
  });

  it('renders the notes section when notes are present', async () => {
    render(<OrganizationDetailView organization={mockOrg} />);
    expect(screen.getByText('Key enterprise account.')).toBeInTheDocument();
  });

  it('does not render the notes section when notes are absent', async () => {
    render(<OrganizationDetailView organization={{ ...mockOrg, notes: undefined }} />);
    expect(screen.queryByText('Notes')).not.toBeInTheDocument();
  });

  it('renders the ActivityFeed', async () => {
    render(<OrganizationDetailView organization={mockOrg} />);
    expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
  });

  it('renders a Back to Organizations link', async () => {
    render(<OrganizationDetailView organization={mockOrg} />);
    expect(screen.getByRole('link', { name: /back to organizations/i })).toHaveAttribute(
      'href',
      '/organizations',
    );
  });
});

// ---------------------------------------------------------------------------
// Contacts loading
// ---------------------------------------------------------------------------

describe('OrganizationDetailView — contacts loading', () => {
  it('renders linked contact names after load', async () => {
    render(<OrganizationDetailView organization={mockOrg} />);
    await waitFor(() => expect(screen.getByText('Alice Walker')).toBeInTheDocument());
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
  });

  it('renders contact emails as mailto links', async () => {
    render(<OrganizationDetailView organization={mockOrg} />);
    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'alice@acme.example.com' });
      expect(link).toHaveAttribute('href', 'mailto:alice@acme.example.com');
    });
  });

  it('renders contact links pointing to the contact detail page', async () => {
    render(<OrganizationDetailView organization={mockOrg} />);
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /alice walker/i });
      expect(link).toHaveAttribute('href', '/contacts/contact-1');
    });
  });

  it('shows "No contacts linked" when contacts list is empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], error: null }),
    });
    render(<OrganizationDetailView organization={mockOrg} />);
    await waitFor(() =>
      expect(
        screen.getByText('No contacts linked to this organization.'),
      ).toBeInTheDocument(),
    );
  });

  it('shows the contact count in the section heading', async () => {
    render(<OrganizationDetailView organization={mockOrg} />);
    await waitFor(() => expect(screen.getByText('(2)')).toBeInTheDocument());
  });
});

// ---------------------------------------------------------------------------
// Edit flow
// ---------------------------------------------------------------------------

describe('OrganizationDetailView — edit flow', () => {
  it('opens the OrganizationFormModal when Edit Organization is clicked', async () => {
    render(<OrganizationDetailView organization={mockOrg} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Organization' }));
    expect(screen.getByTestId('org-form-modal')).toBeInTheDocument();
  });

  it('closes the modal when Cancel modal is clicked', async () => {
    render(<OrganizationDetailView organization={mockOrg} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Organization' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel modal' }));
    expect(screen.queryByTestId('org-form-modal')).not.toBeInTheDocument();
  });

  it('patches the organization and closes modal on successful save', async () => {
    const updatedOrg = { ...mockOrg, name: 'Updated Corp' };
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockContacts, error: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: updatedOrg, error: null }),
      });

    render(<OrganizationDetailView organization={mockOrg} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Organization' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save modal' }));

    await waitFor(() =>
      expect(screen.queryByTestId('org-form-modal')).not.toBeInTheDocument(),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/organizations/${mockOrg.id}`,
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('shows a save error and keeps modal open on failure', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockContacts, error: null }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ data: null, error: 'Update failed' }),
      });

    render(<OrganizationDetailView organization={mockOrg} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Organization' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save modal' }));

    await waitFor(() =>
      expect(screen.getByTestId('save-error')).toHaveTextContent('Update failed'),
    );
    expect(screen.getByTestId('org-form-modal')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Delete flow
// ---------------------------------------------------------------------------

describe('OrganizationDetailView — delete flow', () => {
  it('opens the ConfirmDialog after checking blockers', async () => {
    // contacts fetch + blockers fetch
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockContacts, error: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], error: null }),
      });

    render(<OrganizationDetailView organization={mockOrg} />);
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  });

  it('navigates to /organizations after a successful delete', async () => {
    const push = jest.fn();
    jest.mocked(useRouter).mockReturnValue({
      push,
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockContacts, error: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], error: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: null, error: null }),
      });

    render(<OrganizationDetailView organization={mockOrg} />);
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Delete Organization' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/organizations'));
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/organizations/${mockOrg.id}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('shows an action error banner when blockers check fails', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockContacts, error: null }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ data: null, error: 'Dependency check failed' }),
      });

    render(<OrganizationDetailView organization={mockOrg} />);
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() =>
      expect(screen.getByText('Dependency check failed')).toBeInTheDocument(),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows an action error banner when delete fails', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockContacts, error: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], error: null }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ data: null, error: 'Cannot delete organization' }),
      });

    render(<OrganizationDetailView organization={mockOrg} />);
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Delete Organization' }));

    await waitFor(() =>
      expect(screen.getByText('Cannot delete organization')).toBeInTheDocument(),
    );
  });
});
