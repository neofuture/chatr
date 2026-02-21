# DualRangeSlider

**File:** `src/components/form-controls/DualRangeSlider/DualRangeSlider.tsx`

A two-handle range slider for selecting a minimum and maximum value. Uses two overlapping `<input type="range">` elements with CSS to visually connect them.

## Props

```typescript
interface DualRangeSliderProps {
  label?:           string;
  min?:             number;
  max?:             number;
  defaultMinValue?: number;
  defaultMaxValue?: number;
  step?:            number;
  showValues?:      boolean;
  valuePrefix?:     string;
  valueSuffix?:     string;
  onChange?:        (minValue: number, maxValue: number) => void;
  error?:           string;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `min` | `number` | `0` | Lower bound of the range |
| `max` | `number` | `100` | Upper bound of the range |
| `defaultMinValue` | `number` | `min` | Initial position of the min handle |
| `defaultMaxValue` | `number` | `max` | Initial position of the max handle |
| `step` | `number` | `1` | Step increment for both handles |
| `showValues` | `boolean` | `false` | Displays current min and max values |
| `valuePrefix` | `string` | `''` | Prepended to both value displays |
| `valueSuffix` | `string` | `''` | Appended to both value displays |
| `onChange` | `function` | — | Called with `(minValue, maxValue)` when either handle moves |
| `error` | `string` | — | Error message rendered below |

The min handle is prevented from crossing the max handle and vice versa.

## Usage

```tsx
<DualRangeSlider
  label="Price range"
  min={0}
  max={1000}
  defaultMinValue={100}
  defaultMaxValue={800}
  showValues={true}
  valuePrefix="£"
  onChange={(min, max) => setFilter({ min, max })}
/>
```

