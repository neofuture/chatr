import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CodeBlock, { parseCodeBlocks } from './CodeBlock';

const mockWriteText = jest.fn();

describe('CodeBlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });
  });

  it('renders without crashing', () => {
    render(<CodeBlock lang="js" content="const x = 1;" />);
    expect(screen.getByText('js')).toBeInTheDocument();
  });

  it('displays the language label', () => {
    render(<CodeBlock lang="python" content="print('hi')" />);
    expect(screen.getByText('python')).toBeInTheDocument();
  });

  it('falls back to "code" when lang is empty', () => {
    render(<CodeBlock lang="" content="hello" />);
    expect(screen.getByText('code')).toBeInTheDocument();
  });

  it('renders code content with syntax tokens', () => {
    render(<CodeBlock lang="js" content="const x = 42;" />);
    expect(screen.getByText('const')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders Copy button', () => {
    render(<CodeBlock lang="js" content="let a = 1;" />);
    expect(screen.getByLabelText('Copy code')).toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('copies content to clipboard on button click', async () => {
    render(<CodeBlock lang="js" content="const x = 1;" />);
    fireEvent.click(screen.getByLabelText('Copy code'));
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('const x = 1;');
    });
  });

  it('shows "Copied!" feedback after copying', async () => {
    const user = userEvent.setup();
    render(<CodeBlock lang="js" content="const x = 1;" />);
    await user.click(screen.getByLabelText('Copy code'));
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('highlights strings', () => {
    const { container } = render(<CodeBlock lang="js" content={`const s = "hello";`} />);
    const stringSpan = container.querySelector('.string');
    expect(stringSpan).toBeInTheDocument();
    expect(stringSpan?.textContent).toBe('"hello"');
  });

  it('highlights comments', () => {
    const { container } = render(<CodeBlock lang="js" content="// this is a comment" />);
    const commentSpan = container.querySelector('.comment');
    expect(commentSpan).toBeInTheDocument();
  });

  it('highlights keywords', () => {
    const { container } = render(<CodeBlock lang="js" content="function foo() {}" />);
    const keywordSpans = container.querySelectorAll('.keyword');
    const keywords = Array.from(keywordSpans).map(s => s.textContent);
    expect(keywords).toContain('function');
  });
});

describe('parseCodeBlocks', () => {
  it('returns text segment for plain text', () => {
    const result = parseCodeBlocks('hello world');
    expect(result).toEqual([{ kind: 'text', content: 'hello world' }]);
  });

  it('parses a fenced code block', () => {
    const input = '```js\nconst x = 1;\n```';
    const result = parseCodeBlocks(input);
    expect(result).toEqual([{ kind: 'code', lang: 'js', content: 'const x = 1;' }]);
  });

  it('parses mixed text and code', () => {
    const input = 'before\n```python\nprint("hi")\n```\nafter';
    const result = parseCodeBlocks(input);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ kind: 'text', content: 'before' });
    expect(result[1]).toEqual({ kind: 'code', lang: 'python', content: 'print("hi")' });
    expect(result[2]).toEqual({ kind: 'text', content: 'after' });
  });

  it('defaults to "text" when no language specified', () => {
    const input = '```\nsome code\n```';
    const result = parseCodeBlocks(input);
    expect(result[0]).toEqual({ kind: 'code', lang: 'text', content: 'some code' });
  });

  it('handles inline code fences', () => {
    const input = '```hello world```';
    const result = parseCodeBlocks(input);
    expect(result).toEqual([{ kind: 'code', lang: 'text', content: 'hello world' }]);
  });

  it('handles unclosed code blocks', () => {
    const input = '```js\nconst x = 1;';
    const result = parseCodeBlocks(input);
    expect(result).toEqual([{ kind: 'code', lang: 'js', content: 'const x = 1;' }]);
  });

  it('handles multiple code blocks', () => {
    const input = '```js\na\n```\ntext\n```py\nb\n```';
    const result = parseCodeBlocks(input);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ kind: 'code', lang: 'js', content: 'a' });
    expect(result[1]).toEqual({ kind: 'text', content: 'text' });
    expect(result[2]).toEqual({ kind: 'code', lang: 'py', content: 'b' });
  });

  it('returns empty array for empty string', () => {
    const result = parseCodeBlocks('');
    expect(result).toEqual([]);
  });
});
