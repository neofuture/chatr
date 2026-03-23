import { fn } from '@storybook/test';

const prefetchFn = fn().mockReturnValue(Promise.resolve());
const pushFn = fn();
const replaceFn = fn();
const backFn = fn();
const forwardFn = fn();
const refreshFn = fn();

export function useRouter() {
  return { push: pushFn, replace: replaceFn, back: backFn, forward: forwardFn, refresh: refreshFn, prefetch: prefetchFn };
}
export function usePathname() { return '/'; }
export function useSearchParams() { return new URLSearchParams(); }
export function useParams() { return {}; }
export const redirect = fn();
export const notFound = fn();

