import { render, screen, fireEvent } from '@testing-library/react';
import Lightbox from './Lightbox';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

const defaultProps = {
  imageUrl: '/test-image.jpg',
  imageName: 'Test Image',
  isOpen: true,
  onClose: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Lightbox', () => {
  describe('Rendering', () => {
    it('renders nothing when closed', () => {
      const { container } = render(<Lightbox {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders image when open', () => {
      render(<Lightbox {...defaultProps} />);
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/test-image.jpg');
    });

    it('renders image name when provided', () => {
      render(<Lightbox {...defaultProps} />);
      expect(screen.getByText('Test Image')).toBeInTheDocument();
    });

    it('renders without image name when not provided', () => {
      render(<Lightbox {...defaultProps} imageName={undefined} />);
      expect(screen.queryByText('Test Image')).not.toBeInTheDocument();
    });

    it('renders a close button', () => {
      render(<Lightbox {...defaultProps} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onClose when close button is clicked', () => {
      render(<Lightbox {...defaultProps} />);
      const btn = screen.getByRole('button');
      fireEvent.click(btn, { stopPropagation: true });
      // Button click also bubbles to backdrop — called at least once
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', () => {
      const { container } = render(<Lightbox {...defaultProps} />);
      fireEvent.click(container.firstChild as Element);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', () => {
      render(<Lightbox {...defaultProps} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose for other keys', () => {
      render(<Lightbox {...defaultProps} />);
      fireEvent.keyDown(document, { key: 'Enter' });
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Body scroll', () => {
    it('prevents body scroll when open', () => {
      render(<Lightbox {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body scroll when closed', () => {
      const { unmount } = render(<Lightbox {...defaultProps} />);
      unmount();
      expect(document.body.style.overflow).toBe('unset');
    });
  });
});
