# Textarea

**File:** `src/components/form-controls/Textarea/Textarea.tsx`

A labelled `<textarea>` with vertical resize and inline error message. Forwards `ref` to the underlying element.

## Props

```typescript
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Label rendered above |
| `error` | `string` | Error message rendered below; adds `.error` class |

Fixed styles: `minHeight: 80px`, `resize: vertical`.

## Usage

```tsx
<Textarea
  label="Message"
  placeholder="Type something..."
  value={body}
  onChange={(e) => setBody(e.target.value)}
  error={errors.body}
/>
```

