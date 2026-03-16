import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LinkPreviewCard from './LinkPreviewCard';
import type { LinkPreviewData } from './LinkPreviewCard';

const FULL_PREVIEW: LinkPreviewData = {
  url: 'https://example.com/article',
  title: 'Example Article',
  description: 'This is a great article about testing React components with jest and testing library.',
  image: 'https://example.com/image.jpg',
  siteName: 'Example',
  favicon: 'https://example.com/favicon.ico',
};

const MINIMAL_PREVIEW: LinkPreviewData = {
  url: 'https://example.com',
  title: null,
  description: null,
  image: null,
  siteName: null,
  favicon: null,
};

describe('LinkPreviewCard', () => {
  it('renders without crashing', () => {
    render(<LinkPreviewCard preview={FULL_PREVIEW} />);
    expect(screen.getByText('Example Article')).toBeInTheDocument();
  });

  it('renders as a link to the URL', () => {
    render(<LinkPreviewCard preview={FULL_PREVIEW} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com/article');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows site name', () => {
    render(<LinkPreviewCard preview={FULL_PREVIEW} />);
    expect(screen.getByText('Example')).toBeInTheDocument();
  });

  it('shows title', () => {
    render(<LinkPreviewCard preview={FULL_PREVIEW} />);
    expect(screen.getByText('Example Article')).toBeInTheDocument();
  });

  it('shows description', () => {
    render(<LinkPreviewCard preview={FULL_PREVIEW} />);
    expect(screen.getByText(FULL_PREVIEW.description!)).toBeInTheDocument();
  });

  it('truncates long descriptions', () => {
    const longDesc = 'A'.repeat(200);
    const preview = { ...FULL_PREVIEW, description: longDesc };
    render(<LinkPreviewCard preview={preview} />);
    expect(screen.getByText('A'.repeat(120) + '...')).toBeInTheDocument();
  });

  it('shows preview image', () => {
    const { container } = render(<LinkPreviewCard preview={FULL_PREVIEW} />);
    const previewImg = container.querySelector(`img[src="${FULL_PREVIEW.image}"]`);
    expect(previewImg).toBeInTheDocument();
  });

  it('shows favicon', () => {
    const { container } = render(<LinkPreviewCard preview={FULL_PREVIEW} />);
    const favicon = container.querySelector(`img[src="${FULL_PREVIEW.favicon}"]`);
    expect(favicon).toBeInTheDocument();
  });

  it('hides image when not provided', () => {
    const { container } = render(<LinkPreviewCard preview={MINIMAL_PREVIEW} />);
    const previewImg = container.querySelector(`img[src="${FULL_PREVIEW.image}"]`);
    expect(previewImg).toBeNull();
  });

  it('hides title when not provided', () => {
    render(<LinkPreviewCard preview={MINIMAL_PREVIEW} />);
    expect(screen.queryByText('Example Article')).not.toBeInTheDocument();
  });

  it('hides description when not provided', () => {
    render(<LinkPreviewCard preview={MINIMAL_PREVIEW} />);
    // Only the domain should appear
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });

  it('falls back to hostname when siteName is null', () => {
    render(<LinkPreviewCard preview={MINIMAL_PREVIEW} />);
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });

  it('hides image on error', () => {
    const { container } = render(<LinkPreviewCard preview={FULL_PREVIEW} />);
    const previewImg = container.querySelector(`img[src="${FULL_PREVIEW.image}"]`)!;
    fireEvent.error(previewImg);
    expect(container.querySelector(`img[src="${FULL_PREVIEW.image}"]`)).toBeNull();
  });

  it('renders dismiss button when onDismiss provided', () => {
    const onDismiss = jest.fn();
    render(<LinkPreviewCard preview={FULL_PREVIEW} onDismiss={onDismiss} />);
    expect(screen.getByLabelText('Dismiss preview')).toBeInTheDocument();
  });

  it('does not render dismiss button when onDismiss not provided', () => {
    render(<LinkPreviewCard preview={FULL_PREVIEW} />);
    expect(screen.queryByLabelText('Dismiss preview')).not.toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button clicked', async () => {
    const onDismiss = jest.fn();
    const user = userEvent.setup();
    render(<LinkPreviewCard preview={FULL_PREVIEW} onDismiss={onDismiss} />);
    await user.click(screen.getByLabelText('Dismiss preview'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('applies compact class when compact prop is true', () => {
    const { container } = render(<LinkPreviewCard preview={FULL_PREVIEW} compact />);
    expect(container.firstChild).toHaveClass('compact');
  });
});
