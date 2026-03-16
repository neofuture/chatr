import { render, screen } from '@testing-library/react';

jest.mock('@/contexts/PanelContext', () => ({ usePanels: jest.fn(() => ({ openPanel: jest.fn(), closePanel: jest.fn(), panels: [], updatePanelActionIcons: jest.fn() })) }));
jest.mock('@/components/panels/DemoPanels/DemoPanels', () => ({ Panel1Content: () => <div data-testid="panel1" /> }));

import UpdatesPage from './page';

describe('UpdatesPage', () => {
  it('renders without crashing', () => {
    render(<UpdatesPage />);
    expect(document.body).toBeTruthy();
  });

  it('displays the coming soon heading', () => {
    render(<UpdatesPage />);
    expect(screen.getByText('Coming Soon')).toBeInTheDocument();
  });

  it('displays the description text', () => {
    render(<UpdatesPage />);
    expect(screen.getByText(/product updates and announcements/i)).toBeInTheDocument();
  });
});
