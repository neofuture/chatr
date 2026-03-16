import { render } from '@testing-library/react';

jest.mock('@/contexts/ThemeContext', () => ({ useTheme: jest.fn(() => ({ theme: 'dark', toggleTheme: jest.fn() })) }));
jest.mock('@/contexts/PanelContext', () => ({ usePanels: jest.fn(() => ({ openPanel: jest.fn(), closePanel: jest.fn(), panels: [], updatePanelActionIcons: jest.fn() })) }));
jest.mock('@/contexts/ToastContext', () => ({ useToast: jest.fn(() => ({ showToast: jest.fn() })) }));
jest.mock('@/hooks/useGroupsList', () => ({ useGroupsList: jest.fn(() => ({ groups: [], invites: [], loading: false, syncing: false, refresh: jest.fn(), clearUnread: jest.fn(), acceptInvite: jest.fn(), declineInvite: jest.fn() })) }));
jest.mock('@/hooks/useOpenUserProfile', () => ({ useOpenUserProfile: jest.fn(() => jest.fn()) }));
jest.mock('@/components/messaging/GroupView/GroupView', () => ({ __esModule: true, default: () => <div data-testid="group-view" /> }));
jest.mock('@/components/GroupProfilePanel/GroupProfilePanel', () => ({ __esModule: true, default: () => <div data-testid="group-profile-panel" /> }));
jest.mock('@/components/messaging/NewGroupPanel/NewGroupPanel', () => ({ __esModule: true, default: () => <div data-testid="new-group-panel" /> }));
jest.mock('@/components/PresenceAvatar/PresenceAvatar', () => ({ __esModule: true, default: (props: any) => <div data-testid="presence-avatar">{props.name}</div> }));
jest.mock('@/components/common/PaneSearchBox/PaneSearchBox', () => ({ __esModule: true, default: () => <div data-testid="pane-search-box" /> }));

import GroupsPage from './page';

describe('GroupsPage', () => {
  it('renders without crashing', () => {
    render(<GroupsPage />);
    expect(document.body).toBeTruthy();
  });
});
