# ThemeToggle

**File:** `src/components/ThemeToggle/ThemeToggle.tsx`

A toggle switch that switches between light and dark mode. Reads and writes state via `ThemeContext`. No props.

## Props

None.

## Behaviour

- Renders nothing until mounted (prevents SSR hydration mismatch)
- Shows current mode label next to the toggle
- Calls `toggleTheme()` from `ThemeContext` on click
- Preference is persisted to `localStorage` by the context

## Usage

```tsx
<ThemeToggle />
```

