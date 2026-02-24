import type { Preview } from '@storybook/react';
import '../src/app/globals.css';
import * as React from 'react';

// Load Font Awesome so icons render in all stories
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/assets/font-awesome/css/all.min.css';
document.head.appendChild(link);

// Storybook + Vite sometimes emit JSX that references React at runtime.
// Provide a global React to prevent "Can't find variable: React".
(globalThis as any).React = React;

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0f172a' },
        { name: 'light', value: '#f8fafc' },
        { name: 'mid', value: '#1e293b' },
      ],
    },
    layout: 'fullscreen',
  },
};

export default preview;
