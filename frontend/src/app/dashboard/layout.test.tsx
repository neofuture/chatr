import { render } from '@testing-library/react';
import Layout from './layout';

describe('DashboardLayout', () => {
  it('renders children', () => {
    const { getByText } = render(<Layout><span>dashboard child</span></Layout>);
    expect(getByText('dashboard child')).toBeInTheDocument();
  });
});
