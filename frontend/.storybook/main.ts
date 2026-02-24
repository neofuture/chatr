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
    });
  },
};

export default config;
