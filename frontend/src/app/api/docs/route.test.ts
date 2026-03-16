/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

let readdirCall = 0;
jest.mock('fs', () => ({
  readdirSync: jest.fn(() => {
    readdirCall++;
    if (readdirCall === 1) {
      return [
        { name: 'README.md', isDirectory: () => false, isFile: () => true },
        { name: 'guides', isDirectory: () => true, isFile: () => false },
      ];
    }
    return [{ name: 'setup.md', isDirectory: () => false, isFile: () => true }];
  }),
  existsSync: jest.fn(() => true),
  readFileSync: jest.fn(() => '# Hello Chatr World'),
}));

import { GET } from './route';
import fs from 'fs';

describe('GET /api/docs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    readdirCall = 0;
    (fs.readdirSync as jest.Mock).mockImplementation(() => {
      readdirCall++;
      if (readdirCall === 1) {
        return [
          { name: 'README.md', isDirectory: () => false, isFile: () => true },
          { name: 'guides', isDirectory: () => true, isFile: () => false },
        ];
      }
      return [{ name: 'setup.md', isDirectory: () => false, isFile: () => true }];
    });
  });

  it('returns directory structure when no file param', async () => {
    const request = new NextRequest('http://localhost:3000/api/docs');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('files');
    expect(data).toHaveProperty('folders');
  });

  it('returns file content when file param is provided', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('# Hello Chatr World');

    const request = new NextRequest('http://localhost:3000/api/docs?file=README.md');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('content');
    expect(data).toHaveProperty('path', 'README.md');
  });

  it('returns 404 when file does not exist', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const request = new NextRequest('http://localhost:3000/api/docs?file=missing.md');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toHaveProperty('error', 'File not found');
  });

  it('returns 500 on unexpected error', async () => {
    (fs.readdirSync as jest.Mock).mockImplementation(() => { throw new Error('disk error'); });

    const request = new NextRequest('http://localhost:3000/api/docs');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toHaveProperty('error', 'Failed to read documentation');
  });
});
