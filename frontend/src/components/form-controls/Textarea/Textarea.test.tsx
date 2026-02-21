import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Textarea from './Textarea';

describe('Textarea', () => {
  describe('Rendering', () => {
    it('should render textarea element', () => {
      render(<Textarea placeholder="Enter text" />);

      const textarea = screen.getByPlaceholderText('Enter text');
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('should render with label when provided', () => {
      render(<Textarea label="Message" placeholder="Enter text" />);

      expect(screen.getByText('Message')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should render without label when not provided', () => {
      render(<Textarea placeholder="Enter text" />);

      const labels = document.querySelectorAll('label');
      expect(labels).toHaveLength(0);
    });

    it('should render with error message when provided', () => {
      render(<Textarea error="This field is required" placeholder="Enter text" />);

      expect(screen.getByText('This field is required')).toBeInTheDocument();
      expect(screen.getByText('This field is required')).toHaveClass('error-message');
    });

    it('should apply error styling when error prop is provided', () => {
      render(<Textarea error="Error message" placeholder="Enter text" />);

      const textarea = screen.getByPlaceholderText('Enter text');
      expect(textarea.className).toContain('error');
    });
  });

  describe('Functionality', () => {
    it('should handle user input', async () => {
      const user = userEvent.setup();
      render(<Textarea placeholder="Enter text" />);

      const textarea = screen.getByPlaceholderText('Enter text');
      await user.type(textarea, 'Hello World');

      expect(textarea).toHaveValue('Hello World');
    });

    it('should support rows attribute', () => {
      render(<Textarea rows={5} placeholder="Enter text" />);

      const textarea = screen.getByPlaceholderText('Enter text');
      expect(textarea).toHaveAttribute('rows', '5');
    });

    it('should support maxLength attribute', () => {
      render(<Textarea maxLength={100} placeholder="Enter text" />);

      const textarea = screen.getByPlaceholderText('Enter text');
      expect(textarea).toHaveAttribute('maxLength', '100');
    });

    it('should support disabled state', () => {
      render(<Textarea disabled placeholder="Enter text" />);

      const textarea = screen.getByPlaceholderText('Enter text');
      expect(textarea).toBeDisabled();
    });

    it('should support readOnly state', () => {
      render(<Textarea readOnly placeholder="Enter text" />);

      const textarea = screen.getByPlaceholderText('Enter text');
      expect(textarea).toHaveAttribute('readOnly');
    });
  });

  describe('Styling', () => {
    it('should apply default styling classes', () => {
      render(<Textarea placeholder="Enter text" />);

      const textarea = screen.getByPlaceholderText('Enter text');
      expect(textarea.className).toContain('form-input');
    });

    it('should apply custom className', () => {
      render(<Textarea className="custom-class" placeholder="Enter text" />);

      const textarea = screen.getByPlaceholderText('Enter text');
      expect(textarea.className).toContain('custom-class');
    });

    it('should apply label styling', () => {
      render(<Textarea label="Message" placeholder="Enter text" />);

      const label = screen.getByText('Message');
      expect(label.className).toContain('form-label');
    });
  });

  describe('ForwardRef', () => {
    it('should forward ref to textarea element', () => {
      const ref = { current: null as HTMLTextAreaElement | null };
      render(<Textarea ref={ref} placeholder="Enter text" />);

      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
      expect(ref.current?.tagName).toBe('TEXTAREA');
    });

    it('should allow ref access to textarea methods', () => {
      const ref = { current: null as HTMLTextAreaElement | null };
      render(<Textarea ref={ref} placeholder="Enter text" />);

      expect(ref.current?.focus).toBeDefined();
      expect(ref.current?.blur).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <Textarea
          placeholder="Enter text"
          aria-label="Message field"
        />
      );

      const textarea = screen.getByPlaceholderText('Enter text');
      expect(textarea).toHaveAttribute('aria-label', 'Message field');
    });

    it('should support aria-describedby with error', () => {
      render(
        <Textarea
          error="Error message"
          placeholder="Enter text"
          aria-describedby="error-id"
        />
      );

      const textarea = screen.getByPlaceholderText('Enter text');
      expect(textarea).toHaveAttribute('aria-describedby', 'error-id');
    });
  });

  describe('Standard HTML Attributes', () => {
    it('should support name attribute', () => {
      render(<Textarea name="message" placeholder="Enter text" />);

      const textarea = screen.getByPlaceholderText('Enter text');
      expect(textarea).toHaveAttribute('name', 'message');
    });

    it('should support id attribute', () => {
      render(<Textarea id="message-field" placeholder="Enter text" />);

      const textarea = screen.getByPlaceholderText('Enter text');
      expect(textarea).toHaveAttribute('id', 'message-field');
    });

    it('should support required attribute', () => {
      render(<Textarea required placeholder="Enter text" />);

      const textarea = screen.getByPlaceholderText('Enter text');
      expect(textarea).toBeRequired();
    });

    it('should support defaultValue', () => {
      render(<Textarea defaultValue="Initial text" placeholder="Enter text" />);

      const textarea = screen.getByPlaceholderText('Enter text');
      expect(textarea).toHaveValue('Initial text');
    });

    it('should support value (controlled)', () => {
      render(<Textarea value="Controlled text" onChange={() => {}} placeholder="Enter text" />);

      const textarea = screen.getByPlaceholderText('Enter text');
      expect(textarea).toHaveValue('Controlled text');
    });
  });
});

