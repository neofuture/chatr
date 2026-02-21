# Radio

**File:** `src/components/form-controls/Radio/Radio.tsx`

A group of radio buttons rendered from an `options` array. Forwards `ref` to the first radio input.

## Types

```typescript
interface RadioOption {
  value:     string;
  label:     string;
  disabled?: boolean;
}

interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?:   string;
  options:  RadioOption[];
  error?:   string;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Group heading rendered above all options |
| `options` | `RadioOption[]` | Array of radio items to render |
| `error` | `string` | Error message rendered below the group |

`type` is fixed to `"radio"`. `name` should be provided to link options in the same group.

## Usage

```tsx
<Radio
  label="Verification method"
  name="verifyMethod"
  options={[
    { value: 'email', label: 'Email' },
    { value: 'sms',   label: 'SMS' },
  ]}
  value={method}
  onChange={(e) => setMethod(e.target.value)}
/>
```

