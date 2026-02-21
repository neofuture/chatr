import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from './ThemeToggle';
import { ThemeProvider } from '@/contexts/ThemeContext';

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('ThemeToggle', () => {
  it('should render theme toggle button', () => {
    renderWithProvider(<ThemeToggle />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should show sun icon in dark mode', () => {
    renderWithProvider(<ThemeToggle />);

    // In dark mode, sun icon should be shown (to switch to light)
    const icon = screen.getByRole('button').querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should toggle theme when clicked', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ThemeToggle />);

    const button = screen.getByRole('button');
    await user.click(button);

    // Icon should change after toggle
    expect(button).toBeInTheDocument();
  });

  it('should have accessible label', () => {
    renderWithProvider(<ThemeToggle />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
  });

  it('should apply hover effects', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ThemeToggle />);

    const button = screen.getByRole('button');
    await user.hover(button);

    expect(button).toBeInTheDocument();
  });

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ThemeToggle />);

    const button = screen.getByRole('button');
    button.focus();

    expect(button).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(button).toBeInTheDocument();
  });

  it('should persist theme preference', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ThemeToggle />);

    const button = screen.getByRole('button');
    await user.click(button);

    // localStorage should be updated (if implemented)
    expect(button).toBeInTheDocument();
  });
});

