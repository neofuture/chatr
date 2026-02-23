import { InputHTMLAttributes, forwardRef } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, icon, ...props }, ref) => {
    return (
      <div className="form-group">
        {label && (
          <label className="form-label">
            {label}
          </label>
        )}
        {icon ? (
          <div className="input-wrapper">
            <span className={styles.iconSpan}>
              {icon}
            </span>
            <input
              ref={ref}
              className={`form-input ${error ? 'error' : ''} ${styles.inputWithIcon} ${className}`}
              style={{ paddingLeft: '3rem' }}
              {...props}
            />
          </div>
        ) : (
          <input
            ref={ref}
            className={`form-input ${error ? 'error' : ''} ${className}`}
            {...props}
          />
        )}
        {error && (
          <p className="error-message">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

