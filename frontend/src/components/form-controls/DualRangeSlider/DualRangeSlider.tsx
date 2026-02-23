'use client';

import { useState } from 'react';
import './DualRangeSlider.css';
import styles from './DualRangeSlider.module.css';

interface DualRangeSliderProps {
  label?: string;
  min?: number;
  max?: number;
  defaultMinValue?: number;
  defaultMaxValue?: number;
  step?: number;
  showValues?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
  onChange?: (minValue: number, maxValue: number) => void;
  error?: string;
}

export default function DualRangeSlider({
  label,
  min = 0,
  max = 100,
  defaultMinValue,
  defaultMaxValue,
  step = 1,
  showValues = false,
  valuePrefix = '',
  valueSuffix = '',
  onChange,
  error
}: DualRangeSliderProps) {
  const [minValue, setMinValue] = useState(defaultMinValue ?? min);
  const [maxValue, setMaxValue] = useState(defaultMaxValue ?? max);

  // Ensure min doesn't exceed max and vice versa
  const handleMinChange = (value: number) => {
    const newMin = Math.min(value, maxValue - step);
    setMinValue(newMin);
    if (onChange) {
      onChange(newMin, maxValue);
    }
  };

  const handleMaxChange = (value: number) => {
    const newMax = Math.max(value, minValue + step);
    setMaxValue(newMax);
    if (onChange) {
      onChange(minValue, newMax);
    }
  };

  const getPercentage = (value: number) => {
    return ((value - min) / (max - min)) * 100;
  };

  const minPercent = getPercentage(minValue);
  const maxPercent = getPercentage(maxValue);

  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}
          {showValues && (
            <span className={styles.valueDisplay}>
              {valuePrefix}{minValue}{valueSuffix} - {valuePrefix}{maxValue}{valueSuffix}
            </span>
          )}
        </label>
      )}

      <div className="dual-range-slider-wrapper">
        <div className="dual-range-slider-container">
          {/* Background track */}
          <div className="dual-range-slider-track">
            {/* Active range highlight */}
            <div
              className="dual-range-slider-range"
              style={{
                left: `${minPercent}%`,
                width: `${maxPercent - minPercent}%`
              }}
            />
          </div>

          {/* Min range input */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={minValue}
            onChange={(e) => handleMinChange(Number(e.target.value))}
            className="dual-range-slider-input dual-range-slider-input-min"
          />

          {/* Max range input */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={maxValue}
            onChange={(e) => handleMaxChange(Number(e.target.value))}
            className="dual-range-slider-input dual-range-slider-input-max"
          />
        </div>
      </div>

      {error && <span className="error-message">{error}</span>}
    </div>
  );
}

