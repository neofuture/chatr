import { InputHTMLAttributes, forwardRef } from 'react';

interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  options: RadioOption[];
  error?: string;
}

const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, options, error, name, ...props }, ref) => {
    return (
      <div className="form-group">
        {label && (
          <label className="form-label">{label}</label>
        )}
        <div className="radio-group">
          {options.map((option, index) => (
            <label
              key={option.value}
              className={`radio-label ${option.disabled ? 'disabled' : ''}`}
            >
              <input
                ref={index === 0 ? ref : undefined}
                type="radio"
                name={name}
                value={option.value}
                disabled={option.disabled}
                className="radio-input"
                {...props}
              />
              <span className="radio-custom"></span>
              <span className="radio-text">{option.label}</span>
            </label>
          ))}
        </div>
        {error && (
          <p className="error-message">{error}</p>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';

export default Radio;

