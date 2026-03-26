import type { StorybookConfig } from '@storybook/react-vite';
import * as path from 'path';
import { createLogger } from 'vite';

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

    const logger = createLogger();
    const originalWarn = logger.warn.bind(logger);
    logger.warn = (msg, options) => {
      if (msg.includes('"use client"')) return;
      if (msg.includes('use client')) return;
      if (msg.includes('resolve original location')) return;
      originalWarn(msg, options);
    };

    return mergeConfig(config, {
      customLogger: logger,
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
      build: {
        rollupOptions: {
          onwarn(warning, warn) {
            if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
            if (warning.code === 'SOURCEMAP_ERROR') return;
            if (warning.code === 'EVAL') return;
            warn(warning);
          },
        },
        chunkSizeWarningLimit: 1000,
      },
    });
  },
};

export default config;
