import { render, screen } from '@testing-library/react';
import Logo from './Logo';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

describe('Logo Component', () => {
  it('renders with default props', () => {
    render(<Logo />);
    const logo = screen.getByRole('img');
    expect(logo).toBeInTheDocument();
  });

  it('renders horizontal variant by default', () => {
    render(<Logo />);
    const logo = screen.getByRole('img');
    expect(logo).toHaveAttribute('src', '/images/logo-horizontal.png');
  });

  it('renders vertical variant when specified', () => {
    render(<Logo variant="vertical" />);
    const logo = screen.getByRole('img');
    expect(logo).toHaveAttribute('src', '/images/logo-vertical.png');
  });

  it('renders with small size', () => {
    render(<Logo size="sm" />);
    const logo = screen.getByRole('img');
    expect(logo).toHaveAttribute('width', '120');
    expect(logo).toHaveAttribute('height', '40');
  });

  it('renders with medium size by default', () => {
    render(<Logo />);
    const logo = screen.getByRole('img');
    expect(logo).toHaveAttribute('width', '180');
    expect(logo).toHaveAttribute('height', '60');
  });

  it('renders with large size', () => {
    render(<Logo size="lg" />);
    const logo = screen.getByRole('img');
    expect(logo).toHaveAttribute('width', '240');
    expect(logo).toHaveAttribute('height', '80');
  });

  it('has correct alt text', () => {
    render(<Logo />);
    const logo = screen.getByRole('img');
    // Default product name from env or fallback
    expect(logo).toHaveAttribute('alt');
  });

  it('has logo-image class', () => {
    render(<Logo />);
    const logo = screen.getByRole('img');
    expect(logo).toHaveClass('logo-image');
  });

  it('wraps logo in flex container', () => {
    const { container } = render(<Logo />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('flex', 'items-center', 'justify-center');
  });

  it('combines size and variant correctly - small vertical', () => {
    render(<Logo size="sm" variant="vertical" />);
    const logo = screen.getByRole('img');
    expect(logo).toHaveAttribute('src', '/images/logo-vertical.png');
    expect(logo).toHaveAttribute('width', '120');
    expect(logo).toHaveAttribute('height', '40');
  });

  it('combines size and variant correctly - large horizontal', () => {
    render(<Logo size="lg" variant="horizontal" />);
    const logo = screen.getByRole('img');
    expect(logo).toHaveAttribute('src', '/images/logo-horizontal.png');
    expect(logo).toHaveAttribute('width', '240');
    expect(logo).toHaveAttribute('height', '80');
  });
});

