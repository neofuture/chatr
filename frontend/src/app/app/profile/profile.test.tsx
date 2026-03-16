import { render } from '@testing-library/react';

jest.mock('@/components/settings/MyProfilePanel', () => ({ __esModule: true, default: () => <div data-testid="my-profile-panel" /> }));

import ProfilePage from './page';

describe('ProfilePage', () => {
  it('renders without crashing', () => {
    render(<ProfilePage />);
    expect(document.body).toBeTruthy();
  });

  it('renders the MyProfilePanel component', () => {
    const { getByTestId } = render(<ProfilePage />);
    expect(getByTestId('my-profile-panel')).toBeInTheDocument();
  });
});
