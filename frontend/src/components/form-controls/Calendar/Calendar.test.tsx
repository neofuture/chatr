import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Calendar from './Calendar';

describe('Calendar', () => {
  const today = new Date();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  describe('Rendering', () => {
    it('should render calendar grid with day buttons', () => {
      const { container } = render(<Calendar />);

      const dayButtons = container.querySelectorAll('.calendar-day');
      expect(dayButtons.length).toBe(42);
    });

    it('should show current month and year in header', () => {
      render(<Calendar />);

      const expectedHeader = `${monthNames[today.getMonth()]} ${today.getFullYear()}`;
      expect(screen.getByText(expectedHeader)).toBeInTheDocument();
    });

    it('should show weekday headers (Sun-Sat)', () => {
      render(<Calendar />);

      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((day) => {
        expect(screen.getByText(day)).toBeInTheDocument();
      });
    });

    it('should highlight today\'s date', () => {
      const { container } = render(<Calendar />);

      const todayButton = container.querySelector('.calendar-day.today');
      expect(todayButton).toBeInTheDocument();
      expect(todayButton?.textContent).toBe(String(today.getDate()));
    });

    it('should mark selected date', () => {
      const selectedDate = new Date(2025, 5, 15);
      const { container } = render(<Calendar value={selectedDate} />);

      const selectedButton = container.querySelector('.calendar-day.selected');
      expect(selectedButton).toBeInTheDocument();
      expect(selectedButton?.textContent).toBe('15');
    });

    it('should show time picker in datetime mode', () => {
      const { container } = render(<Calendar mode="datetime" />);

      expect(screen.getByText('Time')).toBeInTheDocument();
      const selects = container.querySelectorAll('select');
      expect(selects.length).toBe(2);
    });

    it('should show only time picker in time mode', () => {
      const { container } = render(<Calendar mode="time" />);

      expect(screen.getByText('Select Time')).toBeInTheDocument();
      const selects = container.querySelectorAll('select');
      expect(selects.length).toBe(2);

      const calendarBody = container.querySelector('.calendar-body');
      expect(calendarBody).not.toBeInTheDocument();

      const calendarHeader = container.querySelector('.calendar-header');
      expect(calendarHeader).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to previous month when prev button clicked', async () => {
      const user = userEvent.setup();
      render(<Calendar value={new Date(2025, 6, 15)} />);

      expect(screen.getByText('July 2025')).toBeInTheDocument();

      const navButtons = screen.getAllByRole('button').filter(
        (btn) => btn.classList.contains('calendar-nav-btn')
      );
      await user.click(navButtons[0]);

      expect(screen.getByText('June 2025')).toBeInTheDocument();
    });

    it('should navigate to next month when next button clicked', async () => {
      const user = userEvent.setup();
      render(<Calendar value={new Date(2025, 6, 15)} />);

      expect(screen.getByText('July 2025')).toBeInTheDocument();

      const navButtons = screen.getAllByRole('button').filter(
        (btn) => btn.classList.contains('calendar-nav-btn')
      );
      await user.click(navButtons[1]);

      expect(screen.getByText('August 2025')).toBeInTheDocument();
    });

    it('should jump to current date when Today button clicked', async () => {
      const user = userEvent.setup();
      render(<Calendar value={new Date(2024, 0, 1)} />);

      expect(screen.getByText('January 2024')).toBeInTheDocument();

      await user.click(screen.getByText('Today'));

      const expectedHeader = `${monthNames[today.getMonth()]} ${today.getFullYear()}`;
      expect(screen.getByText(expectedHeader)).toBeInTheDocument();
    });
  });

  describe('Functionality', () => {
    it('should call onChange when day is clicked in date mode', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      const { container } = render(
        <Calendar mode="date" value={new Date(2025, 6, 1)} onChange={handleChange} />
      );

      const currentMonthDays = container.querySelectorAll('.calendar-day:not(.other-month)');
      const day15 = Array.from(currentMonthDays).find((btn) => btn.textContent === '15');
      expect(day15).toBeTruthy();

      await user.click(day15!);

      expect(handleChange).toHaveBeenCalledTimes(1);
      const calledDate = handleChange.mock.calls[0][0] as Date;
      expect(calledDate.getDate()).toBe(15);
      expect(calledDate.getMonth()).toBe(6);
      expect(calledDate.getFullYear()).toBe(2025);
    });

    it('should call onClose when Cancel clicked', async () => {
      const handleClose = jest.fn();
      const user = userEvent.setup();
      render(<Calendar onClose={handleClose} />);

      await user.click(screen.getByText('Cancel'));

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should call onChange with correct date when Confirm clicked', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      render(
        <Calendar mode="datetime" value={new Date(2025, 6, 15, 10, 30)} onChange={handleChange} />
      );

      await user.click(screen.getByText('Confirm'));

      expect(handleChange).toHaveBeenCalledTimes(1);
      const calledDate = handleChange.mock.calls[0][0] as Date;
      expect(calledDate.getDate()).toBe(15);
      expect(calledDate.getMonth()).toBe(6);
      expect(calledDate.getFullYear()).toBe(2025);
      expect(calledDate.getHours()).toBe(10);
      expect(calledDate.getMinutes()).toBe(30);
    });
  });
});
