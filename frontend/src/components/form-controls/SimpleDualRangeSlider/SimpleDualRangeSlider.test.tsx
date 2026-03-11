import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SimpleDualRangeSlider from './SimpleDualRangeSlider';

describe('SimpleDualRangeSlider', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<SimpleDualRangeSlider />);

      expect(container.querySelector('.simple-dual-range-slider-container')).toBeInTheDocument();
    });

    it('should show label when provided', () => {
      render(<SimpleDualRangeSlider label="Age Range" />);

      expect(screen.getByText('Age Range')).toBeInTheDocument();
    });

    it('should render two range inputs', () => {
      const { container } = render(<SimpleDualRangeSlider />);

      const minInput = container.querySelector('.simple-dual-range-slider-input-min');
      const maxInput = container.querySelector('.simple-dual-range-slider-input-max');
      expect(minInput).toBeInTheDocument();
      expect(maxInput).toBeInTheDocument();
    });

    it('should show values when showValues is true', () => {
      render(
        <SimpleDualRangeSlider label="Range" showValues defaultMinValue={15} defaultMaxValue={85} />
      );

      expect(screen.getByText(/15/)).toBeInTheDocument();
      expect(screen.getByText(/85/)).toBeInTheDocument();
    });

    it('should display prefix and suffix with values', () => {
      render(
        <SimpleDualRangeSlider
          label="Weight"
          showValues
          defaultMinValue={10}
          defaultMaxValue={90}
          valuePrefix="~"
          valueSuffix="kg"
        />
      );

      expect(screen.getByText(/~10kg/)).toBeInTheDocument();
      expect(screen.getByText(/~90kg/)).toBeInTheDocument();
    });

    it('should show error message when provided', () => {
      render(<SimpleDualRangeSlider error="Range is invalid" />);

      expect(screen.getByText('Range is invalid')).toBeInTheDocument();
    });
  });

  describe('Functionality', () => {
    it('should call onChange when min changes', () => {
      const handleChange = jest.fn();
      const { container } = render(
        <SimpleDualRangeSlider onChange={handleChange} defaultMinValue={20} defaultMaxValue={80} />
      );

      const minInput = container.querySelector('.simple-dual-range-slider-input-min') as HTMLInputElement;
      fireEvent.change(minInput, { target: { value: '30' } });

      expect(handleChange).toHaveBeenCalledWith(30, 80);
    });

    it('should call onChange when max changes', () => {
      const handleChange = jest.fn();
      const { container } = render(
        <SimpleDualRangeSlider onChange={handleChange} defaultMinValue={20} defaultMaxValue={80} />
      );

      const maxInput = container.querySelector('.simple-dual-range-slider-input-max') as HTMLInputElement;
      fireEvent.change(maxInput, { target: { value: '60' } });

      expect(handleChange).toHaveBeenCalledWith(20, 60);
    });

    it('should not allow min to exceed max', () => {
      const handleChange = jest.fn();
      const { container } = render(
        <SimpleDualRangeSlider onChange={handleChange} defaultMinValue={20} defaultMaxValue={50} step={1} />
      );

      const minInput = container.querySelector('.simple-dual-range-slider-input-min') as HTMLInputElement;
      fireEvent.change(minInput, { target: { value: '60' } });

      expect(handleChange).toHaveBeenCalledWith(49, 50);
    });

    it('should use default values correctly', () => {
      const { container } = render(
        <SimpleDualRangeSlider defaultMinValue={30} defaultMaxValue={70} />
      );

      const minInput = container.querySelector('.simple-dual-range-slider-input-min') as HTMLInputElement;
      const maxInput = container.querySelector('.simple-dual-range-slider-input-max') as HTMLInputElement;

      expect(minInput.value).toBe('30');
      expect(maxInput.value).toBe('70');
    });
  });
});
