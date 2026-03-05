import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Layout/AppLayout',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
**AppLayout** is the root authenticated shell for desktop viewports.

It provides:
- Auth guard — reads \`token\` and \`user\` from localStorage, redirects to \`/\` if missing
- Fixed header with logo, navigation, theme toggle, and profile avatar
- BurgerMenu for secondary navigation
- PanelContainer overlay for slide-in panels
- ToastContainer and ConfirmationDialog globally
- RoutePreloader that prefetches all app routes on mount

This component cannot be rendered in isolation in Storybook — it requires Next.js navigation and full auth context. Use the live app at \`/app\` on a desktop viewport.
        `.trim(),
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div style={{ padding: 32, color: '#94a3b8', fontFamily: 'system-ui', maxWidth: 640 }}>
      <h2 style={{ color: '#f1f5f9', marginBottom: 12 }}>AppLayout</h2>
      <p>Full-page authenticated layout for desktop (≥769 px). Cannot be isolated in Storybook.</p>
      <ul style={{ marginTop: 12, lineHeight: 2 }}>
        <li>Auth guard — redirects unauthenticated users to <code>/</code></li>
        <li>Header bar with logo, nav links, theme toggle, profile avatar</li>
        <li>BurgerMenu for secondary nav</li>
        <li>Stackable panel overlay (PanelContainer)</li>
        <li>Global toast &amp; confirmation dialogs</li>
        <li>RoutePreloader — prefetches all app routes on mount</li>
      </ul>
    </div>
  ),
};

