import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface PageShellProps {
  header?: ReactNode;
  children: ReactNode;
  className?: string;
  maxWidth?: string;
}

/**
 * Full-height dark page wrapper + centered content column repeated at the
 * top of `FriendsClient.tsx`, `ProfileClient.tsx`, `LeaderboardClient.tsx`,
 * `DonateClient.tsx` (back-button header + `max-w-*` container over the
 * `#030712` background already set on `body` in `globals.css`).
 */
export function PageShell({ header, children, className, maxWidth = 'max-w-2xl' }: PageShellProps) {
  return (
    <div className="relative z-1 min-h-screen w-full px-4 py-6">
      <div className={cn('mx-auto w-full', maxWidth, className)}>
        {header && <div className="mb-6">{header}</div>}
        {children}
      </div>
    </div>
  );
}
