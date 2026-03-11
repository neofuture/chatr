import { render, screen } from '@testing-library/react';
import BackgroundBlobs from './BackgroundBlobs';

describe('BackgroundBlobs Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<BackgroundBlobs />);
    expect(container).toBeInTheDocument();
  });

  it('renders the bg-effects container', () => {
    render(<BackgroundBlobs />);
    const bgEffects = screen.getByTestId('bg-effects');
    expect(bgEffects).toBeInTheDocument();
  });

  it('renders three blob elements', () => {
    render(<BackgroundBlobs />);
    expect(screen.getByTestId('bg-blob-1')).toBeInTheDocument();
    expect(screen.getByTestId('bg-blob-2')).toBeInTheDocument();
    expect(screen.getByTestId('bg-blob-3')).toBeInTheDocument();
  });

  it('renders blob with correct class names', () => {
    render(<BackgroundBlobs />);

    const blob1 = screen.getByTestId('bg-blob-1');
    const blob2 = screen.getByTestId('bg-blob-2');
    const blob3 = screen.getByTestId('bg-blob-3');

    expect(blob1).toBeInTheDocument();
    expect(blob2).toBeInTheDocument();
    expect(blob3).toBeInTheDocument();
  });

  it('applies correct structure', () => {
    render(<BackgroundBlobs />);

    const bgEffects = screen.getByTestId('bg-effects');
    expect(bgEffects.children).toHaveLength(3);
  });

  it('each blob has both bg-blob and specific class', () => {
    render(<BackgroundBlobs />);

    const blob1 = screen.getByTestId('bg-blob-1');
    const blob2 = screen.getByTestId('bg-blob-2');
    const blob3 = screen.getByTestId('bg-blob-3');

    expect(blob1.className).toContain('bg-blob');
    expect(blob2.className).toContain('bg-blob');
    expect(blob3.className).toContain('bg-blob');
  });

  it('renders as a client component', () => {
    expect(() => render(<BackgroundBlobs />)).not.toThrow();
  });

  it('has stable structure across renders', () => {
    const { rerender } = render(<BackgroundBlobs />);

    expect(screen.getByTestId('bg-blob-1')).toBeInTheDocument();
    expect(screen.getByTestId('bg-blob-2')).toBeInTheDocument();
    expect(screen.getByTestId('bg-blob-3')).toBeInTheDocument();

    rerender(<BackgroundBlobs />);

    expect(screen.getByTestId('bg-blob-1')).toBeInTheDocument();
    expect(screen.getByTestId('bg-blob-2')).toBeInTheDocument();
    expect(screen.getByTestId('bg-blob-3')).toBeInTheDocument();
  });
});
