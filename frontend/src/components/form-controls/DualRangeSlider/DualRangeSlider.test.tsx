import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DualRangeSlider from './DualRangeSlider';

describe('DualRangeSlider', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<DualRangeSlider />);

      expect(container.querySelector('.dual-range-slider-container')).toBeInTheDocument();
    });

    it('should show label when provided', () => {
      render(<DualRangeSlider label="Price Range" />);

      expect(screen.getByText('Price Range')).toBeInTheDocument();
    });

    it('should not show label when not provided', () => {
      const { container } = render(<DualRangeSlider />);

      const labels = container.querySelectorAll('.form-label');
      expect(labels).toHaveLength(0);
    });

    it('should render two range inputs', () => {
      const { container } = render(<DualRangeSlider />);

      const minInput = container.querySelector('.dual-range-slider-input-min');
      const maxInput = container.querySelector('.dual-range-slider-input-max');
      expect(minInput).toBeInTheDocument();
      expect(maxInput).toBeInTheDocument();
    });

    it('should show values when showValues is true', () => {
      render(<DualRangeSlider label="Range" showValues defaultMinValue={20} defaultMaxValue={80} />);

      expect(screen.getByText(/20/)).toBeInTheDocument();
      expect(screen.getByText(/80/)).toBeInTheDocument();
    });

    it('should hide values when showValues is false', () => {
      const { container } = render(
        <DualRangeSlider label="Range" showValues={false} defaultMinValue={20} defaultMaxValue={80} />
      );

      const valueDisplay = container.querySelector('[class*="valueDisplay"]');
      expect(valueDisplay).not.toBeInTheDocument();
    });

    it('should display value prefix and suffix', () => {
      render(
        <DualRangeSlider
          label="Price"
          showValues
          defaultMinValue={10}
          defaultMaxValue={90}
          valuePrefix="$"
          valueSuffix=" USD"
        />
      );

      expect(screen.getByText(/\$10 USD/)).toBeInTheDocument();
      expect(screen.getByText(/\$90 USD/)).toBeInTheDocument();
    });

    it('should show error message when error provided', () => {
      render(<DualRangeSlider error="Invalid range" />);

      expect(screen.getByText('Invalid range')).toBeInTheDocument();
    });
  });

  describe('Functionality', () => {
    it('should call onChange when min slider changes', () => {
      const handleChange = jest.fn();
      const { container } = render(
        <DualRangeSlider onChange={handleChange} defaultMinValue={20} defaultMaxValue={80} />
      );

      const minInput = container.querySelector('.dual-range-slider-input-min') as HTMLInputElement;
      fireEvent.change(minInput, { target: { value: '30' } });

      expect(handleChange).toHaveBeenCalledWith(30, 80);
    });

    it('should call onChange when max slider changes', () => {
      const handleChange = jest.fn();
      const { container } = render(
        <DualRangeSlider onChange={handleChange} defaultMinValue={20} defaultMaxValue={80} />
      );

      const maxInput = container.querySelector('.dual-range-slider-input-max') as HTMLInputElement;
      fireEvent.change(maxInput, { target: { value: '70' } });

      expect(handleChange).toHaveBeenCalledWith(20, 70);
    });

    it('should not allow min value to exceed max value', () => {
      const handleChange = jest.fn();
      const { container } = render(
        <DualRangeSlider onChange={handleChange} defaultMinValue={20} defaultMaxValue={50} step={1} />
      );

      const minInput = container.querySelector('.dual-range-slider-input-min') as HTMLInputElement;
      fireEvent.change(minInput, { target: { value: '60' } });

      expect(handleChange).toHaveBeenCalledWith(49, 50);
    });

    it('should use custom min/max range', () => {
      const { container } = render(<DualRangeSlider min={10} max={200} />);

      const minInput = container.querySelector('.dual-range-slider-input-min') as HTMLInputElement;
      const maxInput = container.querySelector('.dual-range-slider-input-max') as HTMLInputElement;

      expect(minInput).toHaveAttribute('min', '10');
      expect(minInput).toHaveAttribute('max', '200');
      expect(maxInput).toHaveAttribute('min', '10');
      expect(maxInput).toHaveAttribute('max', '200');
    });

    it('should use default values', () => {
      const { container } = render(
        <DualRangeSlider defaultMinValue={25} defaultMaxValue={75} />
      );

      const minInput = container.querySelector('.dual-range-slider-input-min') as HTMLInputElement;
      const maxInput = container.querySelector('.dual-range-slider-input-max') as HTMLInputElement;

      expect(minInput.value).toBe('25');
      expect(maxInput.value).toBe('75');
    });
  });
});
