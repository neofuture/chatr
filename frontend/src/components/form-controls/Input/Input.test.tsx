import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from './Input';

describe('Input Component', () => {
  it('renders with default props', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText(/enter text/i);
    expect(input).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Input label="Username" placeholder="Enter username" />);
    const label = screen.getByText(/username/i);
    const input = screen.getByPlaceholderText(/enter username/i);

    expect(label).toBeInTheDocument();
    expect(input).toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    render(
      <Input
        label="Email"
        placeholder="Enter email"
        error="Invalid email format"
      />
    );

    const errorMessage = screen.getByText(/invalid email format/i);
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveClass('error-message');
  });

  it('applies error styling to input when error prop is provided', () => {
    render(
      <Input
        placeholder="Enter text"
        error="This field is required"
      />
    );

    const input = screen.getByPlaceholderText(/enter text/i);
    expect(input).toHaveClass('error');
  });

  it('renders with icon', () => {
    const icon = <span data-testid="test-icon">🔒</span>;
    render(<Input icon={icon} placeholder="Enter password" />);

    const iconElement = screen.getByTestId('test-icon');
    const input = screen.getByPlaceholderText(/enter password/i);

    expect(iconElement).toBeInTheDocument();
    expect(input).toHaveStyle({ paddingLeft: '3rem' });
  });

  it('handles user input', async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Type here" />);

    const input = screen.getByPlaceholderText(/type here/i);
    await user.type(input, 'Hello World');

    expect(input).toHaveValue('Hello World');
  });

  it('handles onChange event', async () => {
    const handleChange = jest.fn();
    const user = userEvent.setup();
    render(<Input placeholder="Type here" onChange={handleChange} />);

    const input = screen.getByPlaceholderText(/type here/i);
    await user.type(input, 'Test');

    expect(handleChange).toHaveBeenCalled();
    expect(handleChange).toHaveBeenCalledTimes(4); // Once per character
  });

  it('respects disabled state', async () => {
    const handleChange = jest.fn();
    const user = userEvent.setup();
    render(<Input placeholder="Type here" onChange={handleChange} disabled />);

    const input = screen.getByPlaceholderText(/type here/i);
    expect(input).toBeDisabled();

    await user.type(input, 'Test');
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<Input ref={ref} placeholder="Ref input" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('applies custom className', () => {
    render(<Input className="custom-input-class" placeholder="Custom" />);
    const input = screen.getByPlaceholderText(/custom/i);
    expect(input).toHaveClass('custom-input-class');
  });

  it('supports different input types', () => {
    const { rerender } = render(<Input type="text" placeholder="Text" />);
    let input = screen.getByPlaceholderText(/text/i);
    expect(input).toHaveAttribute('type', 'text');

    rerender(<Input type="password" placeholder="Password" />);
    input = screen.getByPlaceholderText(/password/i);
    expect(input).toHaveAttribute('type', 'password');

    rerender(<Input type="email" placeholder="Email" />);
    input = screen.getByPlaceholderText(/email/i);
    expect(input).toHaveAttribute('type', 'email');
  });

  it('handles required attribute', () => {
    render(<Input placeholder="Required field" required />);
    const input = screen.getByPlaceholderText(/required field/i);
    expect(input).toBeRequired();
  });

  it('handles maxLength attribute', () => {
    render(<Input placeholder="Max 10 chars" maxLength={10} />);
    const input = screen.getByPlaceholderText(/max 10 chars/i);
    expect(input).toHaveAttribute('maxLength', '10');
  });

  it('handles readOnly attribute', () => {
    render(<Input placeholder="Read only" value="Fixed value" readOnly />);
    const input = screen.getByPlaceholderText(/read only/i);
    expect(input).toHaveAttribute('readOnly');
  });

  it('renders without label when not provided', () => {
    render(<Input placeholder="No label" />);
    const labels = screen.queryAllByRole('label');
    expect(labels).toHaveLength(0);
  });

  it('renders without error when not provided', () => {
    render(<Input placeholder="No error" />);
    const errorMessages = screen.queryByText(/error/i);
    expect(errorMessages).not.toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    render(<Input placeholder="Styled input" />);
    const input = screen.getByPlaceholderText(/styled input/i);

    expect(input).toHaveClass('form-input');
  });
});

