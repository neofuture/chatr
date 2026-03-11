import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VoiceRecorder from './VoiceRecorder';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', isDark: true, toggleTheme: jest.fn() }),
}));

jest.mock('@/components/form-controls/Button/Button', () => {
  return function MockButton({ children, onClick, disabled, icon }: any) {
    return (
      <button onClick={onClick} disabled={disabled}>
        {icon}
        {children}
      </button>
    );
  };
});

const mockGetUserMedia = jest.fn();
const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  ondataavailable: null as any,
  onstop: null as any,
  state: 'inactive',
  mimeType: 'audio/webm',
};

const mockAnalyserNode = {
  fftSize: 0,
  smoothingTimeConstant: 0,
  frequencyBinCount: 128,
  getByteTimeDomainData: jest.fn(),
  connect: jest.fn(),
};

const mockAudioContext = {
  createMediaStreamSource: jest.fn(() => ({ connect: jest.fn() })),
  createAnalyser: jest.fn(() => mockAnalyserNode),
  createOscillator: jest.fn(() => ({
    connect: jest.fn(),
    frequency: { value: 0 },
    type: '',
    start: jest.fn(),
    stop: jest.fn(),
  })),
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
  })),
  destination: {},
  currentTime: 0,
  state: 'running',
  close: jest.fn(),
  resume: jest.fn().mockResolvedValue(undefined),
};

beforeAll(() => {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    configurable: true,
  });

  (global as any).MediaRecorder = jest.fn(() => mockMediaRecorder);
  (global as any).MediaRecorder.isTypeSupported = jest.fn(() => true);

  (global as any).AudioContext = jest.fn(() => mockAudioContext);
  (window as any).AudioContext = jest.fn(() => mockAudioContext);
});

beforeEach(() => {
  jest.clearAllMocks();
  mockMediaRecorder.state = 'inactive';
});

const defaultProps = {
  onRecordingComplete: jest.fn(),
  onRecordingStart: jest.fn(),
  onRecordingStop: jest.fn(),
};

describe('VoiceRecorder', () => {
  it('renders record button', () => {
    render(<VoiceRecorder {...defaultProps} />);
    expect(screen.getByRole('button', { name: /record voice message/i })).toBeInTheDocument();
  });

  it('shows microphone icon', () => {
    const { container } = render(<VoiceRecorder {...defaultProps} />);
    expect(container.querySelector('.fa-microphone')).toBeInTheDocument();
  });

  it('button is disabled when disabled prop is true', () => {
    render(<VoiceRecorder {...defaultProps} disabled />);
    expect(screen.getByRole('button', { name: /record voice message/i })).toBeDisabled();
  });

  it('renders compact version when compact is true', () => {
    const { container } = render(<VoiceRecorder {...defaultProps} compact />);
    const btn = screen.getByTitle('Record voice message');
    expect(btn).toBeInTheDocument();
    expect(btn.tagName).toBe('BUTTON');
    expect(container.querySelector('.fa-microphone')).toBeInTheDocument();
  });

  it('opens modal when record button clicked', async () => {
    const user = userEvent.setup();
    const mockStream = { getTracks: () => [{ stop: jest.fn() }] };
    mockGetUserMedia.mockResolvedValue(mockStream);

    render(<VoiceRecorder {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /record voice message/i }));

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled();
    });
  });

  it('shows "Initializing..." text when modal opens', async () => {
    const user = userEvent.setup();
    mockGetUserMedia.mockReturnValue(new Promise(() => {}));

    render(<VoiceRecorder {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /record voice message/i }));

    await waitFor(() => {
      expect(screen.getByText(/Initializing.../)).toBeInTheDocument();
    });
  });

  it('shows permission denied error when getUserMedia rejects', async () => {
    const user = userEvent.setup();
    mockGetUserMedia.mockRejectedValue(new DOMException('Permission denied'));

    render(<VoiceRecorder {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /record voice message/i }));

    await waitFor(() => {
      expect(screen.getByText(/Microphone access denied/)).toBeInTheDocument();
    });
  });

  it('shows close button in modal', async () => {
    const user = userEvent.setup();
    mockGetUserMedia.mockReturnValue(new Promise(() => {}));

    render(<VoiceRecorder {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /record voice message/i }));

    await waitFor(() => {
      const { container } = render(<div />);
      void container;
      const closeBtn = document.querySelector('.fa-times');
      expect(closeBtn).toBeInTheDocument();
    });
  });

  it('closes modal when close button clicked', async () => {
    const user = userEvent.setup();
    mockGetUserMedia.mockReturnValue(new Promise(() => {}));

    render(<VoiceRecorder {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /record voice message/i }));

    await waitFor(() => {
      expect(screen.getByText(/Initializing.../)).toBeInTheDocument();
    });

    const closeButton = screen.getByText(/Initializing.../).closest('div')!
      .parentElement!.querySelector('button:last-of-type') as HTMLElement;

    if (closeButton) {
      await user.click(closeButton);
    }

    await waitFor(() => {
      expect(screen.queryByText(/Initializing.../)).not.toBeInTheDocument();
    });
  });
});
