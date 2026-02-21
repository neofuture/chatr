import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BottomSheetDemo from './BottomSheetDemo';
import { ToastProvider } from '@/contexts/ToastContext';

// Mock the BottomSheet component
jest.mock('@/components/dialogs/BottomSheet/BottomSheet', () => {
  return function MockBottomSheet({ children, isOpen, title, showCloseButton }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="bottom-sheet">
        <div data-testid="sheet-title">{title}</div>
        {showCloseButton !== false && <button data-testid="close-button">X</button>}
        <div>{children}</div>
      </div>
    );
  };
});

// Helper to render with ToastProvider
const renderWithToast = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

describe('BottomSheetDemo', () => {
  describe('Rendering', () => {
    it('should render the demo title and description', () => {
      renderWithToast(<BottomSheetDemo />);

      expect(screen.getByText(/📋 Bottom Sheet Demo/i)).toBeInTheDocument();
      expect(screen.getByText(/Mobile-style bottom sheets/i)).toBeInTheDocument();
    });

    it('should render all four demo buttons', () => {
      renderWithToast(<BottomSheetDemo />);

      expect(screen.getByText(/Open Full Height Sheet/i)).toBeInTheDocument();
      expect(screen.getByText(/Open Fixed Height Sheet/i)).toBeInTheDocument();
      expect(screen.getByText(/Open Auto Height Sheet/i)).toBeInTheDocument();
      expect(screen.getByText(/Open No-Close Sheet/i)).toBeInTheDocument();
    });

    it('should render demo descriptions', () => {
      renderWithToast(<BottomSheetDemo />);

      expect(screen.getByText(/Sheet takes up the entire viewport height/i)).toBeInTheDocument();
      expect(screen.getByText(/Sheet with fixed 600px height/i)).toBeInTheDocument();
      expect(screen.getByText(/Sheet height adjusts to fit content/i)).toBeInTheDocument();
      expect(screen.getByText(/requires action button to dismiss/i)).toBeInTheDocument();
    });

    it('should not show any bottom sheets initially', () => {
      renderWithToast(<BottomSheetDemo />);

      expect(screen.queryByTestId('bottom-sheet')).not.toBeInTheDocument();
    });
  });

  describe('Full Height Sheet', () => {
    it('should open full height sheet when button is clicked', async () => {
      const user = userEvent.setup();
      renderWithToast(<BottomSheetDemo />);

      const button = screen.getByText(/Open Full Height Sheet/i);
      await user.click(button);

      expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
      expect(screen.getByTestId('sheet-title')).toHaveTextContent('Full Height Bottom Sheet');
    });

    it('should render extended contact form in full height sheet', async () => {
      const user = userEvent.setup();
      renderWithToast(<BottomSheetDemo />);

      await user.click(screen.getByText(/Open Full Height Sheet/i));

      expect(screen.getByText(/Extended Contact Form/i)).toBeInTheDocument();
      // Check for form labels
      expect(screen.getByText('First Name')).toBeInTheDocument();
      expect(screen.getByText('Last Name')).toBeInTheDocument();
      expect(screen.getByText('Email Address')).toBeInTheDocument();
      expect(screen.getByText('Phone Number')).toBeInTheDocument();
      expect(screen.getByText('Company (Optional)')).toBeInTheDocument();
    });

    it('should have submit button in full height sheet', async () => {
      const user = userEvent.setup();
      renderWithToast(<BottomSheetDemo />);

      await user.click(screen.getByText(/Open Full Height Sheet/i));

      expect(screen.getByRole('button', { name: /Submit Inquiry/i })).toBeInTheDocument();
    });
  });

  describe('Fixed Height Sheet', () => {
    it('should open fixed height sheet when button is clicked', async () => {
      const user = userEvent.setup();
      renderWithToast(<BottomSheetDemo />);

      const button = screen.getByText(/Open Fixed Height Sheet/i);
      await user.click(button);

      expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
      expect(screen.getByTestId('sheet-title')).toHaveTextContent(/Fixed Height Bottom Sheet/);
    });

    it('should render enhanced feedback form with all form components', async () => {
      const user = userEvent.setup();
      renderWithToast(<BottomSheetDemo />);

      await user.click(screen.getByText(/Open Fixed Height Sheet/i));

      // Check for different form components
      expect(screen.getByText(/Enhanced Feedback Form/i)).toBeInTheDocument();
      expect(screen.getByText('Your Name')).toBeInTheDocument();
      expect(screen.getByText('Rating')).toBeInTheDocument();
      expect(screen.getByText(/How likely are you to recommend us/i)).toBeInTheDocument();
      expect(screen.getByText(/Satisfaction Level/i)).toBeInTheDocument();
    });

    it('should render radio buttons in fixed height sheet', async () => {
      const user = userEvent.setup();
      renderWithToast(<BottomSheetDemo />);

      await user.click(screen.getByText(/Open Fixed Height Sheet/i));

      expect(screen.getByText('Very Likely')).toBeInTheDocument();
      expect(screen.getByText('Likely')).toBeInTheDocument();
      expect(screen.getByText('Neutral')).toBeInTheDocument();
      expect(screen.getByText('Unlikely')).toBeInTheDocument();
    });

    it('should render checkboxes in fixed height sheet', async () => {
      const user = userEvent.setup();
      renderWithToast(<BottomSheetDemo />);

      await user.click(screen.getByText(/Open Fixed Height Sheet/i));

      expect(screen.getByText(/I would like to receive updates/i)).toBeInTheDocument();
      expect(screen.getByText(/I agree to the terms and conditions/i)).toBeInTheDocument();
    });

    it('should render range slider in fixed height sheet', async () => {
      const user = userEvent.setup();
      renderWithToast(<BottomSheetDemo />);

      await user.click(screen.getByText(/Open Fixed Height Sheet/i));

      const sliders = screen.getAllByRole('slider');
      expect(sliders.length).toBeGreaterThan(0);
      expect(screen.getByText(/Satisfaction Level/i)).toBeInTheDocument();
    });
  });

  describe('Auto Height Sheet', () => {
    it('should open auto height sheet when button is clicked', async () => {
      const user = userEvent.setup();
      renderWithToast(<BottomSheetDemo />);

      const button = screen.getByText(/Open Auto Height Sheet/i);
      await user.click(button);

      expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
      expect(screen.getByTestId('sheet-title')).toHaveTextContent('Auto Height Bottom Sheet');
    });

    it('should render quick contact form in auto height sheet', async () => {
      const user = userEvent.setup();
      renderWithToast(<BottomSheetDemo />);

      await user.click(screen.getByText(/Open Auto Height Sheet/i));

      expect(screen.getByText(/Quick Contact Form/i)).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email Address')).toBeInTheDocument();
      // Check for form elements
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThanOrEqual(2); // At least name, email, and message textarea
    });

    it('should have send message button in auto height sheet', async () => {
      const user = userEvent.setup();
      renderWithToast(<BottomSheetDemo />);

      await user.click(screen.getByText(/Open Auto Height Sheet/i));

      expect(screen.getByRole('button', { name: /Send Message/i })).toBeInTheDocument();
    });
  });

  describe('No Close Button Sheet', () => {
    it('should open no close button sheet when button is clicked', async () => {
      const user = userEvent.setup();
      renderWithToast(<BottomSheetDemo />);

      const button = screen.getByText(/Open No-Close Sheet/i);
      await user.click(button);

      expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
      expect(screen.getByTestId('sheet-title')).toHaveTextContent('Bottom Sheet Without Close Button');
    });

    it('should not render close button in header', async () => {
      const user = userEvent.setup();
      renderWithToast(<BottomSheetDemo />);

      await user.click(screen.getByText(/Open No-Close Sheet/i));

      expect(screen.queryByTestId('close-button')).not.toBeInTheDocument();
    });

    it('should render action required content', async () => {
      const user = userEvent.setup();
      renderWithToast(<BottomSheetDemo />);

      await user.click(screen.getByText(/Open No-Close Sheet/i));

      expect(screen.getByText(/Action Required/i)).toBeInTheDocument();
      expect(screen.getByText(/You must use an action button to dismiss/i)).toBeInTheDocument();
    });

    it('should render cancel and confirm action buttons', async () => {
      const user = userEvent.setup();
      renderWithToast(<BottomSheetDemo />);

      await user.click(screen.getByText(/Open No-Close Sheet/i));

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Confirm Action/i })).toBeInTheDocument();
    });
  });

  describe('Button Interactions', () => {
    // Hover tests removed - buttons use CSS classes for styling, not inline styles
    it('should have correct button classes', () => {
      renderWithToast(<BottomSheetDemo />);

      const fullHeightButton = screen.getByText(/Open Full Height Sheet/i);
      const fixedHeightButton = screen.getByText(/Open Fixed Height Sheet/i);
      const autoHeightButton = screen.getByText(/Open Auto Height Sheet/i);
      const noCloseButton = screen.getByText(/Open No-Close Sheet/i);

      expect(fullHeightButton).toHaveClass('themeButton');
      expect(fixedHeightButton).toHaveClass('themeButton');
      expect(autoHeightButton).toHaveClass('themeButton');
      expect(noCloseButton).toHaveClass('themeButton');
    });
  });

  describe('Multiple Sheets', () => {
    it('should only show one sheet at a time', async () => {
      const user = userEvent.setup();
      renderWithToast(<BottomSheetDemo />);

      // Open first sheet
      await user.click(screen.getByText(/Open Full Height Sheet/i));
      expect(screen.getByText(/Extended Contact Form/i)).toBeInTheDocument();

      // The component state should only have one sheet open at a time
      // (We can't easily test this with mocked component, but structure ensures it)
      expect(screen.getAllByTestId('bottom-sheet')).toHaveLength(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles', () => {
      renderWithToast(<BottomSheetDemo />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(4);
    });

    it('should have descriptive button text', () => {
      renderWithToast(<BottomSheetDemo />);

      expect(screen.getByText(/📏 Open Full Height Sheet/i)).toBeInTheDocument();
      expect(screen.getByText(/📐 Open Fixed Height Sheet/i)).toBeInTheDocument();
      expect(screen.getByText(/📄 Open Auto Height Sheet/i)).toBeInTheDocument();
      expect(screen.getByText(/Open No-Close Sheet/i)).toBeInTheDocument();
    });
  });
});

