import { render } from '@testing-library/react';

jest.mock('@/contexts/ThemeContext', () => ({ useTheme: jest.fn(() => ({ theme: 'dark', toggleTheme: jest.fn() })) }));
jest.mock('@/contexts/PanelContext', () => ({ usePanels: jest.fn(() => ({ openPanel: jest.fn(), closePanel: jest.fn(), panels: [], updatePanelActionIcons: jest.fn() })) }));
jest.mock('@/contexts/WebSocketContext', () => ({ useWebSocket: jest.fn(() => ({ socket: null, isConnected: false })) }));
jest.mock('@/contexts/ToastContext', () => ({ useToast: jest.fn(() => ({ showToast: jest.fn() })) }));
jest.mock('@/contexts/ConfirmationContext', () => ({ useConfirmation: jest.fn(() => ({ showConfirmation: jest.fn() })) }));
jest.mock('@/hooks/useFriends', () => ({ useFriends: jest.fn(() => ({ blockUser: jest.fn(), removeFriend: jest.fn(), unblockUser: jest.fn() })) }));
jest.mock('@/components/friends/FriendsPanel/FriendsPanel', () => ({ __esModule: true, default: () => <div data-testid="friends-panel" /> }));
jest.mock('@/components/messaging/ConversationView/ConversationView', () => ({ __esModule: true, default: () => <div data-testid="conversation-view" /> }));

import FriendsPage from './page';

describe('FriendsPage', () => {
  it('renders without crashing', () => {
    render(<FriendsPage />);
    expect(document.body).toBeTruthy();
  });

  it('renders the friends panel', () => {
    const { getByTestId } = render(<FriendsPage />);
    expect(getByTestId('friends-panel')).toBeInTheDocument();
  });
});
