import { useState } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'horizontal' | 'vertical';
}

const PRODUCT_NAME =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_PRODUCT_NAME) ||
  'Chatr';

export default function Logo({ size = 'md', variant = 'horizontal' }: LogoProps) {
  const sizes = {
    sm: { width: 120, height: 40, fontSize: '1.25rem' },
    md: { width: 180, height: 60, fontSize: '1.75rem' },
    lg: { width: 240, height: 80, fontSize: '2.25rem' },
  };

  const [imgError, setImgError] = useState(false);
  const { width, height, fontSize } = sizes[size];
  const imageSrc = variant === 'vertical' ? '/images/logo-vertical.png' : '/images/logo-horizontal.png';

  if (imgError) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <span style={{ fontSize, fontWeight: 700, color: '#3b82f6', letterSpacing: '-0.02em' }}>
          {PRODUCT_NAME}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <img
        src={imageSrc}
        alt={PRODUCT_NAME}
        width={width}
        height={height}
        className="logo-image"
        onError={() => setImgError(true)}
      />
    </div>
  );
}
