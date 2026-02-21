import { ButtonHTMLAttributes, forwardRef } from 'react';
import styles from './Button.module.css';

// Button component with theme color variants (purple, green, red, blue, orange)
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'purple' | 'green' | 'red' | 'blue' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', fullWidth = false, icon, children, style, ...props }, ref) => {
    let buttonClass = '';
    const isThemeButton = variant && ['purple', 'green', 'red', 'blue', 'orange'].includes(variant);

    if (isThemeButton) {
      // Theme button styling via CSS modules
      const colorCapitalized = variant.charAt(0).toUpperCase() + variant.slice(1);
      buttonClass = `${styles.themeButton} ${styles[`themeButton${colorCapitalized}`]}`;
      if (fullWidth) {
        buttonClass += ` ${styles.themeButtonFull}`;
      }
    } else {
      // Standard button styling via global CSS classes
      buttonClass = 'btn';

      if (variant === 'primary') {
        buttonClass += ' btn-primary';
      } else if (variant === 'secondary') {
        buttonClass += ' btn-secondary';
      } else if (variant === 'danger') {
        buttonClass += ' btn-danger';
      } else if (variant === 'ghost') {
        buttonClass += ' btn-ghost';
      }
    }

    // Add custom class if provided
    if (className) {
      buttonClass += ' ' + className;
    }

    // Size styles for non-theme buttons
    const sizeStyles = !isThemeButton ? {
      sm: { padding: '0.375rem 0.75rem', fontSize: '0.875rem' },
      md: { padding: '0.625rem 1rem', fontSize: '1rem' },
      lg: { padding: '0.75rem 1.5rem', fontSize: '1.125rem' },
    } : {};

    // Combine inline styles
    const combinedStyle = {
      ...(sizeStyles[size as keyof typeof sizeStyles] || {}),
      ...(!isThemeButton && fullWidth ? { width: '100%' } : {}),
      ...style,
    };

    // Get icon class for theme buttons
    const getIconClass = () => {
      if (!isThemeButton || !icon) return '';
      const colorCapitalized = variant.charAt(0).toUpperCase() + variant.slice(1);
      return `${styles.themeButtonIcon} ${styles[`themeButtonIcon${colorCapitalized}`]}`;
    };

    return (
      <button
        ref={ref}
        className={buttonClass}
        style={combinedStyle}
        {...props}
      >
        {icon && isThemeButton && (
          <span className={getIconClass()}>
            {icon}
          </span>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

