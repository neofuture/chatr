import { render, screen, fireEvent } from '@testing-library/react';
import BurgerMenu from './BurgerMenu';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// The burger toggle is always the first button rendered
const getBurgerBtn = () => screen.getAllByRole('button')[0];

// Find the slide-in drawer by its test id
const getDrawer = (container: HTMLElement) =>
  container.querySelector('[data-testid="burger-drawer"]') as HTMLElement;

describe('BurgerMenu', () => {
  describe('Rendering', () => {
    it('renders the burger button', () => {
      render(<BurgerMenu isDark={true} />);
      expect(getBurgerBtn()).toBeInTheDocument();
    });

    it('drawer is off-screen by default', () => {
      const { container } = render(<BurgerMenu isDark={true} />);
      const drawer = getDrawer(container);
      expect(drawer).toHaveStyle({ left: '-280px' });
    });

    it('drawer slides in after clicking burger button', () => {
      const { container } = render(<BurgerMenu isDark={true} />);
      fireEvent.click(getBurgerBtn());
      const drawer = getDrawer(container);
      expect(drawer).toHaveStyle({ left: '0px' });
    });

    it('closes drawer when burger button is clicked again', () => {
      const { container } = render(<BurgerMenu isDark={true} />);
      fireEvent.click(getBurgerBtn());
      const drawer = getDrawer(container);
      expect(drawer).toHaveStyle({ left: '0px' });
      fireEvent.click(getBurgerBtn());
      expect(drawer).toHaveStyle({ left: '-280px' });
    });
  });

  describe('Menu items', () => {
    it('renders navigation links', () => {
      render(<BurgerMenu isDark={true} />);
      expect(screen.getByText('Home').closest('a')).toHaveAttribute('href', '/');
      expect(screen.getByText('Read Documentation').closest('a')).toHaveAttribute('href', '/docs');
    });

    it('calls onPanelDemo when Panel Demo is clicked', () => {
      const onPanelDemo = jest.fn();
      render(<BurgerMenu isDark={true} onPanelDemo={onPanelDemo} />);
      fireEvent.click(screen.getByText('Panel Demo'));
      expect(onPanelDemo).toHaveBeenCalledTimes(1);
    });
  });

  describe('Theme', () => {
    it('renders in dark mode without crashing', () => {
      const { container } = render(<BurgerMenu isDark={true} />);
      expect(container).toBeInTheDocument();
    });

    it('renders in light mode without crashing', () => {
      const { container } = render(<BurgerMenu isDark={false} />);
      expect(container).toBeInTheDocument();
    });
  });
});
