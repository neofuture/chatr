jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams('userId=u1&requiresPhoneVerification=true'),
}));
jest.mock('next/image', () => ({ __esModule: true, default: (props: any) => <img {...props} /> }));
jest.mock('@/lib/api', () => ({ api: { post: jest.fn().mockResolvedValue({ data: {} }), get: jest.fn().mockResolvedValue({ data: {} }) } }));
jest.mock('@/lib/authUtils', () => ({ saveAuthToken: jest.fn() }));

import { render, screen } from '@testing-library/react';
import React, { Suspense } from 'react';

describe('Setup2FAPage', () => {
  it('should export a page module', () => {
    const mod = require('./page');
    expect(mod).toBeDefined();
  });
});
