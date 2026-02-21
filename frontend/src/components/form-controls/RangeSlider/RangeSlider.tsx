import { InputHTMLAttributes, forwardRef, useState } from 'react';

interface RangeSliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  showValue?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
}

const RangeSlider = forwardRef<HTMLInputElement, RangeSliderProps>(
  ({ label, error, showValue = true, valuePrefix = '', valueSuffix = '', className = '', value, defaultValue, onChange, ...props }, ref) => {
    const [currentValue, setCurrentValue] = useState(value || defaultValue || props.min || 0);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCurrentValue(e.target.value);
      if (onChange) {
        onChange(e);
      }
    };

    const displayValue = value !== undefined ? value : currentValue;

    return (
      <div className="form-group">
        {(label || showValue) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            {label && <label className="form-label" style={{ marginBottom: 0 }}>{label}</label>}
            {showValue && (
              <span className="range-value">
                {valuePrefix}{displayValue}{valueSuffix}
              </span>
            )}
          </div>
        )}
        <div className="range-slider-wrapper">
          <input
            ref={ref}
            type="range"
            className={`range-slider ${className}`}
            value={value !== undefined ? value : currentValue}
            onChange={handleChange}
            {...props}
          />
        </div>
        {error && (
          <p className="error-message">{error}</p>
        )}
      </div>
    );
  }
);

RangeSlider.displayName = 'RangeSlider';

export default RangeSlider;

