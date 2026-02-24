import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { useState } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import EmojiPicker from './EmojiPicker';
import Button from '@/components/form-controls/Button/Button';

const meta: Meta<typeof EmojiPicker> = {
  title: 'Messaging/EmojiPicker',
  component: EmojiPicker,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Infinite-scroll emoji picker with sticky category headers, recent emojis, and search. Categories: Smileys, People, Animals, Food, Travel, Activities, Objects, Symbols, Flags.',
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

function PickerDemo({ openUpward }: { openUpward?: boolean }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');

  return (
    <div style={{ position: 'relative', padding: '2rem' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Button variant="primary" onClick={() => setOpen(v => !v)}>
          😊 Toggle Picker
        </Button>
        {selected && (
          <span style={{ fontSize: '2rem' }} title="Last selected">{selected}</span>
        )}
      </div>
      {open && (
        <EmojiPicker
          onSelect={(emoji) => { setSelected(emoji); }}
          onClose={() => setOpen(false)}
          openUpward={openUpward}
        />
      )}
    </div>
  );
}

export const Default: Story = {
  render: () => <PickerDemo openUpward={false} />,
};

export const OpenUpward: Story = {
  render: () => (
    <div style={{ paddingTop: '400px' }}>
      <PickerDemo openUpward />
    </div>
  ),
};

export const AlwaysOpen: Story = {
  render: () => (
    <ThemeProvider>
      <div style={{ padding: '1rem' }}>
        <EmojiPicker onSelect={fn()} onClose={fn()} openUpward={false} />
      </div>
    </ThemeProvider>
  ),
};

