import { render } from '@testing-library/react';
import Layout from './layout';

describe('ContactLayout', () => {
  it('renders children', () => {
    const { getByText } = render(<Layout><span>contact child</span></Layout>);
    expect(getByText('contact child')).toBeInTheDocument();
  });
});
