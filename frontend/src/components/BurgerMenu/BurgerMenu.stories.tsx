import type { Meta, StoryObj } from '@storybook/react';
import BurgerMenu from './BurgerMenu';

const meta: Meta<typeof BurgerMenu> = {
  title: 'Utility/BurgerMenu',
  component: BurgerMenu,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: { component: 'Hamburger menu button with a slide-in navigation drawer. Used in desktop layouts.' },
    },
  },
  argTypes: {
    isDark: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Dark: Story = {
  args: { isDark: true },
};

export const Light: Story = {
  args: { isDark: false },
};

