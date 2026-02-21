# Input

**File:** `src/components/form-controls/Input/Input.tsx`

A labelled text input with optional leading icon and inline error message. Forwards `ref` to the underlying `<input>` element.

## Props

```typescript
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?:  React.ReactNode;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Label rendered above the input |
| `error` | `string` | Error message rendered below; also adds `.error` class to the input |
| `icon` | `ReactNode` | Icon absolutely positioned inside the left edge of the input |

When `icon` is provided, the input gets `paddingLeft: 3rem` automatically.

All native `InputHTMLAttributes` are passed through (`type`, `placeholder`, `value`, `onChange`, `disabled`, etc.).

## Usage

```tsx
<Input
  label="Email address"
  type="email"
  placeholder="you@example.com"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
  icon={<i className="fas fa-envelope" />}
/>
```

