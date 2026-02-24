import type { CSSProperties, ReactNode } from 'react';

interface LinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  [key: string]: unknown;
}

export default function NextLink({ href, children, className, style, ...rest }: LinkProps) {
  return <a href={href} className={className} style={style} {...rest}>{children}</a>;
}
