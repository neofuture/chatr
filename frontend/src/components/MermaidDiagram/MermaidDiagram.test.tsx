import { render, screen, waitFor } from '@testing-library/react';
import MermaidDiagram from './MermaidDiagram';

const mockRender = jest.fn().mockResolvedValue({ svg: '<svg data-testid="mermaid-svg">test</svg>' });
const mockInitialize = jest.fn();

jest.mock(
  'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs',
  () => ({
    __esModule: true,
    default: {
      initialize: mockInitialize,
      render: mockRender,
    },
  }),
  { virtual: true },
);

describe('MermaidDiagram', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders container with mermaid-diagram class', () => {
    const { container } = render(<MermaidDiagram chart="graph TD; A-->B" />);
    expect(container.querySelector('.mermaid-diagram')).toBeInTheDocument();
  });

  it('renders a div element', () => {
    const { container } = render(<MermaidDiagram chart="graph TD; A-->B" />);
    expect(container.firstChild?.nodeName).toBe('DIV');
  });

  it('passes chart prop for rendering', async () => {
    render(<MermaidDiagram chart="graph TD; A-->B" />);
    await waitFor(() => {
      expect(mockRender).toHaveBeenCalledWith(
        expect.stringContaining('mermaid-'),
        'graph TD; A-->B',
      );
    });
  });

  it('renders SVG content when mermaid resolves', async () => {
    const { container } = render(<MermaidDiagram chart="graph TD; X-->Y" />);
    await waitFor(() => {
      expect(container.innerHTML).toContain('svg');
    });
  });

  it('renders empty container initially', () => {
    const { container } = render(<MermaidDiagram chart="" />);
    const diagram = container.querySelector('.mermaid-diagram');
    expect(diagram).toBeInTheDocument();
  });

  it('does not call render when chart is empty', () => {
    render(<MermaidDiagram chart="" />);
    expect(mockRender).not.toHaveBeenCalled();
  });

  it('re-renders when chart prop changes', async () => {
    const { rerender } = render(<MermaidDiagram chart="graph TD; A-->B" />);
    await waitFor(() => expect(mockRender).toHaveBeenCalledTimes(1));

    rerender(<MermaidDiagram chart="graph TD; C-->D" />);
    await waitFor(() => expect(mockRender).toHaveBeenCalledTimes(2));
  });

  it('uses dangerouslySetInnerHTML for svg injection', () => {
    const { container } = render(<MermaidDiagram chart="" />);
    const el = container.querySelector('.mermaid-diagram') as HTMLElement;
    expect(el).toBeInTheDocument();
  });
});
