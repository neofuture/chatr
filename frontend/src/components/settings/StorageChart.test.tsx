import { render, screen, waitFor } from '@testing-library/react';
import StorageChart from './StorageChart';

const mockEach = jest.fn(async (_fn: any) => {});
const mockToArray = jest.fn(async () => []);
const mockCount = jest.fn(async () => 0);

jest.mock('@/lib/db', () => ({
  db: {
    profileImages: { each: (fn: any) => mockEach(fn) },
    coverImages: { each: (fn: any) => mockEach(fn) },
    audioCache: { each: (fn: any) => mockEach(fn) },
    cachedMessages: { toArray: () => mockToArray(), count: () => mockCount() },
    messages: { toArray: () => mockToArray(), count: () => mockCount() },
    users: { toArray: () => mockToArray(), count: () => mockCount() },
    groups: { toArray: () => mockToArray(), count: () => mockCount() },
    outboundQueue: { toArray: () => mockToArray(), count: () => mockCount() },
  },
}));

describe('StorageChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEach.mockImplementation(async () => {});
    mockToArray.mockImplementation(async () => []);
    mockCount.mockImplementation(async () => 0);
    localStorage.clear();
  });

  it('renders loading state initially', () => {
    mockEach.mockImplementation(() => new Promise(() => {}));
    mockToArray.mockImplementation(() => new Promise(() => {}));
    render(<StorageChart />);
    expect(screen.getByText('Calculating…')).toBeInTheDocument();
  });

  it('renders total and legend after loading', async () => {
    render(<StorageChart />);
    await waitFor(() => {
      expect(screen.queryByText('Calculating…')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Profile Images')).toBeInTheDocument();
    expect(screen.getByText('Cover Images')).toBeInTheDocument();
    expect(screen.getByText('Voice Notes')).toBeInTheDocument();
    expect(screen.getByText('Message Cache')).toBeInTheDocument();
    expect(screen.getByText('Offline Data')).toBeInTheDocument();
    expect(screen.getByText('Outbound Queue')).toBeInTheDocument();
    expect(screen.getByText('Preferences')).toBeInTheDocument();
  });

  it('shows small total when all tables are empty', async () => {
    render(<StorageChart />);
    await waitFor(() => {
      expect(screen.queryByText('Calculating…')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Total')).toBeInTheDocument();
    const totalValue = screen.getByText('Total').nextElementSibling;
    expect(totalValue).toBeInTheDocument();
    expect(totalValue?.textContent).toMatch(/^\d+(\.\d+)?\s*(B|KB|MB)$/);
  });

  it('shows dash for zero-byte buckets', async () => {
    render(<StorageChart />);
    await waitFor(() => {
      expect(screen.queryByText('Calculating…')).not.toBeInTheDocument();
    });
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('refreshes when refreshKey changes', async () => {
    const { rerender } = render(<StorageChart refreshKey={0} />);
    await waitFor(() => {
      expect(screen.queryByText('Calculating…')).not.toBeInTheDocument();
    });
    mockEach.mockClear();
    mockToArray.mockClear();
    rerender(<StorageChart refreshKey={1} />);
    await waitFor(() => {
      expect(mockToArray).toHaveBeenCalled();
    });
  });

  it('handles db errors gracefully', async () => {
    mockEach.mockRejectedValueOnce(new Error('DB fail'));
    render(<StorageChart />);
    await waitFor(() => {
      expect(screen.queryByText('Calculating…')).not.toBeInTheDocument();
    });
  });
});
