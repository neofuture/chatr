import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PresenceAvatar from './PresenceAvatar';
import type { PresenceInfo } from '@/types/types.ts';

const online: PresenceInfo = { status: 'online', lastSeen: null };
const offline: PresenceInfo = { status: 'offline', lastSeen: null };
const hidden: PresenceInfo = { status: 'online', lastSeen: null, hidden: true };

describe('PresenceAvatar', () => {
  it('renders initials from display name', () => {
    render(<PresenceAvatar displayName="Alice Bob" info={online} />);
    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  it('renders single-word initials', () => {
    render(<PresenceAvatar displayName="Alice" info={online} />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders profile image when provided', () => {
    render(
      <PresenceAvatar displayName="Alice" info={online} profileImage="/avatar.jpg" />,
    );
    const img = screen.getByAltText('Alice');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/avatar.jpg');
  });

  it('shows presence dot by default for online', () => {
    const { container } = render(
      <PresenceAvatar displayName="Alice" info={online} />,
    );
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
  });

  it('hides presence dot when showDot is false', () => {
    const { container } = render(
      <PresenceAvatar displayName="Alice" info={online} showDot={false} />,
    );
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).not.toBeInTheDocument();
  });

  it('hides dot when info.hidden is true', () => {
    const { container } = render(
      <PresenceAvatar displayName="Alice" info={hidden} />,
    );
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = jest.fn();
    const user = userEvent.setup();
    render(<PresenceAvatar displayName="Alice" info={online} onClick={onClick} />);

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('has role="button" when onClick provided', () => {
    render(<PresenceAvatar displayName="Alice" info={online} onClick={() => {}} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has no role="button" when no onClick', () => {
    render(<PresenceAvatar displayName="Alice" info={online} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders group icon when isGroup is true', () => {
    const { container } = render(
      <PresenceAvatar displayName="Team" info={offline} isGroup />,
    );
    const icon = container.querySelector('.fas.fa-users');
    expect(icon).toBeInTheDocument();
  });

  it('applies bot ring style when isBot', () => {
    const { container } = render(
      <PresenceAvatar displayName="Bot" info={online} isBot />,
    );
    const ring = container.querySelector('[class*="ringBot"]');
    expect(ring).toBeInTheDocument();
  });

  it('applies guest ring style when isGuest', () => {
    const { container } = render(
      <PresenceAvatar displayName="Guest" info={online} isGuest />,
    );
    const ring = container.querySelector('[class*="ringGuest"]');
    expect(ring).toBeInTheDocument();
  });

  it('uses custom size', () => {
    const { container } = render(
      <PresenceAvatar displayName="Alice" info={online} size={80} />,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.style.width).toBe('80px');
    expect(root.style.height).toBe('80px');
  });

  it('shows pointer cursor when onClick provided', () => {
    const { container } = render(
      <PresenceAvatar displayName="Alice" info={online} onClick={() => {}} />,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.style.cursor).toBe('pointer');
  });
});
