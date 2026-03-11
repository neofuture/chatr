import { render, screen } from '@testing-library/react';
import MessageAudioPlayer from './MessageAudioPlayer';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    fill: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    arc: jest.fn(),
    roundRect: jest.fn(),
    rect: jest.fn(),
    drawImage: jest.fn(),
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    setTransform: jest.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    globalAlpha: 1,
    canvas: { width: 300, height: 48 },
  })) as any;

  global.ResizeObserver = class {
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
  } as any;

  window.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 0) as any);
  window.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

  const mockAudioPlay = jest.fn().mockResolvedValue(undefined);
  const mockAudioPause = jest.fn();
  const mockAudioLoad = jest.fn();
  const mockAudioAddEventListener = jest.fn();
  const mockAudioRemoveEventListener = jest.fn();

  jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(mockAudioPlay);
  jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(mockAudioPause);
  jest.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(mockAudioLoad);
  jest.spyOn(window.HTMLMediaElement.prototype, 'addEventListener').mockImplementation(mockAudioAddEventListener);
  jest.spyOn(window.HTMLMediaElement.prototype, 'removeEventListener').mockImplementation(mockAudioRemoveEventListener);
});

afterAll(() => {
  jest.restoreAllMocks();
});

const defaultProps = {
  audioUrl: 'https://example.com/audio.webm',
  duration: 15,
  waveformData: [0.2, 0.5, 0.8, 0.3, 0.6, 0.9, 0.4, 0.7],
  timestamp: new Date('2025-01-15T10:30:00'),
  isSent: true,
};

describe('MessageAudioPlayer', () => {
  it('renders audio element with correct src', () => {
    const { container } = render(<MessageAudioPlayer {...defaultProps} />);
    const audio = container.querySelector('audio');
    expect(audio).toBeInTheDocument();
    expect(audio).toHaveAttribute('src', 'https://example.com/audio.webm');
  });

  it('renders play button', () => {
    render(<MessageAudioPlayer {...defaultProps} />);
    const playBtn = screen.getByRole('button');
    expect(playBtn).toBeInTheDocument();
  });

  it('shows duration display', () => {
    render(<MessageAudioPlayer {...defaultProps} />);
    expect(screen.getByText(/0:15/)).toBeInTheDocument();
  });

  it('play button has aria-label "Play"', () => {
    render(<MessageAudioPlayer {...defaultProps} />);
    expect(screen.getByLabelText('Play')).toBeInTheDocument();
  });

  it('renders waveform canvas', () => {
    render(<MessageAudioPlayer {...defaultProps} />);
    const canvas = screen.getByRole('img', { name: 'Audio waveform' });
    expect(canvas).toBeInTheDocument();
    expect(canvas.tagName).toBe('CANVAS');
  });

  it('canvas has aria-label "Audio waveform"', () => {
    render(<MessageAudioPlayer {...defaultProps} />);
    expect(screen.getByLabelText('Audio waveform')).toBeInTheDocument();
  });

  it('renders timestamp', () => {
    render(<MessageAudioPlayer {...defaultProps} />);
    const timeString = new Date('2025-01-15T10:30:00').toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    expect(screen.getByText(timeString)).toBeInTheDocument();
  });
});
