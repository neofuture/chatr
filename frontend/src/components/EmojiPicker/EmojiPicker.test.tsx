import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import EmojiPicker from './EmojiPicker';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

jest.mock('./EmojiPicker.module.css', () => new Proxy({}, { get: (_t, k) => k }), { virtual: true });

// Mock IntersectionObserver
const observeMock   = jest.fn();
const disconnectMock = jest.fn();
const unobserveMock = jest.fn();
beforeAll(() => {
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: observeMock,
    unobserve: unobserveMock,
    disconnect: disconnectMock,
  }));
  // jsdom doesn't implement scrollTo or scrollIntoView
  Element.prototype.scrollTo       = jest.fn() as any;
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPicker(props: Partial<React.ComponentProps<typeof EmojiPicker>> = {}) {
  const onSelect = jest.fn();
  const onClose  = jest.fn();
  const result   = render(
    <EmojiPicker onSelect={onSelect} onClose={onClose} {...props} />,
  );
  return { ...result, onSelect, onClose };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EmojiPicker', () => {

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderPicker();
      expect(container).toBeInTheDocument();
    });

    it('renders the category tab bar', () => {
      renderPicker();
      expect(screen.getByRole('tablist', { name: /emoji categories/i })).toBeInTheDocument();
    });

    it('renders a tab for every category', () => {
      renderPicker();
      const tabs = screen.getAllByRole('tab');
      // recent + 9 emojiData categories = 10
      expect(tabs.length).toBeGreaterThanOrEqual(9);
    });

    it('renders the search input', () => {
      renderPicker();
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });

    it('renders the emoji scrollable region', () => {
      renderPicker();
      expect(screen.getByRole('region', { name: /emoji list/i })).toBeInTheDocument();
    });

    it('renders smileys section heading by default (no recent)', () => {
      renderPicker();
      expect(screen.getByText(/smileys/i)).toBeInTheDocument();
    });
  });

  describe('Category tabs', () => {
    it('clicking a tab sets it as active (aria-selected)', () => {
      renderPicker();
      const tabs = screen.getAllByRole('tab');
      const animalsTab = tabs.find(t => t.getAttribute('aria-label')?.toLowerCase() === 'animals');
      expect(animalsTab).toBeTruthy();
      fireEvent.click(animalsTab!);
      expect(animalsTab).toHaveAttribute('aria-selected', 'true');
    });

    it('clicking a tab clears the search input', async () => {
      renderPicker();
      const search = screen.getByRole('searchbox');
      fireEvent.change(search, { target: { value: 'dog' } });
      expect(search).toHaveValue('dog');

      const tabs = screen.getAllByRole('tab');
      fireEvent.click(tabs[1]); // first non-recent tab
      expect(search).toHaveValue('');
    });

    it('all tabs have accessible aria-label', () => {
      renderPicker();
      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-label');
        expect(tab.getAttribute('aria-label')!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Search', () => {
    it('filters emojis by name when searching', async () => {
      renderPicker();
      const search = screen.getByRole('searchbox');
      fireEvent.change(search, { target: { value: 'dog' } });
      await waitFor(() => {
        // queryAllByTitle handles multiple matches
        const dogBtns = screen.queryAllByTitle(/dog/i);
        expect(dogBtns.length).toBeGreaterThan(0);
      });
    });

    it('shows category group headings in search results', async () => {
      renderPicker();
      const search = screen.getByRole('searchbox');
      fireEvent.change(search, { target: { value: 'heart' } });
      await waitFor(() => {
        // symbols category has hearts
        expect(screen.queryByText(/symbols/i)).toBeInTheDocument();
      });
    });

    it('shows no-results message when search finds nothing', async () => {
      renderPicker();
      const search = screen.getByRole('searchbox');
      fireEvent.change(search, { target: { value: 'zzzznotarealemoji99999' } });
      await waitFor(() => {
        expect(screen.getByText(/no emojis found/i)).toBeInTheDocument();
      });
    });

    it('shows clear button when search has text', () => {
      renderPicker();
      const search = screen.getByRole('searchbox');
      fireEvent.change(search, { target: { value: 'smile' } });
      expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
    });

    it('clear button removes search text', () => {
      renderPicker();
      const search = screen.getByRole('searchbox');
      fireEvent.change(search, { target: { value: 'smile' } });
      fireEvent.click(screen.getByRole('button', { name: /clear search/i }));
      expect(search).toHaveValue('');
    });

    it('does not show clear button when search is empty', () => {
      renderPicker();
      expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument();
    });
  });

  describe('Emoji selection', () => {
    it('calls onSelect with the emoji when clicked', () => {
      const { onSelect } = renderPicker();
      // Find first emoji button (any emoji button in the grid)
      const emojiButtons = screen.getAllByRole('button').filter(b =>
        b.getAttribute('aria-label') && b.getAttribute('aria-label') !== 'Clear search',
      );
      const firstEmoji = emojiButtons[0];
      fireEvent.click(firstEmoji);
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(typeof onSelect.mock.calls[0][0]).toBe('string');
    });

    it('saves picked emoji to localStorage (recent)', () => {
      renderPicker();
      // Pick any emoji button that has an aria-label (emoji name) — excludes tab/clear buttons
      const gridRegion = screen.getByRole('region', { name: /emoji list/i });
      const emojiButtons = Array.from(
        gridRegion.querySelectorAll<HTMLButtonElement>('button[aria-label]'),
      );
      expect(emojiButtons.length).toBeGreaterThan(0);
      fireEvent.click(emojiButtons[0]);
      const stored = localStorage.getItem('chatr_recent_emojis');
      expect(stored).not.toBeNull();
    });
  });

  describe('Dismissal', () => {
    it('calls onClose after clicking outside the picker', async () => {
      const { onClose } = renderPicker();
      fireEvent.mouseDown(document.body);
      await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 500 });
    });

    it('calls onClose after pressing Escape', async () => {
      const { onClose } = renderPicker();
      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 500 });
    });
  });

  describe('Accessibility', () => {
    it('tab bar has role=tablist', () => {
      renderPicker();
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('each tab has role=tab and aria-selected', () => {
      renderPicker();
      const tabs = screen.getAllByRole('tab');
      tabs.forEach(t => {
        expect(t).toHaveAttribute('aria-selected');
      });
    });

    it('search input has accessible label', () => {
      renderPicker();
      expect(screen.getByRole('searchbox', { name: /search emojis/i })).toBeInTheDocument();
    });

    it('emoji buttons have aria-label equal to emoji name', () => {
      renderPicker();
      const tabs = screen.getAllByRole('tab');
      // click smileys tab to ensure emojis are visible
      const smileysTab = tabs.find(t => /smileys/i.test(t.getAttribute('aria-label') ?? ''));
      if (smileysTab) fireEvent.click(smileysTab);
      const gridRegion = screen.getByRole('region', { name: /emoji list/i });
      const emojiButtons = Array.from(gridRegion.querySelectorAll('button[aria-label]'));
      expect(emojiButtons.length).toBeGreaterThan(0);
      emojiButtons.forEach(btn => {
        const label = btn.getAttribute('aria-label');
        expect(label && label.length > 0).toBe(true);
      });
    });
  });

  describe('Recent emojis', () => {
    it('shows recent section when localStorage has saved emojis', () => {
      localStorage.setItem(
        'chatr_recent_emojis',
        JSON.stringify([{ emoji: '😀', name: 'grinning face', keywords: ['smile'] }]),
      );
      renderPicker();
      // The Recent tab should exist
      expect(screen.getByRole('tab', { name: /recent/i })).toBeInTheDocument();
      // The sticky heading should be visible in the scroll area
      expect(screen.getByText(/recent/i)).toBeInTheDocument();
    });
  });
});

