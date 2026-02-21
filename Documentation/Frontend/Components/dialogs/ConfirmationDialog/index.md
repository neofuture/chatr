# ConfirmationDialog

**File:** `src/components/dialogs/ConfirmationDialog/ConfirmationDialog.tsx`

A global imperative confirmation modal. Accepts no props — it reads from and is controlled entirely by `ConfirmationContext`. Mount once in the app root.

## Props

None. The component is driven by context:

```typescript
// No props
export default function ConfirmationDialog()
```

## ConfirmationContext API

```typescript
interface ConfirmationAction {
  label:    string;
  value:    unknown;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface ConfirmationOptions {
  title:    string;
  message:  string;
  urgency?: 'info' | 'warning' | 'danger';
  actions:  ConfirmationAction[];
}

// From useConfirmation() hook
const { confirm } = useConfirmation();
```

| Urgency | Accent colour |
|---------|--------------|
| `info` | Blue |
| `warning` | Orange |
| `danger` | Red |

## Usage

Place the component once in the layout:

```tsx
// app/layout.tsx
<ConfirmationProvider>
  <ConfirmationDialog />
  {children}
</ConfirmationProvider>
```

Trigger imperatively from any component:

```tsx
const { confirm } = useConfirmation();

const handleDelete = async () => {
  const confirmed = await confirm({
    title: 'Delete message?',
    message: 'This action cannot be undone.',
    urgency: 'danger',
    actions: [
      { label: 'Cancel', value: false, variant: 'secondary' },
      { label: 'Delete', value: true,  variant: 'danger' },
    ],
  });

  if (confirmed) deleteMessage(id);
};
```

Pressing `Escape` cancels and returns `undefined`.

