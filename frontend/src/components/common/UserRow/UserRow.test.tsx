import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserRow from './UserRow';

jest.mock('@/components/PresenceAvatar/PresenceAvatar', () => ({
  __esModule: true,
  default: () => <div data-testid="presence-avatar" />,
}));

describe('UserRow', () => {
  const baseProps = {
    profileImage: null,
    displayName: 'Alice Smith',
  };

  it('renders display name', () => {
    render(<UserRow {...baseProps} />);
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<UserRow {...baseProps} subtitle="@alice" />);
    expect(screen.getByText('@alice')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    const { container } = render(<UserRow {...baseProps} />);
    expect(container.querySelector('[class*="subtitle"]')).not.toBeInTheDocument();
  });

  it('renders presence avatar', () => {
    render(<UserRow {...baseProps} />);
    expect(screen.getByTestId('presence-avatar')).toBeInTheDocument();
  });

  it('shows Friend badge when isFriend is true', () => {
    render(<UserRow {...baseProps} isFriend />);
    expect(screen.getByText('Friend')).toBeInTheDocument();
  });

  it('does not show Friend badge when isFriend is false', () => {
    render(<UserRow {...baseProps} isFriend={false} />);
    expect(screen.queryByText('Friend')).not.toBeInTheDocument();
  });

  it('does not show Friend badge by default', () => {
    render(<UserRow {...baseProps} />);
    expect(screen.queryByText('Friend')).not.toBeInTheDocument();
  });

  it('renders custom badges', () => {
    render(<UserRow {...baseProps} badges={<span>Pending</span>} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders actions slot', () => {
    render(
      <UserRow
        {...baseProps}
        actions={<button>Remove</button>}
      />
    );
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });

  it('does not render actions container when no actions provided', () => {
    const { container } = render(<UserRow {...baseProps} />);
    expect(container.querySelector('[class*="actions"]')).not.toBeInTheDocument();
  });

  it('renders as a button when onClick is provided', () => {
    render(<UserRow {...baseProps} onClick={() => {}} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders as a div when onClick is not provided', () => {
    render(<UserRow {...baseProps} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = jest.fn();
    const user = userEvent.setup();
    render(<UserRow {...baseProps} onClick={onClick} />);

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders Friend badge alongside custom badges', () => {
    render(
      <UserRow
        {...baseProps}
        isFriend
        badges={<span>VIP</span>}
      />
    );
    expect(screen.getByText('Friend')).toBeInTheDocument();
    expect(screen.getByText('VIP')).toBeInTheDocument();
  });
});
