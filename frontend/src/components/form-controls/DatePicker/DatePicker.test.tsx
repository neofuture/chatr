import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DatePicker from './DatePicker';

describe('DatePicker', () => {
  describe('Rendering', () => {
    it('should render date picker input', () => {
      render(<DatePicker mode="date" />);

      // Should show current date by default (UK format by default)
      const input = screen.getByText(new Date().toLocaleDateString('en-GB', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }), { exact: false });
      expect(input).toBeInTheDocument();
    });

    it('should render with label', () => {
      render(<DatePicker label="Select Date" />);

      expect(screen.getByText('Select Date')).toBeInTheDocument();
    });

    it('should render without label when not provided', () => {
      const { container } = render(<DatePicker mode="date" />);

      const labels = container.querySelectorAll('.form-label');
      expect(labels).toHaveLength(0);
    });

    it('should render with error message', () => {
      render(<DatePicker error="Date is required" />);

      expect(screen.getByText('Date is required')).toBeInTheDocument();
    });

    it('should render calendar icon', () => {
      const { container } = render(<DatePicker mode="date" />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should not show picker modal initially', () => {
      render(<DatePicker mode="date" />);

      expect(screen.queryByText('Select Date')).not.toBeInTheDocument();
      expect(screen.queryByText('Done')).not.toBeInTheDocument();
    });
  });

  describe('Functionality', () => {
    it('should open picker modal when input is clicked', async () => {
      const user = userEvent.setup();
      render(<DatePicker mode="date" />);

      const input = screen.getByText(new Date().toLocaleDateString('en-GB', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }), { exact: false });

      await user.click(input);

      expect(screen.getByText('Select Date')).toBeInTheDocument();
      expect(screen.getByText('Done')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should close picker when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<DatePicker mode="date" />);

      // Open picker
      const input = screen.getByText(new Date().toLocaleDateString('en-GB', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }), { exact: false });
      await user.click(input);

      // Click Cancel
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Select Date')).not.toBeInTheDocument();
      });
    });

    it('should close picker when Done is clicked', async () => {
      const user = userEvent.setup();
      render(<DatePicker mode="date" />);

      // Open picker
      const input = screen.getByText(new Date().toLocaleDateString('en-GB', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }), { exact: false });
      await user.click(input);

      // Click Done
      const doneButton = screen.getByText('Done');
      await user.click(doneButton);

      await waitFor(() => {
        expect(screen.queryByText('Select Date')).not.toBeInTheDocument();
      });
    });

    it('should call onChange when Done is clicked', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      render(<DatePicker onChange={handleChange} mode="date" />);

      // Open picker
      const input = screen.getByText(new Date().toLocaleDateString('en-GB', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }), { exact: false });
      await user.click(input);

      // Click Done
      const doneButton = screen.getByText('Done');
      await user.click(doneButton);

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith(expect.any(Date));
    });

    it('should use provided value', () => {
      const testDate = new Date(2024, 5, 15, 14, 30); // June 15, 2024 14:30
      render(<DatePicker value={testDate} mode="date" />);

      // With mode="date", DatePicker shows only the date
      const formattedDate = testDate.toLocaleDateString('en-GB', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      expect(screen.getByText(formattedDate)).toBeInTheDocument();
    });

    it('should close picker when overlay is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<DatePicker mode="date" />);

      // Open picker
      const input = screen.getByText(new Date().toLocaleDateString('en-GB', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }), { exact: false });
      await user.click(input);

      // Click overlay
      const overlay = container.querySelector('.date-picker-overlay');
      if (overlay) {
        fireEvent.click(overlay);
      }

      await waitFor(() => {
        expect(screen.queryByText('Select Date')).not.toBeInTheDocument();
      });
    });
  });

  describe('Picker Wheels', () => {
    it('should render month wheel when picker is open', async () => {
      const user = userEvent.setup();
      render(<DatePicker mode="date" />);

      // Open picker
      const input = screen.getByText(new Date().toLocaleDateString('en-GB', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }), { exact: false });
      await user.click(input);

      // Check for month names (appear multiple times due to infinite scrolling)
      expect(screen.getAllByText('January').length).toBeGreaterThan(0);
      expect(screen.getAllByText('February').length).toBeGreaterThan(0);
      expect(screen.getAllByText('December').length).toBeGreaterThan(0);
    });

    it('should render day wheel when picker is open', async () => {
      const user = userEvent.setup();
      render(<DatePicker mode="date" />);

      // Open picker
      const input = screen.getByText(new Date().toLocaleDateString('en-GB', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }), { exact: false });
      await user.click(input);

      // Check for day numbers (at least day 1 should be there)
      const days = screen.getAllByText(/^[0-9]+$/);
      expect(days.length).toBeGreaterThan(0);
    });

    it('should render year wheel when picker is open', async () => {
      const user = userEvent.setup();
      render(<DatePicker mode="date" />);

      // Open picker
      const input = screen.getByText(new Date().toLocaleDateString('en-GB', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }), { exact: false });
      await user.click(input);

      const currentYear = new Date().getFullYear();
      // Year appears multiple times due to infinite scrolling
      const yearElements = screen.getAllByText(currentYear.toString());
      expect(yearElements.length).toBeGreaterThan(0);
    });

    it('should render highlight bar in picker', async () => {
      const user = userEvent.setup();
      const { container } = render(<DatePicker mode="date" />);

      // Open picker
      const input = screen.getByText(new Date().toLocaleDateString('en-GB', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }), { exact: false });
      await user.click(input);

      const highlight = container.querySelector('.date-picker-highlight');
      expect(highlight).toBeInTheDocument();
    });
  });

  describe('ForwardRef', () => {
    it('should forward ref correctly', () => {
      const ref = { current: null as HTMLDivElement | null };
      render(<DatePicker ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Accessibility', () => {
    it('should have proper form group structure', () => {
      const { container } = render(<DatePicker label="Date" />);

      const formGroup = container.querySelector('.form-group');
      expect(formGroup).toBeInTheDocument();
    });

    it('should show header with proper buttons in picker', async () => {
      const user = userEvent.setup();
      render(<DatePicker mode="date" />);

      // Open picker
      const input = screen.getByText(new Date().toLocaleDateString('en-GB', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }), { exact: false });
      await user.click(input);

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Done/i })).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply date-picker-input class', () => {
      const { container } = render(<DatePicker mode="date" />);

      const input = container.querySelector('.date-picker-input');
      expect(input).toBeInTheDocument();
    });

    it('should apply error styling when error is provided', () => {
      render(<DatePicker error="Invalid date" />);

      const error = screen.getByText('Invalid date');
      expect(error).toHaveClass('error-message');
    });
  });
});

