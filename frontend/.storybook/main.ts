import type { StorybookConfig } from '@storybook/react-vite';
import * as path from 'path';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: { autodocs: 'tag' },
  staticDirs: ['../public'],
  viteFinal: async (config) => {
    const { mergeConfig } = await import('vite');
    return mergeConfig(config, {
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '../src'),
          'next/image': path.resolve(__dirname, './mocks/next-image.tsx'),
          'next/link': path.resolve(__dirname, './mocks/next-link.tsx'),
          'next/navigation': path.resolve(__dirname, './mocks/next-navigation.ts'),
          'next/font/google': path.resolve(__dirname, './mocks/next-font.ts'),
        },
      },
      define: {
        'process.env.NEXT_PUBLIC_API_URL': JSON.stringify('http://localhost:3001'),
        'process.env.NEXT_PUBLIC_WS_URL': JSON.stringify('http://localhost:3001'),
        'process.env.NEXT_PUBLIC_PRODUCT_NAME': JSON.stringify('Chatr'),
        'process.env.NEXT_PUBLIC_SITE_URL': JSON.stringify('http://localhost:3000'),
        'process.env.NEXT_PUBLIC_AI_BOT_USER_ID': JSON.stringify(''),
      },
      optimizeDeps: {
        include: [
          'framer-motion',
          'socket.io-client',
          'dexie',
        ],
      },
    });
  },
};

export default config;
