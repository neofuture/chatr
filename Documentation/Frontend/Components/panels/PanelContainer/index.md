# PanelContainer

**File:** `src/components/panels/PanelContainer/PanelContainer.tsx`

Renders all active panels from `PanelContext`. Panels stack on top of each other with slide-in animations. Mount once at the app root level.

## Props

None. Driven entirely by `PanelContext`.

## PanelContext API

```typescript
// From usePanels() hook
const {
  openPanel,
  closePanel,
  closeTopPanel,
  closeAllPanels,
  panels,
} = usePanels();
```

### `openPanel`

```typescript
openPanel(
  title:         string,
  component:     React.ReactNode,
  options?: {
    titlePosition?: 'center' | 'left' | 'right';
    subTitle?:      string;
    profileImage?:  string;
    fullWidth?:     boolean;
    actionIcons?:   ActionIcon[];
  }
): void
```

### `ActionIcon`

```typescript
interface ActionIcon {
  icon:    string;     // Font Awesome class e.g. 'fas fa-edit'
  label:   string;     // Accessibility label
  onClick: () => void;
}
```

## Panel Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `titlePosition` | `string` | `'center'` | Title alignment in the header |
| `subTitle` | `string` | — | Secondary line below title |
| `profileImage` | `string` | — | Avatar shown in header. Pass `'use-auth-user'` to auto-load from IndexedDB |
| `fullWidth` | `boolean` | `false` | Panel expands to full screen width |
| `actionIcons` | `ActionIcon[]` | — | Icon buttons rendered in the header right area |

## Usage

```tsx
// Layout (once)
<PanelContainer />

// Anywhere in the app
const { openPanel, closeTopPanel } = usePanels();

openPanel('Edit Profile', <ProfileEditor />, {
  titlePosition: 'left',
  profileImage: 'use-auth-user',
  actionIcons: [{ icon: 'fas fa-save', label: 'Save', onClick: handleSave }],
});
```

