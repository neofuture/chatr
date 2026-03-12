import { render } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import RoutePreloader from './RoutePreloader';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('RoutePreloader', () => {
  let mockPrefetch: jest.Mock;

  beforeEach(() => {
    mockPrefetch = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      prefetch: mockPrefetch,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<RoutePreloader />);
    expect(container).toBeInTheDocument();
  });

  it('should not render any visible content', () => {
    const { container } = render(<RoutePreloader />);
    expect(container.firstChild).toBeNull();
  });

  it('should prefetch all critical app routes on mount', () => {
    render(<RoutePreloader />);

    expect(mockPrefetch).toHaveBeenCalledTimes(5);
    expect(mockPrefetch).toHaveBeenCalledWith('/app');
    expect(mockPrefetch).toHaveBeenCalledWith('/app/groups');
    expect(mockPrefetch).toHaveBeenCalledWith('/app/updates');
    expect(mockPrefetch).toHaveBeenCalledWith('/app/settings');
    expect(mockPrefetch).toHaveBeenCalledWith('/app/profile');
  });

  it('should log preload completion', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    render(<RoutePreloader />);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[RoutePreloader] Preloaded all app routes'
    );

    consoleSpy.mockRestore();
  });

  it('should only prefetch routes once', () => {
    const { rerender } = render(<RoutePreloader />);

    expect(mockPrefetch).toHaveBeenCalledTimes(5);

    // Rerender should not trigger prefetch again
    rerender(<RoutePreloader />);

    expect(mockPrefetch).toHaveBeenCalledTimes(5);
  });
});

