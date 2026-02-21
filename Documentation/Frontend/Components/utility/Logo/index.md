# Logo

**File:** `src/components/Logo/Logo.tsx`

Renders the application logo image with configurable size and orientation.

## Props

```typescript
interface LogoProps {
  size?:    'sm' | 'md' | 'lg';
  variant?: 'horizontal' | 'vertical';
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `string` | `'md'` | Controls rendered dimensions |
| `variant` | `string` | `'horizontal'` | Selects the logo image file |

## Size Map

| Size | Dimensions |
|------|-----------|
| `sm` | 120 × 40 |
| `md` | 180 × 60 |
| `lg` | 240 × 80 |

## Image Sources

| Variant | File |
|---------|------|
| `horizontal` | `/public/images/logo-horizontal.png` |
| `vertical` | `/public/images/logo-vertical.png` |

## Usage

```tsx
<Logo size="lg" variant="horizontal" />
```

