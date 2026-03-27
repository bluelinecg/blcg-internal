/** @jest-environment node */
// Unit tests for lib/utils/notify-user.ts
// Verifies preference gate — only inserts notification when the preference is enabled.
// All dependencies are mocked.

import { notifyIfEnabled } from './notify-user';

jest.mock('@/lib/db/notification-preferences', () => ({
  getPreferences: jest.fn(),
}));

jest.mock('@/lib/db/notifications', () => ({
  insertNotification: jest.fn(),
}));

import { getPreferences } from '@/lib/db/notification-preferences';
import { insertNotification } from '@/lib/db/notifications';

const mockGetPreferences    = getPreferences as jest.Mock;
const mockInsertNotification = insertNotification as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockInsertNotification.mockResolvedValue({ data: {}, error: null });
});

const NOTIFICATION = {
  type: 'new_proposal' as const,
  title: 'New Proposal Created',
  body: 'Proposal "X" has been created.',
  entityType: 'proposal',
  entityId: 'proposal-1',
};

describe('notifyIfEnabled', () => {
  it('inserts notification when preference is enabled', async () => {
    mockGetPreferences.mockResolvedValue({
      data: { newProposal: true },
      error: null,
    });

    await notifyIfEnabled('user-1', 'newProposal', NOTIFICATION);

    expect(mockInsertNotification).toHaveBeenCalledWith({
      userId: 'user-1',
      ...NOTIFICATION,
    });
  });

  it('skips notification when preference is disabled', async () => {
    mockGetPreferences.mockResolvedValue({
      data: { newProposal: false },
      error: null,
    });

    await notifyIfEnabled('user-1', 'newProposal', NOTIFICATION);

    expect(mockInsertNotification).not.toHaveBeenCalled();
  });

  it('skips notification when preferences could not be loaded', async () => {
    mockGetPreferences.mockResolvedValue({ data: null, error: 'DB error' });

    await notifyIfEnabled('user-1', 'newProposal', NOTIFICATION);

    expect(mockInsertNotification).not.toHaveBeenCalled();
  });
});
