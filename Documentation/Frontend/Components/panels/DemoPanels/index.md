# DemoPanels

**File:** `src/components/panels/DemoPanels/DemoPanels.tsx`

Interactive panel system demonstration. Exports multiple panel content components used to showcase all `PanelContainer` configuration options.

## Exported Exports

| Export | Purpose |
|--------|---------|
| `Panel1Content` | Root demo panel — buttons to open sub-panels |
| `Panel2Content` | Stacked panel example |
| `LeftAlignedPanelContent` | Left-aligned panel with settings-style content |
| `ProfilePanelContent` | Avatar + name in title bar |
| `FullWidthPanelContent` | Full-width `isFullWidth` panel |
| `ActionHeaderPanelContent` | Panel with header action buttons (video call, trash, etc.) |

## Usage

Accessed from the Settings panel via the "Demo Panels" button (dev/test mode only).

```tsx
const { openPanel } = usePanels();
openPanel('demo-panel', <Panel1Content />, 'Demo Panel', 'right', 'Explore panel features');
```

## Panel Configurations Demonstrated

| Config | Example |
|--------|---------|
| Right-aligned (default) | Panel 1 |
| Left-aligned | Settings-style panel |
| Profile header (avatar + subtitle) | Profile panel |
| Full-width | Full-width panel |
| Action buttons in header | Action header panel |
| Stacked / nested panels | Panel 1 → Panel 2 |

## Storybook

`Panels/DemoPanels` — Default story with an "Open Demo Panel" button.

