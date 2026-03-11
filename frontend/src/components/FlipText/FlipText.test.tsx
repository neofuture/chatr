import { render, screen } from '@testing-library/react';
import FlipText from './FlipText';

describe('FlipText', () => {
  it('renders the value text', () => {
    render(<FlipText value="Hello" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<FlipText value="Test" className="my-class" />);
    expect(container.firstChild).toHaveClass('my-class');
  });

  it('applies custom style', () => {
    const { container } = render(<FlipText value="Test" style={{ color: 'red' }} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.color).toBe('red');
  });

  it('uses renderValue when provided', () => {
    render(
      <FlipText
        value="42"
        renderValue={(v) => <strong data-testid="custom">{v} items</strong>}
      />,
    );
    const matches = screen.getAllByTestId('custom');
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0]).toHaveTextContent('42 items');
  });

  it('updates display when value changes', () => {
    const { rerender } = render(<FlipText value="First" />);
    expect(screen.getByText('First')).toBeInTheDocument();

    rerender(<FlipText value="Second" />);
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('has overflow hidden on root element', () => {
    const { container } = render(<FlipText value="Test" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.overflow).toBe('hidden');
  });

  it('has position relative on root element', () => {
    const { container } = render(<FlipText value="Test" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.position).toBe('relative');
  });

  it('renders without className when not provided', () => {
    const { container } = render(<FlipText value="Test" />);
    expect(container.firstChild).not.toHaveClass('undefined');
  });

  it('renders renderValue output for both rows', () => {
    render(
      <FlipText
        value="X"
        renderValue={(v) => <em>{v}</em>}
      />,
    );
    const emphases = screen.getAllByText('X');
    expect(emphases.length).toBeGreaterThanOrEqual(1);
  });
});
