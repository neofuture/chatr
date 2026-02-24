import type { CSSProperties } from 'react';

interface ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
  fill?: boolean;
  priority?: boolean;
  [key: string]: unknown;
}

// Use a named function declaration (not const) to avoid Vite TDZ circular dep error
export default function NextImage({ src, alt, width, height, className, style, fill }: ImageProps) {
  const s: CSSProperties = fill
    ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', ...style }
    : style ?? {};
  return <img src={src} alt={alt} width={width} height={height} className={className} style={s} />;
}
