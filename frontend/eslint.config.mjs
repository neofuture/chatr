import nextConfig from 'eslint-config-next';

export default [
  ...nextConfig,
  {
    ignores: ['**/*.test.*', '**/*.stories.*', '.next/**', 'coverage/**'],
  },
];
