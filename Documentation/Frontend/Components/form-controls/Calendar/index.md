# Calendar

**File:** `src/components/form-controls/Calendar/Calendar.tsx`

A traditional month-grid calendar. Used internally by `DatePicker` but can also be used standalone.

## Props

```typescript
interface CalendarProps {
  value?:    Date;
  onChange?: (date: Date) => void;
  onClose?:  () => void;
  mode?:     'date' | 'time' | 'datetime';
  minDate?:  Date;
  maxDate?:  Date;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Date` | Current date | Initially highlighted date |
| `onChange` | `function` | — | Called when user selects a date |
| `onClose` | `function` | — | Called when the calendar should be dismissed |
| `mode` | `string` | `'datetime'` | `'date'` hides time inputs · `'time'` shows only time · `'datetime'` shows both |
| `minDate` | `Date` | — | Dates before this are disabled |
| `maxDate` | `Date` | — | Dates after this are disabled |

## Usage

```tsx
<Calendar
  value={selectedDate}
  onChange={(date) => setSelectedDate(date)}
  onClose={() => setShowCalendar(false)}
  mode="date"
  minDate={new Date()}
/>
```

