import { render } from '@testing-library/react';
import Layout from './layout';

describe('WidgetLayout', () => {
  it('renders children', () => {
    const { getByText } = render(<Layout><span>widget child</span></Layout>);
    expect(getByText('widget child')).toBeInTheDocument();
  });
});
