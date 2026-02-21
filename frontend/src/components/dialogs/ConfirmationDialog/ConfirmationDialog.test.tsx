import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmationProvider, useConfirmation } from '@/contexts/ConfirmationContext';
import ConfirmationDialog from './ConfirmationDialog';

// Test component that uses the confirmation hook
function TestComponent() {
  const { showConfirmation } = useConfirmation();

  const handleSimpleConfirmation = async () => {
    const result = await showConfirmation({
      title: 'Test Title',
      message: 'Test message',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Confirm', variant: 'primary', value: true },
      ],
    });
    return result;
  };

  const handleDangerConfirmation = async () => {
    const result = await showConfirmation({
      title: 'Danger Action',
      message: 'This is dangerous',
      urgency: 'danger',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Delete', variant: 'destructive', value: true },
      ],
    });
    return result;
  };

  const handleWarningConfirmation = async () => {
    const result = await showConfirmation({
      title: 'Warning',
      message: 'Are you sure?',
      urgency: 'warning',
      actions: [
        { label: 'No', variant: 'secondary', value: false },
        { label: 'Yes', variant: 'primary', value: true },
      ],
    });
    return result;
  };

  return (
    <div>
      <button onClick={handleSimpleConfirmation}>Show Confirmation</button>
      <button onClick={handleDangerConfirmation}>Show Danger</button>
      <button onClick={handleWarningConfirmation}>Show Warning</button>
    </div>
  );
}

describe('ConfirmationDialog Component', () => {
  const renderWithProvider = () => {
    return render(
      <ConfirmationProvider>
        <TestComponent />
        <ConfirmationDialog />
      </ConfirmationProvider>
    );
  };

  it('does not render when no confirmation is active', () => {
    renderWithProvider();

    const dialog = screen.queryByRole('alertdialog');
    expect(dialog).not.toBeInTheDocument();
  });

  it('renders confirmation dialog when triggered', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    const showButton = screen.getByText('Show Confirmation');
    await user.click(showButton);

    await waitFor(() => {
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toBeInTheDocument();
    });

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('displays correct action buttons', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    const showButton = screen.getByText('Show Confirmation');
    await user.click(showButton);

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });
  });

  it('closes dialog when action button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    const showButton = screen.getByText('Show Confirmation');
    await user.click(showButton);

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    const confirmButton = screen.getByText('Confirm');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('closes dialog when backdrop is clicked', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    const showButton = screen.getByText('Show Confirmation');
    await user.click(showButton);

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    const backdrop = document.querySelector('.confirmation-backdrop');
    expect(backdrop).toBeInTheDocument();

    await user.click(backdrop as Element);

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('closes dialog when Escape key is pressed', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    const showButton = screen.getByText('Show Confirmation');
    await user.click(showButton);

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('renders with danger urgency styling', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    const showButton = screen.getByText('Show Danger');
    await user.click(showButton);

    await waitFor(() => {
      expect(screen.getByText('Danger Action')).toBeInTheDocument();
      expect(screen.getByText('This is dangerous')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete');
    expect(deleteButton).toBeInTheDocument();
  });

  it('renders with warning urgency styling', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    const showButton = screen.getByText('Show Warning');
    await user.click(showButton);

    await waitFor(() => {
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    });
  });

  it('renders backdrop with correct attributes', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    const showButton = screen.getByText('Show Confirmation');
    await user.click(showButton);

    await waitFor(() => {
      const backdrop = document.querySelector('.confirmation-backdrop');
      expect(backdrop).toBeInTheDocument();
    });
  });

  it('dialog has correct ARIA attributes', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    const showButton = screen.getByText('Show Confirmation');
    await user.click(showButton);

    await waitFor(() => {
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'confirmation-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'confirmation-message');
    });
  });

  it('handles multiple sequential confirmations', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    // First confirmation
    const showButton = screen.getByText('Show Confirmation');
    await user.click(showButton);

    await waitFor(() => {
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    const confirmButton = screen.getByText('Confirm');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
    });

    // Second confirmation
    await user.click(showButton);

    await waitFor(() => {
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });
  });

  it('renders cancel button correctly', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    const showButton = screen.getByText('Show Confirmation');
    await user.click(showButton);

    await waitFor(() => {
      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('applies correct z-index for backdrop and dialog', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    const showButton = screen.getByText('Show Confirmation');
    await user.click(showButton);

    await waitFor(() => {
      const backdrop = document.querySelector('.confirmation-backdrop') as HTMLElement;
      const dialog = screen.getByRole('alertdialog');

      expect(backdrop).toHaveStyle({ zIndex: '10500' });
      expect(dialog).toHaveStyle({ zIndex: '10501' });
    });
  });
});

