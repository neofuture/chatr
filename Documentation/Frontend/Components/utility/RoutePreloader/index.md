# RoutePreloader

**File:** `src/components/RoutePreloader.tsx`

Prefetches all critical app routes on mount so that navigation is instant with no loading delays. Renders nothing.

## Props

None.

## Routes Prefetched

```
/app
/app/groups
/app/updates
/app/settings
```

## Behaviour

- Calls `router.prefetch(route)` for each route on mount
- Renders `null` — no DOM output
- Place in the authenticated app layout to ensure it runs once when the user signs in

## Usage

```tsx
// app/app/layout.tsx
<RoutePreloader />
```

