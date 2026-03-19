import { render, screen } from '@testing-library/react';

jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
jest.mock('@/version', () => ({ version: '1.0.0-test' }));
jest.mock('@/contexts/PanelContext', () => ({
  usePanels: () => ({ panels: [], openPanel: jest.fn(), closePanel: jest.fn(), closeTopPanel: jest.fn(), closeAllPanels: jest.fn(), maxLevel: -1, effectiveMaxLevel: -1, updatePanelActionIcons: jest.fn() }),
}));
jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ toasts: [], showToast: jest.fn(), removeToast: jest.fn() }),
}));
jest.mock('@/contexts/ConfirmationContext', () => ({
  useConfirmation: () => ({ showConfirmation: jest.fn(), currentConfirmation: null, closeConfirmation: jest.fn() }),
}));
jest.mock('@/components/BackgroundBlobs/BackgroundBlobs', () => ({ __esModule: true, default: () => <div data-testid="blobs" /> }));
jest.mock('@/components/BottomSheetDemo/BottomSheetDemo', () => ({ __esModule: true, default: () => <div data-testid="bottom-sheet" /> }));
jest.mock('@/components/ThemeToggle/ThemeToggle', () => ({ __esModule: true, default: () => <div data-testid="theme-toggle" /> }));
jest.mock('@/components/form-controls/DatePicker/DatePicker', () => ({ __esModule: true, default: () => <div data-testid="datepicker" /> }));
jest.mock('@/components/form-controls/Button/Button', () => ({ __esModule: true, default: (props: any) => <button>{props.children}</button> }));
jest.mock('@/components/panels/DemoPanels/DemoPanels', () => ({ Panel1Content: () => <div /> }));

import DemoPage from './page';

describe('DemoPage', () => {
  it('should render without crashing', () => {
    render(<DemoPage />);
    expect(screen.getAllByText(/demo/i).length).toBeGreaterThan(0);
  });
});
