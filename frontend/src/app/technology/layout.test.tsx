import { render } from '@testing-library/react';
import Layout from './layout';

describe('TechnologyLayout', () => {
  it('renders children', () => {
    const { getByText } = render(<Layout><span>technology child</span></Layout>);
    expect(getByText('technology child')).toBeInTheDocument();
  });
});
