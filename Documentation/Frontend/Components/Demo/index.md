# Demo & Debug Components

Dev-only components used on the `/demo` page and for testing. Not used in production user flows.

---

## `Demo2FA`

**File:** `src/components/Demo2FA/Demo2FA.tsx`

Interactive demo of the 6-digit TOTP input UI. Pre-filled with code `123456` for demonstration. Used on the `/demo` page to showcase the 2FA verification component without a real backend call.

---

## `BottomSheetDemo`

**File:** `src/components/BottomSheetDemo/BottomSheetDemo.tsx`

Showcase of the `BottomSheet` component with multiple snap points and drag-to-dismiss. Used on the `/demo` page.

---

## `WebSocketDemo`

**File:** `src/components/WebSocketDemo/WebSocketDemo.tsx`

Early prototype messaging UI using raw `useWebSocket()` socket events directly. Superseded by the Test Lab (`/app/test`) and `useConversation` hook. Kept for reference.

---

## `WebSocketDebug`

**File:** `src/components/WebSocketDebug/WebSocketDebug.tsx`

Dev diagnostic component. On mount, logs token presence, user data, and WebSocket auth state to the console. Not rendered in any page — used during debugging only.

---

## `DemoPanels`

**File:** `src/components/panels/DemoPanels/DemoPanels.tsx`

Demonstrates the stacked `PanelContext` system with multiple panel configurations:
- Stacked panels (Panel 1 → Panel 2)
- Left-aligned panel with subtitle
- Profile panel with avatar and action icons
- Full-width panel

Used on the `/demo` page.

---

## See Also

- [PanelContext](../../Contexts/index.md#panelcontext)
- [PanelContainer](../panels/PanelContainer/index.md)
- [Test Lab](../test/index.md)

