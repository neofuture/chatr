import { render } from '@testing-library/react';
import Layout from './layout';

describe('PricingLayout', () => {
  it('renders children', () => {
    const { getByText } = render(<Layout><span>pricing child</span></Layout>);
    expect(getByText('pricing child')).toBeInTheDocument();
  });

  it('includes FAQ JSON-LD structured data', () => {
    const { container } = render(<Layout><span>pricing child</span></Layout>);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();
    const data = JSON.parse(script!.innerHTML);
    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity.length).toBeGreaterThan(0);
  });
});
