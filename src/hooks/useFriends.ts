/**
 * Compatibility re-export: useFriends moved to src/features/friends/hooks/useFriends.ts
 * (owned by C-friends). Kept here because src/app/profile/ProfileClient.tsx (owned by
 * a different agent) still imports from this path. See .refactor/SAPMALAR.md.
 */
export { useFriends, default } from '@/features/friends/hooks/useFriends';
