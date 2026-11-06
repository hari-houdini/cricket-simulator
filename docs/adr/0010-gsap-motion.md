# 0010: GSAP for the lobby entry motion

Status: accepted

The lobby entry page is the first screen a guest sees, and it carries three moments of motion that a plain stylesheet cannot express cleanly. The page fades its floodlights, title and form card in on load. A successful create or join plays a dissolve before the route opens the lobby, and the route has to wait for the dissolve to finish. A panel grid lights up by distance from the pointer, which needs a value per cell on every move. Each moment must turn off under `prefers-reduced-motion`, and the panel grid must also turn off without a fine pointer.

We use GSAP, the core package only, pinned to `gsap` 3.15.1, with `@gsap/react` 2.1.2 for its `useGSAP` hook. Both are exact pins in `frontend/package.json`. The project owner approved them. GSAP is under the GSAP Standard "no charge" licence. The core is about 28.5 KB gzipped and `@gsap/react` is about 0.8 KB. Neither uses plugins: ScrollTrigger and the other plugins are not loaded.

The motion lives in `LobbyEntry.motion.ts`, a hook that the entry component calls. `gsap.matchMedia()` gates everything: one condition turns motion off under reduced motion, and another turns on the panel grid only for a fine pointer. The hook takes `contextSafe` from the return value of `useGSAP`, because `@gsap/react` 2.1.2 does not pass it to the callback.

The route after a dissolve is a plain timer, not a GSAP `onComplete`. A GSAP callback belongs to the context, and unmounting the entry reverts that context, which would cancel the redirect. A timer runs whether or not the entry is still mounted, so the lobby opens either way.

The alternatives were:

- **CSS keyframes and transitions.** They cover the intro and the reduced-motion switch. They cannot sequence the dissolve before a JavaScript route change, and they cannot set a per-cell opacity from the pointer distance on every move without writing a custom property on each move. That would be a JavaScript loop anyway, with no timeline to hold it.
- **The Web Animations API.** It handles one animation at a time and has no timeline or `overwrite` for the panel grid. We would write the sequencing and the cancellation ourselves, which `useGSAP` already does.
- **Framer Motion or Motion.** A React-first library would also work. The project owner approved GSAP for its timelines and its `matchMedia` gating, which are the two features this motion depends on.

Consequences:

- The lobby entry route adds GSAP's core, about 33 KB gzipped in the built chunk. That is under the 50 KB limit for a single dependency.
- A cold load of `/` transfers about 227 KB of JavaScript gzipped, measured in a production build. That is over the 150 KB per-page budget in `AGENTS.md`. GSAP is about a seventh of it. The rest is the Next.js, React and application code that this change did not add. The baseline before this change has not been measured, so how much of the overage predates this work is not yet known.
- Motion for the dissolve is set on the wash and the card, which are the only layers it touches. The floodlights get `opacity` only, not `background-color`, because GSAP cannot animate StyleX variables.
- The panel grid rebuilds its cell centres on resize and reads none on move. A pointer move costs one `gsap.to` per cell, with `overwrite: "auto"`.
