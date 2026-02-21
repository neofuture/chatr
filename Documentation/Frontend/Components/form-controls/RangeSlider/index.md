# RangeSlider

**File:** `src/components/form-controls/RangeSlider/RangeSlider.tsx`

A single-handle range input with optional live value display. Forwards `ref` to the underlying `<input type="range">`.

## Props

```typescript
interface RangeSliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?:       string;
  error?:       string;
  showValue?:   boolean;
  valuePrefix?: string;
  valueSuffix?: string;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | Label rendered top-left |
| `showValue` | `boolean` | `true` | Displays the current value top-right |
| `valuePrefix` | `string` | `''` | Prepended to value display (e.g. `£`) |
| `valueSuffix` | `string` | `''` | Appended to value display (e.g. `%`) |
| `error` | `string` | — | Error message rendered below |

All native range `InputHTMLAttributes` are passed through (`min`, `max`, `step`, `value`, `onChange`).

## Usage

```tsx
<RangeSlider
  label="Volume"
  min={0}
  max={100}
  step={1}
  value={volume}
  onChange={(e) => setVolume(Number(e.target.value))}
  valueSuffix="%"
/>
```

