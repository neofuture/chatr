describe('DocsPage', () => {
  it('should export a page module', () => {
    jest.mock('next/dynamic', () => () => () => null);
    jest.mock('next/link', () => ({ __esModule: true, default: ({ children }: any) => <a>{children}</a> }));
    jest.mock('next/image', () => ({ __esModule: true, default: (props: any) => <img {...props} /> }));
    jest.mock('react-markdown', () => ({ __esModule: true, default: ({ children }: any) => <div>{children}</div> }));
    jest.mock('remark-gfm', () => ({ __esModule: true, default: () => {} }));
    jest.mock('rehype-slug', () => ({ __esModule: true, default: () => {} }));
    jest.mock('rehype-autolink-headings', () => ({ __esModule: true, default: () => {} }));
    jest.mock('react-syntax-highlighter', () => ({ Prism: () => null }));
    jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({ vscDarkPlus: {} }));
    const mod = require('./page');
    expect(mod).toBeDefined();
  });
});
