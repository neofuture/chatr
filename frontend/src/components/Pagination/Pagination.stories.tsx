import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import Pagination from './Pagination';

const meta: Meta<typeof Pagination> = {
  title: 'UI/Pagination',
  component: Pagination,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Page navigation with first/prev/next/last buttons and numbered page links.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
  args: { currentPage: 1, totalPages: 10, onPageChange: fn() },
};

export const MiddlePage: Story = {
  args: { currentPage: 5, totalPages: 10, onPageChange: fn() },
};

export const LastPage: Story = {
  args: { currentPage: 10, totalPages: 10, onPageChange: fn() },
};

export const FewPages: Story = {
  args: { currentPage: 2, totalPages: 3, onPageChange: fn() },
};

export const CustomLabel: Story = {
  args: { currentPage: 3, totalPages: 8, onPageChange: fn(), label: 'Results page 3 of 8' },
};

export const ManyPages: Story = {
  args: { currentPage: 50, totalPages: 100, onPageChange: fn() },
};
