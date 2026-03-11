import { render, screen } from '@testing-library/react';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: jest.fn() }),
}));
jest.mock('@/components/ThemeToggle/ThemeToggle', () => ({ __esModule: true, default: () => <div data-testid="theme-toggle" /> }));

import WidgetDemoPage from './page';

describe('WidgetDemoPage', () => {
  it('should render without crashing', () => {
    render(<WidgetDemoPage />);
    expect(screen.getAllByText(/widget/i).length).toBeGreaterThan(0);
  });
});
