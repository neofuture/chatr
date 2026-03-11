jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

import { redirect } from 'next/navigation';

describe('RegisterPage', () => {
  it('should export a page module', () => {
    const mod = require('./page');
    expect(mod).toBeDefined();
  });
});
