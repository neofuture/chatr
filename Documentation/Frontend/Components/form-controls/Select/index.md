# Select

**File:** `src/components/form-controls/Select/Select.tsx`

A labelled `<select>` element with a custom SVG chevron icon. Forwards `ref` to the underlying `<select>`.

## Props

```typescript
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Label rendered above the select |
| `error` | `string` | Error message rendered below; adds `.error` class |

Pass `<option>` elements as `children`.

## Usage

```tsx
<Select
  label="Recipient"
  value={selectedUser}
  onChange={(e) => setSelectedUser(e.target.value)}
  error={errors.recipient}
>
  <option value="">Select a user...</option>
  {users.map(u => (
    <option key={u.id} value={u.id}>{u.username}</option>
  ))}
</Select>
```

