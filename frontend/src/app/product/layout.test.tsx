import { render } from '@testing-library/react';
import Layout from './layout';

describe('ProductLayout', () => {
  it('renders children', () => {
    const { getByText } = render(<Layout><span>product child</span></Layout>);
    expect(getByText('product child')).toBeInTheDocument();
  });
});
