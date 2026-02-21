import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RangeSlider from './RangeSlider';

describe('RangeSlider', () => {
  describe('Rendering', () => {
    it('should render range slider', () => {
      render(<RangeSlider />);

      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
    });

    it('should render with label', () => {
      render(<RangeSlider label="Volume" />);

      expect(screen.getByText('Volume')).toBeInTheDocument();
    });

    it('should show value by default', () => {
      render(<RangeSlider label="Test" defaultValue={50} />);

      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('should hide value when showValue is false', () => {
      const { container } = render(<RangeSlider label="Test" defaultValue={50} showValue={false} />);

      const valueElement = container.querySelector('.range-value');
      expect(valueElement).not.toBeInTheDocument();
    });

    it('should render with value prefix and suffix', () => {
      render(<RangeSlider label="Price" defaultValue={100} valuePrefix="$" valueSuffix=" USD" />);

      expect(screen.getByText('$100 USD')).toBeInTheDocument();
    });

    it('should render with error message', () => {
      render(<RangeSlider label="Test" error="Value out of range" />);

      expect(screen.getByText('Value out of range')).toBeInTheDocument();
    });
  });

  describe('Functionality', () => {
    it('should handle value changes', () => {
      const handleChange = jest.fn();
      render(<RangeSlider onChange={handleChange} />);

      const slider = screen.getByRole('slider');

      // Simulate changing the slider value
      fireEvent.change(slider, { target: { value: '75' } });

      expect(handleChange).toHaveBeenCalled();
    });

    it('should respect min and max attributes', () => {
      render(<RangeSlider min={0} max={100} />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('min', '0');
      expect(slider).toHaveAttribute('max', '100');
    });

    it('should respect step attribute', () => {
      render(<RangeSlider step={5} />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('step', '5');
    });

    it('should use defaultValue', () => {
      render(<RangeSlider defaultValue={75} showValue />);

      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('should work as controlled component', () => {
      const { rerender } = render(<RangeSlider value={25} onChange={() => {}} showValue />);

      expect(screen.getByText('25')).toBeInTheDocument();

      rerender(<RangeSlider value={75} onChange={() => {}} showValue />);

      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('should respect disabled state', () => {
      render(<RangeSlider disabled />);

      const slider = screen.getByRole('slider');
      expect(slider).toBeDisabled();
    });
  });

  describe('ForwardRef', () => {
    it('should forward ref correctly', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<RangeSlider ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current?.type).toBe('range');
    });
  });

  describe('Accessibility', () => {
    it('should have proper type attribute', () => {
      render(<RangeSlider />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('type', 'range');
    });

    it('should support aria-label', () => {
      render(<RangeSlider aria-label="Volume control" />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-label', 'Volume control');
    });

    it('should support name attribute', () => {
      render(<RangeSlider name="volume" />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('name', 'volume');
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      render(<RangeSlider className="custom-slider" />);

      const slider = screen.getByRole('slider');
      expect(slider.className).toContain('custom-slider');
    });

    it('should have range-slider class', () => {
      render(<RangeSlider />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveClass('range-slider');
    });
  });
});

