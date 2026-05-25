'use client';

import { useEffect, useState, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

/** Renders children only after mount — avoids SSR/client HTML drift for browser-only UI. */
export function ClientOnly({ children, fallback = null }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return fallback;
  return children;
}
