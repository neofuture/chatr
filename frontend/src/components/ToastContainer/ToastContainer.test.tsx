import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from '@/contexts/ToastContext';
import ToastContainer from './ToastContainer';

// Test component that uses the toast hook
function TestComponent() {
  const { showToast } = useToast();

  return (
    <div>
      <button onClick={() => showToast('Success message', 'success')}>
        Show Success
      </button>
      <button onClick={() => showToast('Error message', 'error')}>
        Show Error
      </button>
      <button onClick={() => showToast('Info message', 'info')}>
        Show Info
      </button>
      <button onClick={() => showToast('Warning message', 'warning')}>
        Show Warning
      </button>
      <button onClick={() => showToast('Quick toast', 'info', 1000)}>
        Show Quick Toast
      </button>
    </div>
  );
}

describe('ToastContainer Component', () => {
  const renderWithProvider = () => {
    return render(
      <ToastProvider>
        <TestComponent />
        <ToastContainer />
      </ToastProvider>
    );
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Wrap cleanup in act to handle any pending state updates
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('does not render any toasts initially', () => {
    renderWithProvider();
    const toastContainer = screen.getByTestId('toast-container');
    expect(toastContainer).toBeInTheDocument();
    expect(toastContainer?.children).toHaveLength(0);
  });

  it('renders success toast when triggered', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    const showButton = screen.getByText('Show Success');
    await user.click(showButton);

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByTestId('toast-success')).toBeInTheDocument();
  });

  it('renders error toast when triggered', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    const showButton = screen.getByText('Show Error');
    await user.click(showButton);

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByTestId('toast-error')).toBeInTheDocument();
  });

  it('renders info toast when triggered', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    const showButton = screen.getByText('Show Info');
    await user.click(showButton);

    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
    expect(screen.getByTestId('toast-info')).toBeInTheDocument();
  });

  it('renders warning toast when triggered', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    const showButton = screen.getByText('Show Warning');
    await user.click(showButton);

    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Warning message')).toBeInTheDocument();
    expect(screen.getByTestId('toast-warning')).toBeInTheDocument();
  });

  it('displays correct icon for each toast type', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    // Success - uses FontAwesome check icon
    await user.click(screen.getByText('Show Success'));
    expect(document.querySelector('.fa-check')).toBeInTheDocument();

    // Error - uses FontAwesome times icon
    await user.click(screen.getByText('Show Error'));
    expect(document.querySelector('.fa-times')).toBeInTheDocument();

    // Info - uses FontAwesome info-circle icon
    await user.click(screen.getByText('Show Info'));
    expect(document.querySelector('.fa-info-circle')).toBeInTheDocument();

    // Warning - uses FontAwesome exclamation-triangle icon
    await user.click(screen.getByText('Show Warning'));
    expect(document.querySelector('.fa-exclamation-triangle')).toBeInTheDocument();
  });

  it('automatically removes toast after duration', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    const showButton = screen.getByText('Show Success');
    await user.click(showButton);

    expect(screen.getByText('Success message')).toBeInTheDocument();

    // Fast-forward time past the default duration (4000ms)
    act(() => {
      jest.advanceTimersByTime(4000);
    });

    // Wait for exit animation (300ms)
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });

  it('removes toast when close button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    const showButton = screen.getByText('Show Success');
    await user.click(showButton);

    expect(screen.getByText('Success message')).toBeInTheDocument();

    const toastCloseButton = screen.getByTestId('toast-close');
    await user.click(toastCloseButton);

    // Wait for exit animation
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });

  it('removes toast when clicked', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    const showButton = screen.getByText('Show Success');
    await user.click(showButton);

    expect(screen.getByText('Success message')).toBeInTheDocument();

    const toast = screen.getByTestId('toast-success');
    await user.click(toast);

    // Wait for exit animation
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });

  it('handles multiple toasts simultaneously', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    await user.click(screen.getByText('Show Success'));
    await user.click(screen.getByText('Show Error'));
    await user.click(screen.getByText('Show Info'));

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('respects custom duration', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    const showButton = screen.getByText('Show Quick Toast');
    await user.click(showButton);

    expect(screen.getByText('Quick toast')).toBeInTheDocument();

    // Fast-forward by custom duration (1000ms)
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Wait for exit animation
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.queryByText('Quick toast')).not.toBeInTheDocument();
    });
  });

  it('has correct structure for each toast', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    await user.click(screen.getByText('Show Success'));

    const toast = screen.getByTestId('toast-success');
    expect(toast).toBeInTheDocument();

    const icon = screen.getByTestId('toast-icon');
    expect(icon).toBeInTheDocument();

    const message = screen.getByTestId('toast-message');
    expect(message).toBeInTheDocument();

    const title = screen.getByTestId('toast-title');
    expect(title).toBeInTheDocument();

    const text = screen.getByTestId('toast-text');
    expect(text).toBeInTheDocument();

    const closeBtn = screen.getByTestId('toast-close');
    expect(closeBtn).toBeInTheDocument();
  });

  it('applies exit animation class before removal', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    await user.click(screen.getByText('Show Success'));

    const toast = screen.getByTestId('toast-success');
    expect(toast).not.toHaveAttribute('data-exiting');

    const toastCloseButton = screen.getByTestId('toast-close');
    await user.click(toastCloseButton);

    expect(toast).toHaveAttribute('data-exiting', 'true');
  });
});

