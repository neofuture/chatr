# Button

**File:** `src/components/form-controls/Button/Button.tsx`

A styled button supporting multiple visual variants, sizes, and an optional leading icon. Forwards `ref` to the underlying `<button>` element.

## Props

```typescript
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   'primary' | 'secondary' | 'danger' | 'ghost' | 'purple' | 'green' | 'red' | 'blue' | 'orange';
  size?:      'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?:      React.ReactNode;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `string` | `'primary'` | Visual style. `primary`, `secondary`, `danger`, `ghost` use global CSS classes. Colour names (`purple`, `green`, `red`, `blue`, `orange`) use CSS Modules |
| `size` | `string` | `'md'` | Controls padding and font size via CSS class |
| `fullWidth` | `boolean` | `false` | Stretches button to 100% of container width |
| `icon` | `ReactNode` | — | Rendered before `children` inside the button |

All native `ButtonHTMLAttributes` are passed through (`onClick`, `disabled`, `type`, `form`, etc.).

## Usage

```tsx
<Button variant="primary" size="md" onClick={handleSubmit}>
  Send Message
</Button>

<Button variant="danger" icon={<i className="fas fa-trash" />}>
  Delete
</Button>

<Button variant="purple" fullWidth disabled={loading}>
  {loading ? 'Signing in...' : 'Sign In'}
</Button>
```

