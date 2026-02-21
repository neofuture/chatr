import { render } from '@testing-library/react';
import BackgroundBlobs from './BackgroundBlobs';

describe('BackgroundBlobs Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<BackgroundBlobs />);
    expect(container).toBeInTheDocument();
  });

  it('renders the bg-effects container', () => {
    const { container } = render(<BackgroundBlobs />);
    const bgEffects = container.querySelector('.bg-effects');
    expect(bgEffects).toBeInTheDocument();
  });

  it('renders three blob elements', () => {
    const { container } = render(<BackgroundBlobs />);
    const blobs = container.querySelectorAll('.bg-blob');
    expect(blobs).toHaveLength(3);
  });

  it('renders blob with correct class names', () => {
    const { container } = render(<BackgroundBlobs />);

    const blob1 = container.querySelector('.bg-blob-1');
    const blob2 = container.querySelector('.bg-blob-2');
    const blob3 = container.querySelector('.bg-blob-3');

    expect(blob1).toBeInTheDocument();
    expect(blob2).toBeInTheDocument();
    expect(blob3).toBeInTheDocument();
  });

  it('applies correct structure', () => {
    const { container } = render(<BackgroundBlobs />);

    const bgEffects = container.querySelector('.bg-effects');
    expect(bgEffects?.children).toHaveLength(3);

    Array.from(bgEffects?.children || []).forEach((child) => {
      expect(child).toHaveClass('bg-blob');
    });
  });

  it('each blob has both bg-blob and specific class', () => {
    const { container } = render(<BackgroundBlobs />);

    const blob1 = container.querySelector('.bg-blob-1');
    const blob2 = container.querySelector('.bg-blob-2');
    const blob3 = container.querySelector('.bg-blob-3');

    expect(blob1).toHaveClass('bg-blob', 'bg-blob-1');
    expect(blob2).toHaveClass('bg-blob', 'bg-blob-2');
    expect(blob3).toHaveClass('bg-blob', 'bg-blob-3');
  });

  it('renders as a client component', () => {
    // This test verifies the component can be rendered
    // Client components should render without server-side issues
    expect(() => render(<BackgroundBlobs />)).not.toThrow();
  });

  it('has stable structure across renders', () => {
    const { container, rerender } = render(<BackgroundBlobs />);

    const initialBlobs = container.querySelectorAll('.bg-blob');
    expect(initialBlobs).toHaveLength(3);

    rerender(<BackgroundBlobs />);

    const rerenderBlobs = container.querySelectorAll('.bg-blob');
    expect(rerenderBlobs).toHaveLength(3);
  });
});

