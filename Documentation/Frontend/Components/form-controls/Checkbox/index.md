# Checkbox

**File:** `src/components/form-controls/Checkbox/Checkbox.tsx`

A styled checkbox with a custom SVG check icon. Forwards `ref` to the underlying `<input type="checkbox">`.

## Props

```typescript
interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Inline label rendered to the right of the checkbox |
| `error` | `string` | Error message rendered below |

`type` is fixed to `"checkbox"` and cannot be overridden.

## Usage

```tsx
<Checkbox
  label="I agree to the terms"
  checked={agreed}
  onChange={(e) => setAgreed(e.target.checked)}
  error={errors.terms}
/>
```

