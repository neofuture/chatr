import { render, screen } from '@testing-library/react';
import SettingsPage from './page';

jest.mock('@/components/settings/SettingsPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="settings-panel">Settings Panel</div>,
}));

describe('SettingsPage', () => {
  it('renders SettingsPanel component', () => {
    render(<SettingsPage />);
    expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
  });

  it('SettingsPanel is present in the document', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Settings Panel')).toBeInTheDocument();
  });
});
