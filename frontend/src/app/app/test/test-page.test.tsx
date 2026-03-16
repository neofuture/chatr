import { render, screen } from '@testing-library/react';

jest.mock('@/contexts/PanelContext', () => ({ usePanels: jest.fn(() => ({ openPanel: jest.fn(), closePanel: jest.fn(), panels: [], updatePanelActionIcons: jest.fn() })) }));
jest.mock('@/components/panels/DemoPanels/DemoPanels', () => ({ Panel1Content: () => <div data-testid="panel1" /> }));

import TestPage from './page';

describe('TestPage', () => {
  it('renders without crashing', () => {
    render(<TestPage />);
    expect(document.body).toBeTruthy();
  });

  it('displays the heading', () => {
    render(<TestPage />);
    expect(screen.getByText('No Tests Yet')).toBeInTheDocument();
  });

  it('displays the description text', () => {
    render(<TestPage />);
    expect(screen.getByText('Test page')).toBeInTheDocument();
  });
});
