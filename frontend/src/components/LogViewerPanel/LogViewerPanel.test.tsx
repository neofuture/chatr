import { render, screen, fireEvent } from '@testing-library/react';
import LogViewerPanel from './LogViewerPanel';

const mockClearLogs = jest.fn();
const mockCopyLogs = jest.fn();

jest.mock('@/contexts/LogContext', () => ({
  useLog: () => ({
    logs: [
      { id: '1', event: 'message:send', type: 'sent', data: { text: 'hi' }, timestamp: new Date('2025-01-01T12:00:00') },
      { id: '2', event: 'message:received', type: 'received', data: {}, timestamp: new Date('2025-01-01T12:01:00') },
    ],
    clearLogs: mockClearLogs,
    copyLogs: mockCopyLogs,
  }),
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', isDark: true, toggleTheme: jest.fn() }),
}));

beforeEach(() => {
  mockClearLogs.mockClear();
  mockCopyLogs.mockClear();
});

describe('LogViewerPanel', () => {
  it('renders "System Logs" heading', () => {
    render(<LogViewerPanel />);
    expect(screen.getByText('System Logs')).toBeInTheDocument();
  });

  it('shows log entry count badge', () => {
    const { container } = render(<LogViewerPanel />);
    const badge = container.querySelector('.badge');
    expect(badge).toHaveTextContent('2');
  });

  it('renders filter pills (All, Sent, Recv, Info, Error)', () => {
    render(<LogViewerPanel />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
    expect(screen.getByText('Recv')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('shows log entries', () => {
    render(<LogViewerPanel />);
    expect(screen.getByText('message:send')).toBeInTheDocument();
    expect(screen.getByText('message:received')).toBeInTheDocument();
  });

  it('Copy button calls copyLogs', () => {
    render(<LogViewerPanel />);
    fireEvent.click(screen.getByText('Copy'));
    expect(mockCopyLogs).toHaveBeenCalled();
  });

  it('Clear button calls clearLogs', () => {
    render(<LogViewerPanel />);
    fireEvent.click(screen.getByText('Clear'));
    expect(mockClearLogs).toHaveBeenCalled();
  });

  it('filter buttons filter logs', () => {
    render(<LogViewerPanel />);
    fireEvent.click(screen.getByText('Sent'));
    expect(screen.getByText('message:send')).toBeInTheDocument();
    expect(screen.queryByText('message:received')).not.toBeInTheDocument();
  });
});
