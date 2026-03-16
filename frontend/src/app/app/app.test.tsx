import { render } from '@testing-library/react';

jest.mock('next/image', () => ({ __esModule: true, default: (props: any) => <img {...props} /> }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
jest.mock('@/contexts/ThemeContext', () => ({ useTheme: jest.fn(() => ({ theme: 'dark', toggleTheme: jest.fn() })) }));
jest.mock('@/contexts/PanelContext', () => ({ usePanels: jest.fn(() => ({ openPanel: jest.fn(), closePanel: jest.fn(), panels: [], updatePanelActionIcons: jest.fn() })) }));
jest.mock('@/contexts/WebSocketContext', () => ({ useWebSocket: jest.fn(() => ({ socket: null, isConnected: false })) }));
jest.mock('@/contexts/ToastContext', () => ({ useToast: jest.fn(() => ({ showToast: jest.fn() })) }));
jest.mock('@/contexts/ConfirmationContext', () => ({ useConfirmation: jest.fn(() => ({ showConfirmation: jest.fn() })) }));
jest.mock('@/contexts/PresenceContext', () => ({ usePresence: jest.fn(() => ({ userPresence: {}, requestPresence: jest.fn(), setSuppressedIds: jest.fn() })) }));
jest.mock('@/hooks/useConversationList', () => ({ useConversationList: jest.fn(() => ({ conversations: [], loading: false, syncing: false, search: '', setSearch: jest.fn(), refresh: jest.fn(), clearUnread: jest.fn() })) }));
jest.mock('@/hooks/useGroupsList', () => ({ useGroupsList: jest.fn(() => ({ groups: [], invites: [], loading: false, syncing: false, refresh: jest.fn(), clearUnread: jest.fn(), acceptInvite: jest.fn(), declineInvite: jest.fn() })) }));
jest.mock('@/hooks/useFriends', () => ({ useFriends: jest.fn(() => ({ blockUser: jest.fn(), removeFriend: jest.fn(), unblockUser: jest.fn() })) }));
jest.mock('@/hooks/useMessageToast', () => ({ useMessageToast: jest.fn() }));
jest.mock('@/hooks/useOpenUserProfile', () => ({ useOpenUserProfile: jest.fn(() => jest.fn()) }));
jest.mock('@/components/messaging/ConversationsList', () => ({ __esModule: true, default: () => <div data-testid="conversations-list" /> }));
jest.mock('@/components/messaging/ConversationView/ConversationView', () => ({ __esModule: true, default: () => <div data-testid="conversation-view" /> }));
jest.mock('@/components/messaging/NewChatPanel/NewChatPanel', () => ({ __esModule: true, default: () => <div data-testid="new-chat-panel" /> }));
jest.mock('@/components/messaging/NewGroupPanel/NewGroupPanel', () => ({ __esModule: true, default: () => <div data-testid="new-group-panel" /> }));
jest.mock('@/components/messaging/GroupView/GroupView', () => ({ __esModule: true, default: () => <div data-testid="group-view" /> }));
jest.mock('@/components/GroupProfilePanel/GroupProfilePanel', () => ({ __esModule: true, default: () => <div data-testid="group-profile-panel" /> }));

import AppPage from './page';

describe('AppPage', () => {
  it('renders without crashing', () => {
    render(<AppPage />);
    expect(document.body).toBeTruthy();
  });

  it('exports the page module', () => {
    expect(AppPage).toBeDefined();
  });
});
