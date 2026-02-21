import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'horizontal' | 'vertical';
}

const PRODUCT_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Chatr';

export default function Logo({ size = 'md', variant = 'horizontal' }: LogoProps) {
  const sizes = {
    sm: { width: 120, height: 40 },
    md: { width: 180, height: 60 },
    lg: { width: 240, height: 80 },
  };

  const { width, height } = sizes[size];
  const imageSrc = variant === 'vertical' ? '/images/logo-vertical.png' : '/images/logo-horizontal.png';

  return (
    <div className="flex items-center justify-center">
      <Image
        src={imageSrc}
        alt={PRODUCT_NAME}
        width={width}
        height={height}
        className="logo-image"
      />
    </div>
  );
}

