import { render } from '@testing-library/react';
import Layout from './layout';

describe('DocsLayout', () => {
  it('renders children', () => {
    const { getByText } = render(<Layout><span>docs child</span></Layout>);
    expect(getByText('docs child')).toBeInTheDocument();
  });
});
