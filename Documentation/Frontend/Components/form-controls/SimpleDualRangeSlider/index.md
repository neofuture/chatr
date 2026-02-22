# SimpleDualRangeSlider

**File:** `src/components/form-controls/SimpleDualRangeSlider/SimpleDualRangeSlider.tsx`

A lightweight two-handle range slider without external dependencies. Simpler alternative to `DualRangeSlider` — uses two overlapping `<input type="range">` elements with z-index swapping.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `min` | `number` | `0` | Minimum value |
| `max` | `number` | `100` | Maximum value |
| `minValue` | `number` | — | Controlled lower handle value |
| `maxValue` | `number` | — | Controlled upper handle value |
| `onChange` | `(min, max) => void` | — | Called on every handle move |
| `step` | `number` | `1` | Step increment |

## See Also

- [DualRangeSlider](../DualRangeSlider/index.md) — feature-rich alternative with labels and custom styling

