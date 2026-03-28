import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/tests/helpers/render';
import { useRouter } from 'next/navigation';
import { ContactDetailView } from './ContactDetailView';
import type { Contact } from '@/lib/types/crm';

// ---------------------------------------------------------------------------
// Mock heavy child components that make their own network calls
// ---------------------------------------------------------------------------

jest.mock('@/components/modules', () => ({
  ActivityFeed: () => <div data-testid="activity-feed" />,
  ContactFormModal: ({
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
      <div data-testid="contact-form-modal">
        {saveError && <p data-testid="save-error">{saveError}</p>}
        <button onClick={onClose}>Cancel modal</button>
        <button
          onClick={() =>
            onSave({
              firstName: 'Updated',
              lastName: 'Name',
              email: 'updated@example.com',
              phone: null,
              title: null,
              organizationId: null,
              status: 'active',
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

const mockContact: Contact = {
  id: 'contact-1',
  firstName: 'Alice',
  lastName: 'Walker',
  email: 'alice@example.com',
  phone: '555-1234',
  title: 'CEO',
  organizationId: 'org-1',
  status: 'active',
  notes: 'Key contact for the ACME account.',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-06-01T14:00:00Z',
};

const mockOrg = {
  id: 'org-1',
  name: 'ACME Corp',
  phone: '555-9999',
  website: 'https://acme.example.com',
  industry: 'Technology',
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockFetch = jest.fn();

beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockClear();
  // Default: orgs endpoint returns the mock org
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ data: [mockOrg], error: null }),
  });
});

// ---------------------------------------------------------------------------
// Static rendering
// ---------------------------------------------------------------------------

describe('ContactDetailView — static rendering', () => {
  it('renders the full name in the page header', async () => {
    render(<ContactDetailView contact={mockContact} />);
    expect(screen.getByRole('heading', { name: 'Alice Walker' })).toBeInTheDocument();
  });

  it('renders initials in the avatar', async () => {
    render(<ContactDetailView contact={mockContact} />);
    expect(screen.getByText('AW')).toBeInTheDocument();
  });

  it('renders the contact title below the name', async () => {
    render(<ContactDetailView contact={mockContact} />);
    // Title appears both in the header subtitle and the contact info card
    expect(screen.getAllByText('CEO').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the email as a mailto link', async () => {
    render(<ContactDetailView contact={mockContact} />);
    const link = screen.getByRole('link', { name: 'alice@example.com' });
    expect(link).toHaveAttribute('href', 'mailto:alice@example.com');
  });

  it('renders the phone number', async () => {
    render(<ContactDetailView contact={mockContact} />);
    expect(screen.getByText('555-1234')).toBeInTheDocument();
  });

  it('renders the notes section when notes are present', async () => {
    render(<ContactDetailView contact={mockContact} />);
    expect(screen.getByText('Key contact for the ACME account.')).toBeInTheDocument();
  });

  it('does not render the notes section when notes are absent', async () => {
    render(<ContactDetailView contact={{ ...mockContact, notes: undefined }} />);
    expect(screen.queryByText('Notes')).not.toBeInTheDocument();
  });

  it('renders the status badge', async () => {
    render(<ContactDetailView contact={mockContact} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders the ActivityFeed', async () => {
    render(<ContactDetailView contact={mockContact} />);
    expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
  });

  it('renders a Back to Contacts link', async () => {
    render(<ContactDetailView contact={mockContact} />);
    expect(screen.getByRole('link', { name: /back to contacts/i })).toHaveAttribute('href', '/contacts');
  });
});

// ---------------------------------------------------------------------------
// Organization loading
// ---------------------------------------------------------------------------

describe('ContactDetailView — organization loading', () => {
  it('shows the linked organization name after load', async () => {
    render(<ContactDetailView contact={mockContact} />);
    await waitFor(() => expect(screen.getByText('ACME Corp')).toBeInTheDocument());
  });

  it('shows org industry after load', async () => {
    render(<ContactDetailView contact={mockContact} />);
    await waitFor(() => expect(screen.getByText('Technology')).toBeInTheDocument());
  });

  it('shows "View org →" link pointing to the org detail page', async () => {
    render(<ContactDetailView contact={mockContact} />);
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /view org/i });
      expect(link).toHaveAttribute('href', '/organizations/org-1');
    });
  });

  it('shows "No organization linked." when the contact has no organizationId', async () => {
    render(<ContactDetailView contact={{ ...mockContact, organizationId: undefined }} />);
    await waitFor(() =>
      expect(screen.getByText('No organization linked.')).toBeInTheDocument(),
    );
  });

  it('shows "No organization linked." when the org is not found in the list', async () => {
    // orgs endpoint returns an empty list
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], error: null }),
    });
    render(<ContactDetailView contact={mockContact} />);
    await waitFor(() =>
      expect(screen.getByText('No organization linked.')).toBeInTheDocument(),
    );
  });
});

// ---------------------------------------------------------------------------
// Edit flow
// ---------------------------------------------------------------------------

describe('ContactDetailView — edit flow', () => {
  it('opens the ContactFormModal when Edit Contact is clicked', async () => {
    render(<ContactDetailView contact={mockContact} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Contact' }));
    expect(screen.getByTestId('contact-form-modal')).toBeInTheDocument();
  });

  it('closes the modal when Cancel modal is clicked', async () => {
    render(<ContactDetailView contact={mockContact} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Contact' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel modal' }));
    expect(screen.queryByTestId('contact-form-modal')).not.toBeInTheDocument();
  });

  it('patches the contact and closes the modal on successful save', async () => {
    const updatedContact = { ...mockContact, firstName: 'Updated', lastName: 'Name' };
    // First call = org fetch; second call = PATCH response
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [mockOrg], error: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: updatedContact, error: null }),
      });

    render(<ContactDetailView contact={mockContact} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Contact' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save modal' }));

    await waitFor(() =>
      expect(screen.queryByTestId('contact-form-modal')).not.toBeInTheDocument(),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/contacts/${mockContact.id}`,
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('shows a save error and keeps the modal open on failure', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [mockOrg], error: null }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ data: null, error: 'Update failed' }),
      });

    render(<ContactDetailView contact={mockContact} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Contact' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save modal' }));

    await waitFor(() =>
      expect(screen.getByTestId('save-error')).toHaveTextContent('Update failed'),
    );
    expect(screen.getByTestId('contact-form-modal')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Delete flow
// ---------------------------------------------------------------------------

describe('ContactDetailView — delete flow', () => {
  it('opens the ConfirmDialog when Delete is clicked', async () => {
    render(<ContactDetailView contact={mockContact} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('navigates to /contacts after a successful delete', async () => {
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
        json: async () => ({ data: [mockOrg], error: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: null, error: null }),
      });

    render(<ContactDetailView contact={mockContact} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Contact' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/contacts'));
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/contacts/${mockContact.id}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('shows an action error banner when delete fails', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [mockOrg], error: null }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ data: null, error: 'Cannot delete contact' }),
      });

    render(<ContactDetailView contact={mockContact} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Contact' }));

    await waitFor(() =>
      expect(screen.getByText('Cannot delete contact')).toBeInTheDocument(),
    );
  });
});
