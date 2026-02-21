import { InputHTMLAttributes, forwardRef } from 'react';

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
            <span style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--blue-400)'
            }}>
              {icon}
            </span>
            <input
              ref={ref}
              className={`form-input ${error ? 'error' : ''} ${className}`}
              style={icon ? { paddingLeft: '3rem' } : undefined}
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

