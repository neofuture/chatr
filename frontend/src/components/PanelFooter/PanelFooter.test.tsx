import { render, screen } from '@testing-library/react';
import PanelFooter from './PanelFooter';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', isDark: true, toggleTheme: jest.fn() }),
}));

describe('PanelFooter', () => {
  it('renders children', () => {
    render(<PanelFooter><span>Save</span></PanelFooter>);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <PanelFooter>
        <button>Cancel</button>
        <button>Submit</button>
      </PanelFooter>,
    );
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('renders empty without children', () => {
    const { container } = render(<PanelFooter />);
    expect(container.firstChild).toBeInTheDocument();
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  it('has flex display styling', () => {
    const { container } = render(<PanelFooter />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.display).toBe('flex');
  });

  it('has column flex direction', () => {
    const { container } = render(<PanelFooter />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.flexDirection).toBe('column');
  });

  it('has full width', () => {
    const { container } = render(<PanelFooter />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe('100%');
  });

  it('has flexShrink 0 to prevent collapsing', () => {
    const { container } = render(<PanelFooter />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.flexShrink).toBe('0');
  });

  it('has a background colour set', () => {
    const { container } = render(<PanelFooter />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.backgroundColor).toBeTruthy();
  });
});
