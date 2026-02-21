import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import BottomSheet from './BottomSheet';

describe('BottomSheet', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <BottomSheet isOpen={false}>
          <div>Content</div>
        </BottomSheet>
      );

      expect(document.querySelector('[role="dialog"]')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', async () => {
      render(
        <BottomSheet isOpen={true}>
          <div>Sheet Content</div>
        </BottomSheet>
      );

      await waitFor(() => {
        expect(screen.getByText('Sheet Content')).toBeInTheDocument();
      });
    });

    it('should render with title when provided', async () => {
      render(
        <BottomSheet isOpen={true} title="Test Sheet">
          <div>Content</div>
        </BottomSheet>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Sheet')).toBeInTheDocument();
      });
    });

    it('should render close button by default', async () => {
      render(
        <BottomSheet isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </BottomSheet>
      );

      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close bottom sheet');
        expect(closeButton).toBeInTheDocument();
      });
    });

    it('should not render close button when showCloseButton is false', async () => {
      render(
        <BottomSheet isOpen={true} showCloseButton={false}>
          <div>Content</div>
        </BottomSheet>
      );

      await waitFor(() => {
        const closeButton = screen.queryByLabelText('Close bottom sheet');
        expect(closeButton).not.toBeInTheDocument();
      });
    });
  });

  describe('Height Modes', () => {
    it('should apply full height mode', async () => {
      render(
        <BottomSheet isOpen={true} heightMode="full">
          <div>Content</div>
        </BottomSheet>
      );

      await waitFor(() => {
        const sheet = document.querySelector('[role="dialog"]');
        expect(sheet).toHaveStyle({ height: '100vh' });
      });
    });

    it('should apply fixed height mode with default height', async () => {
      render(
        <BottomSheet isOpen={true} heightMode="fixed">
          <div>Content</div>
        </BottomSheet>
      );

      await waitFor(() => {
        const sheet = document.querySelector('[role="dialog"]');
        expect(sheet).toHaveStyle({ height: '60vh' });
      });
    });

    it('should apply custom fixed height', async () => {
      render(
        <BottomSheet isOpen={true} heightMode="fixed" fixedHeight="400px">
          <div>Content</div>
        </BottomSheet>
      );

      await waitFor(() => {
        const sheet = document.querySelector('[role="dialog"]');
        expect(sheet).toHaveStyle({ height: '400px' });
      });
    });

    it('should apply auto height mode', async () => {
      render(
        <BottomSheet isOpen={true} heightMode="auto">
          <div>Content</div>
        </BottomSheet>
      );

      await waitFor(() => {
        const sheet = document.querySelector('[role="dialog"]');
        expect(sheet).toHaveStyle({ height: 'auto', maxHeight: '90vh' });
      });
    });
  });

  describe('Interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      render(
        <BottomSheet isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </BottomSheet>
      );

      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close bottom sheet');
        fireEvent.click(closeButton);
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', async () => {
      render(
        <BottomSheet isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </BottomSheet>
      );

      await waitFor(() => {
        const backdrop = document.querySelector('[role="presentation"]');
        expect(backdrop).toBeInTheDocument();
        if (backdrop) {
          fireEvent.click(backdrop);
        }
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not close when clicking inside sheet content', async () => {
      render(
        <BottomSheet isOpen={true} onClose={mockOnClose}>
          <div>Sheet Content</div>
        </BottomSheet>
      );

      await waitFor(() => {
        const content = screen.getByText('Sheet Content');
        fireEvent.click(content);
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should call onClose when Escape key is pressed', async () => {
      render(
        <BottomSheet isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </BottomSheet>
      );

      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not crash when Escape is pressed without onClose', async () => {
      render(
        <BottomSheet isOpen={true}>
          <div>Content</div>
        </BottomSheet>
      );

      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument();
      });

      expect(() => {
        fireEvent.keyDown(document, { key: 'Escape' });
      }).not.toThrow();
    });
  });

  describe('Animations', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should animate in when opening', async () => {
      render(
        <BottomSheet isOpen={true}>
          <div>Content</div>
        </BottomSheet>
      );

      const sheet = document.querySelector('[role="dialog"]');

      // Initially should be off-screen
      expect(sheet).toHaveStyle({ transform: 'translateY(100%)' });

      // After animation delay
      act(() => {
        jest.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(sheet).toHaveStyle({ transform: 'translateY(0)' });
      });
    });

    it('should remove from DOM after closing animation', async () => {
      const { rerender } = render(
        <BottomSheet isOpen={true}>
          <div>Content</div>
        </BottomSheet>
      );

      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument();
      });

      // Close sheet
      rerender(
        <BottomSheet isOpen={false}>
          <div>Content</div>
        </BottomSheet>
      );

      // Should still be visible but animating out
      expect(document.querySelector('[role="dialog"]')).toBeInTheDocument();

      // After animation completes, should be removed from DOM
      act(() => {
        jest.advanceTimersByTime(350);
      });

      await waitFor(() => {
        expect(document.querySelector('[role="dialog"]')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have role="dialog"', async () => {
      render(
        <BottomSheet isOpen={true}>
          <div>Content</div>
        </BottomSheet>
      );

      await waitFor(() => {
        const dialog = document.querySelector('[role="dialog"]');
        expect(dialog).toBeInTheDocument();
      });
    });

    it('should have aria-modal="true"', async () => {
      render(
        <BottomSheet isOpen={true}>
          <div>Content</div>
        </BottomSheet>
      );

      await waitFor(() => {
        const dialog = document.querySelector('[role="dialog"]');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
      });
    });

    it('should have aria-labelledby when title is provided', async () => {
      render(
        <BottomSheet isOpen={true} title="Test Sheet">
          <div>Content</div>
        </BottomSheet>
      );

      await waitFor(() => {
        const dialog = document.querySelector('[role="dialog"]');
        expect(dialog).toHaveAttribute('aria-labelledby', 'bottom-sheet-title');
        expect(screen.getByText('Test Sheet')).toHaveAttribute('id', 'bottom-sheet-title');
      });
    });

    it('should have aria-label on close button', async () => {
      render(
        <BottomSheet isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </BottomSheet>
      );

      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close bottom sheet');
        expect(closeButton).toHaveAttribute('aria-label', 'Close bottom sheet');
      });
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', async () => {
      render(
        <BottomSheet isOpen={true} className="custom-class">
          <div>Content</div>
        </BottomSheet>
      );

      await waitFor(() => {
        const sheet = document.querySelector('[role="dialog"]');
        expect(sheet).toHaveClass('custom-class');
      });
    });
  });

  describe('Body Scroll Prevention', () => {
    it('should prevent body scroll when open', async () => {
      render(
        <BottomSheet isOpen={true}>
          <div>Content</div>
        </BottomSheet>
      );

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden');
      });
    });

    it('should restore body scroll when closed', async () => {
      const { rerender } = render(
        <BottomSheet isOpen={true}>
          <div>Content</div>
        </BottomSheet>
      );

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden');
      });

      rerender(
        <BottomSheet isOpen={false}>
          <div>Content</div>
        </BottomSheet>
      );

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('');
      });
    });
  });
});

