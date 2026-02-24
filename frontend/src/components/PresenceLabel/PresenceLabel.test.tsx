import { render, screen } from '@testing-library/react';
import PresenceLabel, { formatPresence } from './PresenceLabel';
import type { PresenceInfo } from '@/components/test/types';

const online:  PresenceInfo = { status: 'online',  lastSeen: null };
const away:    PresenceInfo = { status: 'away',    lastSeen: null };
const offline: PresenceInfo = { status: 'offline', lastSeen: null };

function secsAgo(s: number): PresenceInfo {
  return { status: 'offline', lastSeen: new Date(Date.now() - s * 1000) };
}

describe('formatPresence', () => {
  it('returns Online for online status', () => {
    expect(formatPresence(online)).toBe('Online');
  });

  it('returns Away for away status', () => {
    expect(formatPresence(away)).toBe('Away');
  });

  it('returns "Last seen a while ago" when no lastSeen date', () => {
    expect(formatPresence(offline)).toBe('Last seen a while ago');
  });

  it('shows seconds when < 60s ago', () => {
    expect(formatPresence(secsAgo(30))).toMatch(/30 second/);
  });

  it('shows singular second', () => {
    expect(formatPresence(secsAgo(1))).toMatch(/1 second\b/);
  });

  it('shows minutes when 1–59 min ago', () => {
    expect(formatPresence(secsAgo(120))).toMatch(/2 minute/);
  });

  it('shows singular minute', () => {
    expect(formatPresence(secsAgo(60))).toMatch(/1 minute\b/);
  });

  it('shows hours when 1–2 hours ago', () => {
    expect(formatPresence(secsAgo(3600))).toMatch(/1 hour\b/);
  });

  it('shows "last seen at [time]" when 3–23h ago', () => {
    expect(formatPresence(secsAgo(4 * 3600))).toMatch(/Last seen at \d/);
  });

  it('shows "last seen on [date] at [time]" when > 24h ago', () => {
    expect(formatPresence(secsAgo(25 * 3600))).toMatch(/Last seen on .+ at \d/);
  });
});

describe('PresenceLabel component', () => {
  it('renders Online label', () => {
    render(<PresenceLabel info={online} />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('renders Away label', () => {
    render(<PresenceLabel info={away} />);
    expect(screen.getByText('Away')).toBeInTheDocument();
  });

  it('renders "Last seen a while ago" when no lastSeen', () => {
    render(<PresenceLabel info={offline} />);
    expect(screen.getByText('Last seen a while ago')).toBeInTheDocument();
  });

  it('renders a dot by default', () => {
    const { container } = render(<PresenceLabel info={online} />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
  });

  it('hides dot when showDot=false', () => {
    const { container } = render(<PresenceLabel info={online} showDot={false} />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).not.toBeInTheDocument();
  });

  it('shows last seen seconds for recent offline', () => {
    render(<PresenceLabel info={secsAgo(45)} />);
    expect(screen.getByText(/45 second/)).toBeInTheDocument();
  });
});

