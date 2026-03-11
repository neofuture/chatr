import { useFriends, FriendsProvider } from './useFriends';

describe('useFriends', () => {
  it('should re-export useFriends from FriendsContext', () => {
    expect(typeof useFriends).toBe('function');
  });

  it('should re-export FriendsProvider from FriendsContext', () => {
    expect(typeof FriendsProvider).toBe('function');
  });
});
