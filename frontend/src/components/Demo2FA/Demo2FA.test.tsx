import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Demo2FAContent } from './Demo2FA';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

describe('Demo2FAContent', () => {
  it('renders verification heading text', () => {
    render(<Demo2FAContent />);
    expect(screen.getByText(/sent a 6-digit code/i)).toBeInTheDocument();
  });

  it('shows email address "demo@example.com"', () => {
    render(<Demo2FAContent />);
    expect(screen.getByText('demo@example.com')).toBeInTheDocument();
  });

  it('renders 6 OTP input fields', () => {
    render(<Demo2FAContent />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
  });

  it('verify button is disabled when inputs are empty', () => {
    render(<Demo2FAContent />);
    const button = screen.getByRole('button', { name: /verify/i });
    expect(button).toBeDisabled();
  });

  it('verify button is enabled when all 6 digits entered', async () => {
    const user = userEvent.setup();
    render(<Demo2FAContent />);

    const inputs = screen.getAllByRole('textbox');
    for (let i = 0; i < 6; i++) {
      await user.click(inputs[i]);
      await user.type(inputs[i], String(i + 1));
    }

    const button = screen.getByRole('button', { name: /verify/i });
    expect(button).toBeEnabled();
  });

  it('OTP inputs accept only single digits', async () => {
    const user = userEvent.setup();
    render(<Demo2FAContent />);

    const inputs = screen.getAllByRole('textbox');
    await user.click(inputs[0]);
    await user.type(inputs[0], 'abc');

    expect(inputs[0]).toHaveValue('');
  });

  it('focus moves to next input on entry', async () => {
    const user = userEvent.setup();
    render(<Demo2FAContent />);

    const inputs = screen.getAllByRole('textbox');
    await user.click(inputs[0]);
    await user.type(inputs[0], '5');

    expect(inputs[1]).toHaveFocus();
  });

  it('shows "Resend" button', () => {
    render(<Demo2FAContent />);
    expect(screen.getByText('Resend')).toBeInTheDocument();
  });

  it('shows expiry text "Code expires in 15 minutes"', () => {
    render(<Demo2FAContent />);
    expect(screen.getByText('Code expires in 15 minutes')).toBeInTheDocument();
  });

  it('renders logo image', () => {
    render(<Demo2FAContent />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/images/logo-horizontal.png');
  });

  it('each input has maxLength of 1', () => {
    render(<Demo2FAContent />);
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input) => {
      expect(input).toHaveAttribute('maxLength', '1');
    });
  });

  it('first input has autoFocus', () => {
    render(<Demo2FAContent />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs[0]).toHaveFocus();
  });
});
