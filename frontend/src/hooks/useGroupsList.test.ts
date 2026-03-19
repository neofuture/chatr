import { renderHook, act } from '@testing-library/react';

const mockOn = jest.fn();
const mockOff = jest.fn();
const mockEmit = jest.fn();
let mockSocket: any = null;

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    socket: mockSocket,
    connected: !!mockSocket,
  }),
}));

jest.mock('@/lib/socketRPC', () => ({
  socketFirst: jest.fn().mockResolvedValue({ groups: [], invites: [] }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockSocket = null;
});

import { useGroupsList } from './useGroupsList';
import { socketFirst } from '@/lib/socketRPC';

const mockSocketFirst = socketFirst as jest.Mock;

describe('useGroupsList', () => {
  it('exports a function', () => {
    expect(typeof useGroupsList).toBe('function');
  });

  it('returns expected shape', () => {
    const { result } = renderHook(() => useGroupsList());

    expect(result.current).toHaveProperty('groups');
    expect(result.current).toHaveProperty('invites');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('syncing');
    expect(result.current).toHaveProperty('refresh');
    expect(result.current).toHaveProperty('clearUnread');
    expect(result.current).toHaveProperty('acceptInvite');
    expect(result.current).toHaveProperty('declineInvite');
    expect(Array.isArray(result.current.groups)).toBe(true);
    expect(Array.isArray(result.current.invites)).toBe(true);
  });

  it('starts with empty groups when no cache', () => {
    const { result } = renderHook(() => useGroupsList());
    expect(result.current.groups).toEqual([]);
  });

  it('loads groups from localStorage cache', () => {
    const cached = [
      { id: 'g1', name: 'Test Group', members: [], lastMessage: null },
    ];
    localStorage.setItem('chatr:groups', JSON.stringify(cached));

    const { result } = renderHook(() => useGroupsList());
    expect(result.current.groups.length).toBe(1);
    expect(result.current.groups[0].name).toBe('Test Group');
    expect(result.current.loading).toBe(false);
  });

  it('loads invites from localStorage cache', () => {
    const cachedInvites = [
      { groupId: 'g2', groupName: 'Invite Group', memberCount: 5, invitedBy: 'someone' },
    ];
    localStorage.setItem('chatr:group-invites', JSON.stringify(cachedInvites));

    const { result } = renderHook(() => useGroupsList());
    expect(result.current.invites.length).toBe(1);
    expect(result.current.invites[0].groupName).toBe('Invite Group');
  });

  it('fetches groups via socketFirst', async () => {
    const groups = [{ id: 'g1', name: 'Fetched', members: [], lastMessage: null }];
    mockSocketFirst.mockResolvedValueOnce({ groups }).mockResolvedValueOnce({ invites: [] });

    mockSocket = { on: mockOn, off: mockOff, emit: mockEmit };
    localStorage.setItem('token', 'test-tok');
    const { result } = renderHook(() => useGroupsList());

    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    expect(mockSocketFirst).toHaveBeenCalled();
  });

  it('clearUnread sets unread to 0 for a group', async () => {
    const cached = [
      { id: 'g1', name: 'Group', members: [], lastMessage: null, unreadCount: 3 },
    ];
    localStorage.setItem('chatr:groups', JSON.stringify(cached));
    mockSocketFirst.mockResolvedValue({ groups: cached, invites: [] });

    const { result } = renderHook(() => useGroupsList());

    await act(async () => {
      result.current.clearUnread('g1');
    });

    expect(result.current.groups.find(g => g.id === 'g1')?.unreadCount).toBe(0);
  });

  it('acceptInvite calls socketFirst and removes invite', async () => {
    const invites = [{ groupId: 'g2', groupName: 'InvGroup', memberCount: 3, invitedBy: 'user1' }];
    localStorage.setItem('chatr:group-invites', JSON.stringify(invites));
    mockSocketFirst
      .mockResolvedValueOnce({ groups: [] })
      .mockResolvedValueOnce({ invites })
      .mockResolvedValueOnce({ group: { id: 'g2', name: 'InvGroup', members: [] } });

    const { result } = renderHook(() => useGroupsList());

    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.acceptInvite('g2');
    });

    expect(result.current.invites.find(i => i.groupId === 'g2')).toBeUndefined();
  });

  it('declineInvite calls socketFirst and removes invite', async () => {
    const invites = [{ groupId: 'g3', groupName: 'DecGroup', memberCount: 2, invitedBy: 'user2' }];
    localStorage.setItem('chatr:group-invites', JSON.stringify(invites));
    mockSocketFirst
      .mockResolvedValueOnce({ groups: [] })
      .mockResolvedValueOnce({ invites })
      .mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useGroupsList());

    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.declineInvite('g3');
    });

    expect(result.current.invites.find(i => i.groupId === 'g3')).toBeUndefined();
  });
});
