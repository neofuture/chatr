import { render, screen, fireEvent } from '@testing-library/react';
import { Panel1Content, Panel2Content, Panel3Content, Panel4Content } from './DemoPanels';

const mockOpenPanel = jest.fn();
const mockCloseAll = jest.fn();

jest.mock('@/contexts/PanelContext', () => ({
  usePanels: () => ({
    openPanel: mockOpenPanel,
    closeAllPanels: mockCloseAll,
    closeTopPanel: jest.fn(),
  }),
}));

beforeEach(() => {
  mockOpenPanel.mockClear();
  mockCloseAll.mockClear();
});

describe('DemoPanels', () => {
  it('Panel1Content renders heading "Panel 1"', () => {
    render(<Panel1Content />);
    expect(screen.getByText('Panel 1')).toBeInTheDocument();
  });

  it('Panel1Content has Open Panel 2 button', () => {
    render(<Panel1Content />);
    expect(screen.getByText(/Open Panel 2/)).toBeInTheDocument();
  });

  it('Panel2Content renders heading "Panel 2"', () => {
    render(<Panel2Content />);
    expect(screen.getByText('Panel 2')).toBeInTheDocument();
  });

  it('Panel3Content renders heading "Panel 3"', () => {
    render(<Panel3Content />);
    expect(screen.getByText('Panel 3')).toBeInTheDocument();
  });

  it('Panel4Content renders heading "Panel 4 - Maximum Depth!"', () => {
    render(<Panel4Content />);
    expect(screen.getByText('Panel 4 - Maximum Depth!')).toBeInTheDocument();
  });

  it('Panel4Content Close All calls closeAllPanels', () => {
    render(<Panel4Content />);
    fireEvent.click(screen.getByText('Close All Panels'));
    expect(mockCloseAll).toHaveBeenCalled();
  });

  it('Panel1Content Open Panel 2 calls openPanel', () => {
    render(<Panel1Content />);
    fireEvent.click(screen.getByText(/Open Panel 2/));
    expect(mockOpenPanel).toHaveBeenCalled();
  });
});
