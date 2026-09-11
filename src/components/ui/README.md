# `components/ui/` — design-system primitives

New, typed primitives that reproduce the CURRENT neon look (colors/glows
from `docs/theme.md` and the recurring inline-style patterns below). Phase C
migrates existing pages to these; nothing here modifies existing pages.

Shared color tokens live in `colors.ts` (`NeonColor` = emerald/sky/pink/red/
amber/purple/orange/neutral, matching `docs/theme.md`'s palette). Because
each color needs its own hex + rgba glow, and Tailwind v4 can't generate
those combinations from dynamic class names, structural styling (padding,
radius, flex, transitions) uses Tailwind classes while color/glow/hover
states use small inline-style blocks — the same technique already used
throughout the app (see e.g. `src/app/friends/FriendsClient.tsx:386-409`).

| Component | Purpose | Replaces / based on |
|---|---|---|
| `Button` | Neon outline/solid/ghost button, sizes, `loading`, `icon`, ref-forwarding | `src/app/friends/FriendsClient.tsx:386` sign-in button, `src/components/common/AuthModal.tsx` submit button |
| `IconButton` | Round icon-only neon button | `src/app/friends/FriendsClient.tsx:266` back button, `:464` copy-tag button |
| `Card` (alias `Panel`) | Dark gradient bordered panel | `src/app/friends/FriendsClient.tsx:418` search panel gradient |
| `Modal` | Portal-based fixed overlay, ESC + backdrop close, title/footer slots | `src/components/common/AuthModal.tsx` backdrop/dialog structure |
| `Input` / `TextArea` / `Select` | Labeled form fields with error slot | `src/app/friends/FriendsClient.tsx` search input (~line 500s) |
| `Badge` (alias `Pill`) | Small neon chip | `src/app/profile/ProfileClient.tsx:767` `borderRadius: '999px'` pill |
| `Tabs` | Controlled segmented tab bar | section switches in Friends/Leaderboard/Profile clients |
| `Spinner` | Neon ring loading indicator | `@keyframes spin` in `src/app/globals.css:55` |
| `EmptyState` | Centered icon + title/description + action | `src/app/friends/FriendsClient.tsx:382`, `src/app/leaderboard/LeaderboardClient.tsx:423,468` |
| `Avatar` | Circular image or initials avatar | `borderRadius: '50%'` avatars in Friends/Profile/Leaderboard clients, `src/app/page.tsx:255` |
| `PageShell` | Full-height page wrapper + centered max-width column + optional header slot | repeated top-level wrapper in Friends/Profile/Leaderboard/Donate clients |

Import via the barrel: `import { Button, Card, Modal } from '@/components/ui';`

Not created (pattern appeared <3 times or is engine-specific, not a design-system concern): tooltips, dropdown menus, toasts (already handled by the existing `toast-animate-in/out` CSS + a dedicated toast system, out of scope here).
