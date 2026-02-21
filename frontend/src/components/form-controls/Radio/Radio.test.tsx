import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Radio from './Radio';

describe('Radio', () => {
  const defaultOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  describe('Rendering', () => {
    it('should render all radio options', () => {
      render(<Radio name="test" options={defaultOptions} />);

      expect(screen.getByLabelText('Option 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Option 2')).toBeInTheDocument();
      expect(screen.getByLabelText('Option 3')).toBeInTheDocument();
    });

    it('should render with label', () => {
      render(<Radio name="test" label="Choose an option" options={defaultOptions} />);

      expect(screen.getByText('Choose an option')).toBeInTheDocument();
    });

    it('should render without label when not provided', () => {
      const { container } = render(<Radio name="test" options={defaultOptions} />);

      const labels = container.querySelectorAll('.form-label');
      expect(labels).toHaveLength(0);
    });

    it('should render with error message', () => {
      render(<Radio name="test" options={defaultOptions} error="Please select an option" />);

      expect(screen.getByText('Please select an option')).toBeInTheDocument();
    });
  });

  describe('Functionality', () => {
    it('should handle selection', async () => {
      const user = userEvent.setup();
      render(<Radio name="test" options={defaultOptions} />);

      const option2 = screen.getByLabelText('Option 2');
      await user.click(option2);

      expect(option2).toBeChecked();
    });

    it('should only allow one selection', async () => {
      const user = userEvent.setup();
      render(<Radio name="test" options={defaultOptions} />);

      const option1 = screen.getByLabelText('Option 1');
      const option2 = screen.getByLabelText('Option 2');

      await user.click(option1);
      expect(option1).toBeChecked();

      await user.click(option2);
      expect(option2).toBeChecked();
      expect(option1).not.toBeChecked();
    });

    it('should respect disabled state on individual options', () => {
      const optionsWithDisabled = [
        ...defaultOptions,
        { value: 'disabled', label: 'Disabled Option', disabled: true },
      ];

      render(<Radio name="test" options={optionsWithDisabled} />);

      const disabledOption = screen.getByLabelText('Disabled Option');
      expect(disabledOption).toBeDisabled();
    });
  });

  describe('ForwardRef', () => {
    it('should forward ref to first radio input', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<Radio ref={ref} name="test" options={defaultOptions} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current?.type).toBe('radio');
    });
  });

  describe('Accessibility', () => {
    it('should have proper name attribute on all options', () => {
      render(<Radio name="test-group" options={defaultOptions} />);

      const radios = screen.getAllByRole('radio');
      radios.forEach(radio => {
        expect(radio).toHaveAttribute('name', 'test-group');
      });
    });

    it('should have proper value attributes', () => {
      render(<Radio name="test" options={defaultOptions} />);

      const option1 = screen.getByLabelText('Option 1');
      const option2 = screen.getByLabelText('Option 2');

      expect(option1).toHaveAttribute('value', 'option1');
      expect(option2).toHaveAttribute('value', 'option2');
    });
  });
});

