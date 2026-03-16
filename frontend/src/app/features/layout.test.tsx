import { render } from '@testing-library/react';
import Layout from './layout';

describe('FeaturesLayout', () => {
  it('renders children', () => {
    const { getByText } = render(<Layout><span>features child</span></Layout>);
    expect(getByText('features child')).toBeInTheDocument();
  });
});
