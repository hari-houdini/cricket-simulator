# 0009: Stacked toasts for notices, using Sonner

Status: accepted

Errors and confirmations were banners and inline toasts in the page flow. A banner inserted above the content pushed everything down when it appeared, and pushed it back up when it cleared. A guest placing a bid could see the controls move under the cursor, which is the layout shift that `AGENTS.md` sets a CLS target against.

Notices now go to one fixed region. `Notifier` mounts it once in the app providers, and Sonner owns the region: it stacks notices, keeps the region `position: fixed` so it takes no space in the layout, and provides the `aria-live` container. Each notice is rendered by our own `Toast` component, so the tone, its `role`, and its StyleX styling stay in one place.

The policy follows the lifetime of each problem:

- A refused action (a bid, a join, a franchise claim, a start, a substitution, a skip vote) is a transient error notice. It clears after 4 seconds.
- A failed read while the screen already shows data is a persistent notice. It stays until the next read succeeds, as `docs/ui/design-system.md` requires for a dropped connection.
- A failed read before there is any data shows an in-place empty state. There is no content for a notice to sit beside, and the empty state does not move the page.

Sonner is MIT-licensed, has no runtime dependencies, is about 9 KB gzipped, and supports React 19. Stacking and the live region are the parts that are hard to get right, so the library carries them.

The alternatives were:

- **Base UI Toast (`@base-ui/react`).** It is headless, so it fits StyleX without overriding styles. It adds about five transitive dependencies (`@base-ui/utils`, `@floating-ui/react-dom`, `use-sync-external-store`, `@babel/runtime`, and an optional `date-fns` peer), and each would need review under `AGENTS.md`.
- **A custom region on our `Toast` component.** It adds no dependency, but we would own the stacking, the queue, the timers, and the live-region behaviour.

Consequences:

- Sonner injects its own stylesheet when its module loads. The CSP already allows inline styles (`style-src 'unsafe-inline'`), so the CSP needed no change.
- Notices render through `toast.custom`, so Sonner's default card styling is not used. Our `Toast` sets the role: `alert` for errors, `status` for the rest.
- The region is top-centred at every width. A notice can briefly cover the header.
- A connection notice uses the `error` tone, which is red. This replaces the amber banner in `docs/ui/design-system.md`, because the error tone is the one announced as an alert. Changing its colour back to amber would mean a second tone with an alert role, which the current `Toast` does not offer.
