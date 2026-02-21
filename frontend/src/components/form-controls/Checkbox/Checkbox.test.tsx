import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Checkbox from './Checkbox';

describe('Checkbox', () => {
  describe('Rendering', () => {
    it('should render checkbox', () => {
      render(<Checkbox label="Accept terms" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });

    it('should render with label', () => {
      render(<Checkbox label="I agree" />);

      expect(screen.getByText('I agree')).toBeInTheDocument();
    });

    it('should render without label when not provided', () => {
      render(<Checkbox />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });

    it('should render with error message', () => {
      render(<Checkbox label="Accept" error="This field is required" />);

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });
  });

  describe('Functionality', () => {
    it('should handle check/uncheck', async () => {
      const user = userEvent.setup();
      render(<Checkbox label="Test checkbox" />);

      const checkbox = screen.getByRole('checkbox');

      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('should respect checked prop', () => {
      render(<Checkbox label="Checked" checked onChange={() => {}} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should respect disabled state', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<Checkbox label="Disabled" disabled onChange={handleChange} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeDisabled();

      await user.click(checkbox);
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('should call onChange when clicked', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      render(<Checkbox label="Test" onChange={handleChange} />);

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(handleChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('ForwardRef', () => {
    it('should forward ref correctly', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<Checkbox ref={ref} label="Test" />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current?.type).toBe('checkbox');
    });
  });

  describe('Accessibility', () => {
    it('should have proper type attribute', () => {
      render(<Checkbox label="Test" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('type', 'checkbox');
    });

    it('should support required attribute', () => {
      render(<Checkbox label="Required" required />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeRequired();
    });

    it('should support name attribute', () => {
      render(<Checkbox label="Test" name="test-checkbox" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('name', 'test-checkbox');
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      render(<Checkbox label="Test" className="custom-class" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox.className).toContain('custom-class');
    });

    it('should have checkbox-input class', () => {
      render(<Checkbox label="Test" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveClass('checkbox-input');
    });
  });
});

