import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AdminPage from './page';

jest.mock('@/lib/api', () => ({
  getApiBase: () => '',
}));

const mockContacts = [
  {
    id: 'guest-1',
    name: 'Sarah',
    contactEmail: 'sarah@example.com',
    createdAt: '2026-03-27T10:00:00Z',
    hasConversation: true,
    totalMessages: 3,
    firstMessage: { content: 'Hi, I need help with billing', createdAt: '2026-03-27T10:01:00Z' },
  },
  {
    id: 'guest-2',
    name: 'Anonymous',
    contactEmail: null,
    createdAt: '2026-03-27T11:00:00Z',
    hasConversation: false,
    totalMessages: 0,
    firstMessage: null,
  },
];

const mockMessages = {
  guest: { id: 'guest-1', displayName: 'Sarah', contactEmail: 'sarah@example.com' },
  messages: [
    {
      id: 'msg-1', content: 'Hi, I need help', type: 'text',
      senderId: 'guest-1', recipientId: 'support-1',
      createdAt: '2026-03-27T10:01:00Z',
      sender: { displayName: 'Sarah', isGuest: true, isSupport: false },
    },
    {
      id: 'msg-2', content: 'Sure, how can I assist?', type: 'text',
      senderId: 'support-1', recipientId: 'guest-1',
      createdAt: '2026-03-27T10:02:00Z',
      sender: { displayName: 'Agent', isGuest: false, isSupport: true },
    },
  ],
};

function mockResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

beforeEach(() => {
  jest.clearAllMocks();

  Storage.prototype.getItem = jest.fn((key: string) => {
    if (key === 'token') return 'test-token';
    return null;
  });

  global.fetch = jest.fn(async (url: string | URL | Request) => {
    const u = String(url);
    if (u.includes('/messages')) {
      return mockResponse(mockMessages);
    }
    if (u.includes('/widget-contacts')) {
      return mockResponse(mockContacts);
    }
    return mockResponse({});
  }) as unknown as typeof fetch;
});

describe('AdminPage', () => {
  it('renders empty state when API returns empty array', async () => {
    global.fetch = jest.fn(async () =>
      mockResponse([], 200)
    ) as unknown as typeof fetch;

    await act(async () => { render(<AdminPage />); });
    await waitFor(() => {
      expect(screen.getByText('No widget contacts yet')).toBeInTheDocument();
    });
  });

  it('renders error state when API returns 403', async () => {
    global.fetch = jest.fn(async () =>
      mockResponse({ error: 'Support access required' }, 403)
    ) as unknown as typeof fetch;

    await act(async () => { render(<AdminPage />); });
    await waitFor(() => {
      expect(screen.getByText(/Support access required/)).toBeInTheDocument();
    });
  });

  it('renders contact cards when API returns contacts', async () => {
    await act(async () => { render(<AdminPage />); });
    await waitFor(() => {
      expect(screen.getByText('Sarah')).toBeInTheDocument();
      expect(screen.getByText('Anonymous')).toBeInTheDocument();
    });
    expect(screen.getByText('sarah@example.com')).toBeInTheDocument();
    expect(screen.getByText('3 messages')).toBeInTheDocument();
    expect(screen.getByText('No conversation')).toBeInTheDocument();
    expect(screen.getByText('Hi, I need help with billing')).toBeInTheDocument();
  });

  it('clicking a contact calls the messages endpoint', async () => {
    await act(async () => { render(<AdminPage />); });
    await waitFor(() => {
      expect(screen.getByText('Sarah')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Sarah'));
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/widget-contacts/guest-1/messages'),
        expect.anything()
      );
    });
  });

  it('renders messages after selecting a contact', async () => {
    await act(async () => { render(<AdminPage />); });
    await waitFor(() => {
      expect(screen.getByText('Sarah')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Sarah'));
    });

    await waitFor(() => {
      expect(screen.getByText('Hi, I need help')).toBeInTheDocument();
      expect(screen.getByText('Sure, how can I assist?')).toBeInTheDocument();
    });
  });

  it('delete button calls the delete endpoint', async () => {
    window.confirm = jest.fn(() => true);

    await act(async () => { render(<AdminPage />); });
    await waitFor(() => {
      expect(screen.getByText('Sarah')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Delete contact');
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/widget-contacts/guest-1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('resize divider is present in the DOM', async () => {
    const { container } = await act(async () => render(<AdminPage />));
    await waitFor(() => {
      expect(screen.getByText('Sarah')).toBeInTheDocument();
    });
    const divider = container.querySelector('[class*="divider"]');
    expect(divider).toBeInTheDocument();
  });

  it('shows placeholder when no contact is selected', async () => {
    await act(async () => { render(<AdminPage />); });
    await waitFor(() => {
      expect(screen.getByText('Select a contact to view their conversation')).toBeInTheDocument();
    });
  });
});
