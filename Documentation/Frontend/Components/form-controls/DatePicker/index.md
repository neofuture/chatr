# DatePicker

**File:** `src/components/form-controls/DatePicker/DatePicker.tsx`

A scroll-wheel style date and/or time picker. Renders into a React portal to avoid `overflow: hidden` clipping. Internally uses the `Calendar` component for date selection.

## Props

```typescript
interface DatePickerProps {
  label?:    string;
  value?:    Date;
  onChange?: (date: Date) => void;
  error?:    string;
  minDate?:  Date;
  maxDate?:  Date;
  locale?:   'en-US' | 'en-GB' | string;
  mode?:     'date' | 'time' | 'datetime';
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | Label rendered above the trigger input |
| `value` | `Date` | Current date | Controlled selected value |
| `onChange` | `function` | — | Called with a `Date` when the user confirms |
| `error` | `string` | — | Error message rendered below |
| `minDate` | `Date` | — | Earliest selectable date |
| `maxDate` | `Date` | — | Latest selectable date |
| `locale` | `string` | `'en-GB'` | `'en-GB'` = DD/MM/YYYY · `'en-US'` = MM/DD/YYYY |
| `mode` | `string` | `'datetime'` | `'date'` = date only · `'time'` = time only · `'datetime'` = both |

## Usage

```tsx
<DatePicker
  label="Schedule for"
  value={scheduledAt}
  onChange={(date) => setScheduledAt(date)}
  mode="datetime"
  locale="en-GB"
  minDate={new Date()}
  error={errors.scheduledAt}
/>
```

