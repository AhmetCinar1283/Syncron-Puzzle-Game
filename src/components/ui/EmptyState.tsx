import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { MascotBuddy, type MascotBuddyProps } from './MascotBuddy';

export interface EmptyStateProps {
  icon?: ReactNode;
  /** İkon yerine küçük bir maskot göster (varsayılan ayarlar için `true`). */
  mascot?: boolean | MascotBuddyProps;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Centered icon + message block repeated for "no data" states, e.g.
 * `src/app/friends/FriendsClient.tsx:382`, `src/app/leaderboard/LeaderboardClient.tsx:423,468`.
 */
export function EmptyState({ icon, mascot, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-10 px-4', className)}>
      {mascot && <MascotBuddy size={64} className="mb-3" {...(mascot === true ? {} : mascot)} />}
      {!mascot && icon && <div className="text-5xl mb-4 leading-none">{icon}</div>}
      {title && <p className="text-sm font-bold text-slate-200 mb-1">{title}</p>}
      {description && <p className="text-sm text-slate-400 mb-6 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}
