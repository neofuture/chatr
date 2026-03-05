# Demo & Debug Components

Dev-only and showcase components. All have Storybook stories.

---

## `Demo2FA`

**File:** `src/components/Demo2FA/Demo2FA.tsx`
**Storybook:** `Forms/Demo2FA`

Interactive demo of the 6-digit TOTP input UI. Pre-filled with code `123456` for demonstration. Used to showcase the 2FA verification component without a real backend call.

---

## `BottomSheetDemo`

**File:** `src/components/BottomSheetDemo/BottomSheetDemo.tsx`
**Storybook:** `Demos/BottomSheetDemo`

Showcase of the `BottomSheet` component with multiple configurations: full-height, fixed-height, auto-height, no close button, and all form control variants rendered inside a sheet.

---

## `DemoPanels`

**File:** `src/components/panels/DemoPanels/DemoPanels.tsx`
**Storybook:** `Panels/DemoPanels`

Demonstrates the stacked `PanelContext` system with multiple panel configurations:
- Stacked panels (Panel 1 → Panel 2)
- Left-aligned panel with subtitle
- Profile panel with avatar and action icons
- Full-width panel
- Action header with custom buttons

---

## See Also

- [PanelContext](../../Contexts/index.md)
- [PanelContainer](../Panels/PanelContainer/index.md)
