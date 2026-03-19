import { render, screen, fireEvent } from '@testing-library/react';
import BurgerMenu from './BurgerMenu';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
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
    it('renders Settings button', () => {
      render(<BurgerMenu isDark={true} />);
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('navigates to /app/settings when Settings is clicked', () => {
      mockPush.mockClear();
      render(<BurgerMenu isDark={true} />);
      fireEvent.click(screen.getByText('Settings'));
      expect(mockPush).toHaveBeenCalledWith('/app/settings');
    });

    it('renders Logout button', () => {
      render(<BurgerMenu isDark={true} />);
      expect(screen.getByText('Logout')).toBeInTheDocument();
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
