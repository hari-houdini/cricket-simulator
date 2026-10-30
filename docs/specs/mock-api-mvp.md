# Spec: Frontend MVP on a mock API layer (no Rust backend)

## Context

When this spec was written the backend (`backend/`) was empty. The frontend (`frontend/`) then still shipped the Next.js starter page, but it had shared UI primitives (Button, Card, Input, Modal, Toast, Badge, Skeleton, EmptyState, ErrorBanner) and a validated list of the 10 franchises (`shared/const/teams.const.ts`). The goal is to build the playable MVP screens in phases against a mock API layer, so the game flow can be exercised end to end before the Rust service exists. A single switch points the frontend at either the mock or the real Rust API, and the same mock can drive workflow tests.

## Problem Statement

We cannot build, test or demo the IPL fantasy game's flow (create lobby → claim franchise → live auction → squad and XI → league → playoffs → awards) because no API exists. Building UI against an undefined backend risks rework when the Rust service lands.

## Solution

Define the API contract once as zod schemas. Implement a game API client interface with two implementations: a mock that produces realistic, deterministic lobby data, and an HTTP client for the Rust API. An environment switch selects one. Components and hooks depend only on the interface, so switching to real data is a configuration change. The mock is also the fixture source for workflow tests.

## Mock data generation (decision)

`zocker` is not recommended. It was last published 2025-08-27 and pulls in `@faker-js/faker` plus `randexp`. Candidates checked on npm:

| Option | Status | Fit |
|---|---|---|
| `zocker` 3.0.0 | Last publish 2025-08-27; faker runtime dep | Fails the 6-month rule and the size budget if shipped to the browser |
| `@anatine/zod-mock` 3.14.0 | Last publish 2025-04; peer `zod ^3.21.4` | Does not declare zod 4 support |
| `zod-fixture` 2.5.2 | Last publish 2024-03; peer `zod >=3.0.0` | Zod 4 support unverified; stale |
| `json-schema-faker` 0.6.3 | Last publish 2026-08; MIT; no listed deps | Fresh. Needs zod→JSON Schema, which zod 4 provides as `z.toJSONSchema` |
| Seeded generator over zod's schema introspection (in-house) | No dependency | Deterministic by construction, reuses the seeded RNG from ADR 0003 |

**Recommendation: in-house seeded generator** over the zod schemas. It adds no dependency, so no AGENTS.md approval is needed, and its output is deterministic, which tests need. That path needs the AGENTS.md approval checks.

## Seam

One seam for the whole iteration: the **game API client interface** in `services/`.

- `mock` implementation: in-memory, seeded, used for development, Storybook, and workflow tests.
- `http` implementation: calls the Rust API in `ARCHITECTURE.md`. Built (`services/game-api/http-game-api.ts`), and it calls the Rust API in `backend/`. Its refusals become the same typed errors as the mock's, and its responses are checked against the same zod schemas.
- Switch: `NEXT_PUBLIC_API_MODE` set to `mock` or `http`, default `mock`. `http` also needs `NEXT_PUBLIC_API_URL`, the Worker's origin, which is also added to the CSP `connect-src`.

Components and hooks import the interface, never the mock. Contract tests call the interface, so the same suite runs against the HTTP client once the Rust service exists.

## User Stories

Guest
1. As a guest, I want to open the app without an account, so that I can start playing immediately.
2. As a guest, I want my guest ID kept in the browser, so that a refresh keeps my franchise.
3. As a guest, I want to see a clear message when my browser storage was cleared, so that I know my franchise is lost.

Lobby
4. As a guest, I want to create a lobby, so that I can start a season with friends.
5. As a lobby creator, I want to see a shareable lobby code and link, so that I can invite others.
6. As a guest, I want to join a lobby by entering its code, so that I can play with others.
7. As a guest, I want to open a lobby from a shared URL, so that I can join without typing the code.
8. As a guest, I want a clear error when a lobby code does not exist, so that I know to check it.
9. As a guest, I want to see who is in the lobby and which franchises are taken, so that I can choose a free one.
10. As a guest, I want to see the lobby phase (auction, league, playoffs, complete), so that I know where the season is.

Franchise
11. As a guest, I want to pick one of the 10 franchises, so that I own it for the season.
12. As a guest, I want taken franchises shown as unavailable, so that I cannot pick them.
13. As an owner, I want to see my franchise's name, abbreviation and colour, so that the lobby feels like my team.
14. As a guest, I want unowned franchises filled by system squads, so that every season has all 10 franchises.

Auction
15. As an owner, I want to see the player currently up for auction with role, base price and trouble rating, so that I can decide whether to bid.
16. As an owner, I want a countdown of 5 seconds that resets on every bid, so that bidding feels live.
17. As an owner, I want to bid using increment buttons only, so that I cannot enter an invalid amount.
18. As an owner, I want the bid increment to follow the current bid (₹10L below ₹1cr, ₹50L from ₹1cr to ₹5cr, ₹1cr above ₹5cr), so that steps match the rules.
19. As an owner, I want to see the bid log with who bid what, so that I can follow the auction.
20. As an owner, I want to see my remaining purse at all times, so that I do not overbid.
21. As an owner, I want a bid I cannot afford to be disabled, so that I cannot commit money I do not have.
22. As an owner, I want the player to go to the highest bidder when the timer ends (hammer), so that the auction closes fairly.
23. As an owner, I want a player with no bids to move to the unsold pool, so that the auction keeps moving.
24. As an owner, I want to see my squad count out of 15 during the auction, so that I know how many players I still need.
25. As an owner, I want a toast when I am outbid, so that I notice quickly.
26. As a guest, I want to see auction progress (sold, unsold, remaining), so that I know how long it will take.

Squad and starting XI
27. As an owner, I want to see my 15-player squad after the auction, so that I can review it.
28. As an owner, I want to pick 11 of my 15 players as the starting XI, so that I can field a team.
29. As an owner, I want the XI to require exactly one wicket-keeper, so that the rule is enforced.
30. As an owner, I want the XI to require at least 4 bowling options, so that the rule is enforced.
31. As an owner, I want to name a captain (1.5x) and vice-captain (1.25x) from the XI, so that multipliers apply.
32. As an owner, I want invalid XI selections to show the reason, so that I can fix them.
33. As an owner, I want the XI to lock after the first match, so that the rule is visible and enforced.
34. As an owner, I want one free substitution per season after the first match, so that I can recover from injuries.

League
35. As a guest, I want to see the full 70-match league schedule in round order, so that I know what is coming.
36. As a guest, I want to advance to the next round, so that matches are played in order.
37. As a guest, I want a league match to finish in 1–2 seconds showing score, runs, wickets and winner, so that the pace matches the design.
38. As a guest, I want standings ordered by points then NRR, so that the table is correct.
39. As a guest, I want to sort the standings table, so that I can compare franchises.
40. As a guest, I want a win to award 2 points, a tie 1 each, and a loss 0, so that the scoring is clear.

Playoffs
41. As a guest, I want the top four to qualify for the playoffs in IPL format (Qualifier 1, Eliminator, Qualifier 2, Final), so that the knockout is right.
42. As a guest, I want playoff matches to show key moments within 5 seconds, so that I follow the drama.
43. As a guest, I want to skip to the result of a playoff match, so that I can move on.
44. As a guest, I want a playoff bracket view, so that I can see who plays whom.

Awards
45. As a guest, I want a Man of the Match for every match, so that standout performances are recognised.
46. As a guest, I want Orange Cap and Purple Cap winners with their stats, so that leaders are visible.
47. As a guest, I want Most Valuable Player by season fantasy points, so that the best owner is visible.
48. As a guest, I want Emerging Player shown with eligibility, so that the award is fair.
49. As a guest, I want Fair Play shown with each franchise's two most-lowering and two most-raising players, so that the award is understood.
50. As a guest, I want Fair Play labelled as a fantasy mechanic, not a factual claim, so that no real player is misrepresented.

Testing and workflows
51. As a developer, I want to run a full season through the mock in a test, so that I can check a workflow end to end.
52. As a developer, I want the same lobby code to produce the same season every time, so that tests assert exact outcomes.
53. As a developer, I want the API switch to select mock or HTTP without code changes, so that the move to the Rust backend is a config change.

Accessibility and layout
54. As a keyboard user, I want every control reachable with a visible focus indicator, so that I can play without a mouse.
55. As a screen-reader user, I want live auction bids and timer changes announced where it matters, so that I follow the auction.
56. As a mobile user, I want every screen usable at 320px width, so that the game works on a phone.
57. As a guest, I want loading states with skeletons and error states with a banner, so that I know what is happening.
58. As a guest, I want a skip link and landmarks on each page, so that I can navigate quickly.

## Implementation Decisions

**Architecture**
- A **game API client** interface in `services/`. It exposes the operations the UI needs: create lobby, get lobby, join lobby, claim franchise, place bid, submit squad, set starting XI and captain, advance round, get match, get standings, get awards. Names follow the glossary.
- Two implementations: `mock` and `http` (the client for the Rust API). A contract suite (`game-api.contract.test.ts`) runs the same scenarios against both, with the backend running when `API_CONTRACT_URL` is set.
- The switch is one environment variable read through `process.env`. Default is `mock`.
- Mock state lives in memory per page load. The guest ID is stored in `localStorage`, with reads and writes wrapped in try/catch. Refreshing loses lobby state, which is accepted for the mock.
- The mock delivers events through the same subscription shape the WebSocket will use (`auction_bid`, `auction_hammer`, `match_started`, `key_moment`, `match_complete`, `season_complete`), so hooks do not change later.

**Mock data**
- A seeded generator in-house, driven by the zod schemas. The seed comes from the lobby code, so the same code yields the same players, auction order, and results. This follows ADR 0003.
- Player master data is a versioned seed file in the repo, copied into each lobby at creation (as `game-design.md` §10 describes).

**Contract (schemas)**
- Request and response shapes are zod schemas in `*.schema.ts`. Types are derived with `z.infer` in `*.types.ts`.
- Schemas cover: Player, Franchise (the existing `team.schema.ts` extends to this), Squad, Lobby, Owner, Bid, Auction state, Match (score level; the innings summary is not in the frontend contract yet), Standings row, Awards, Fair Play rating.
- Money is stored as integer lakhs so floats never enter the rules. Format to ₹cr only at render time.

**Rules in shared utils (pure, no I/O)**
- Bid increment by current bid band.
- Purse check: a bid is valid only if it does not exceed the purse remaining.
- Squad validation: 15 drafted; XI of 11; exactly one wicket-keeper; at least 4 bowling options (bowlers and all-rounders, as `game-design.md` section 4 says); captain and vice-captain both in the XI and distinct.
- Standings order: points descending, then NRR descending.
- Man of the Match tie-break: most fantasy points, then `runs + 20 × wickets`, then earlier batting position.
- Playoff mapping: top four map to Qualifier 1, Eliminator, Qualifier 2, Final as in `game-design.md` §5.
- Fair Play: player match score = 10 − (trouble rating × random factor in [0.5, 1.5]), clamped to 0–10; team match rating = mean over the starting XI; season standing = mean over the season.

**Placeholders (shown as provisional in the UI)**
- Fantasy points formula is open (`game-design.md` §14.1). The mock uses a placeholder formula, and the UI does not present it as final.
- The Emerging Player "uncapped" definition is open (§14.2). The mock sets eligibility from seed data only.
- Pass action, purse exhaustion, and disconnects are open (§14.4–14.6). The mock auction has no pass. The Rust core already encodes these using the glossary terms (Pass, Removed owner, disconnect). That encoding is a placeholder until §14 is decided, and the glossary keeps the terms.

**Phases to MVP** (each ends with a usable, tested slice)
- Phase 0: Foundation. Replace the starter `app/page.tsx`. Add the API interface, schemas, the mock with its seeded generator, the env switch, and the app shell (`<header>`, `<nav>`, `<main>`, skip link). Pass lint and type check.
- Phase 1: Lobby and franchise. Create, join by code or URL, franchise grid with taken state, system squads for unowned franchises.
- Phase 2: Auction. Live card with timer, increments, bid log, purse, unsold pool, hammer, squad count, toasts.
- Phase 3: Squad and starting XI. Squad list, XI picker with validation, captain and vice-captain, lock after first match, one free substitution.
- Phase 4: League. Schedule (70 matches, rounds 1–14), round advance, result view with 1–2 s pacing, sortable standings.
- Phase 5: Playoffs. Bracket, key-moment view (5 s, skippable), Final.
- Phase 6: Awards. Man of the Match, Orange Cap, Purple Cap, MVP, Emerging Player, Fair Play with the two-column screen per franchise.
- Phase 7: Hardening. Responsive pass at 320/768/1024px, accessibility pass, bundle check (150 KB JS per page), LCP and CLS check.

**Components**
- Reuse the existing primitives: Button, Card, Input, Modal, Toast, Badge, Skeleton, EmptyState, ErrorBanner.
- New feature components live in their feature folder and compose within it: LobbyEntry, FranchiseGrid, AuctionCard, BidLog, PurseBar, SquadList, StartingXIPicker, Schedule, StandingsTable, MatchResult, PlayoffBracket, AwardsScreen, FairPlayScreen.

**Styling**
- StyleX only. Colours, spacing and radii come from `shared/const/tokens.stylex.ts`. Dark only.
- Franchise colours come from `teams.const.ts`. Entries marked UNVERIFIED stay placeholders and are not shipped as final branding.

**Vocabulary**
- Use GLOSSARY terms: Lobby, Guest, Owner, Franchise, Squad, Starting XI, Purse, Bid, Hammer, Unsold pool, Round, Standings, Playoffs, Qualifier 1, Eliminator, Qualifier 2, Final, Key moment, Man of the Match. Avoid "team" in the domain, "player" for guests, and "roster".

**Dependencies**
- None added. Zod, React, StyleX and Next.js are already approved. The generator is in-house.

## Testing Decisions

A good test here exercises game rules and the API contract through public interfaces. It does not assert on component internals, timer internals, or private helpers.

Modules tested:
- **Pure rule utilities** in `shared/utils/`: bid increment, purse check, squad and XI validation, standings order, MOTM tie-break, playoff mapping, Fair Play maths. Every exported function gets 100% branch coverage (AGENTS.md).
- **Schemas**: valid and invalid fixtures for each schema, including integer money and the 15/11 counts.
- **Seeded generator**: same seed gives identical output; different seeds differ.
- **API contract suite**: calls the game API interface and asserts behaviour (create, join, bid, hammer, schedule has 70 matches, standings after a round). Written to run against the HTTP client later.
- **Workflow test**: one full season through the mock, from lobby creation to awards, with exact expected results for a fixed seed.
- **Feature components**: Storybook stories for each screen state (empty, loading, error, populated), run by the Storybook Vitest addon, plus the a11y addon.

Prior art: `shared/utils/` has no tests yet, so these set the pattern. Existing stories (Button, Card, Input, Modal, Toast and others) are the component-test prior art. No snapshot tests (AGENTS.md).

## Out of Scope

- The balance of the real match simulator. The mock does not claim its outcomes match the Rust simulator's. The Rust backend, its Workers and Durable Objects are built separately (`ARCHITECTURE.md`).
- Auction, squad, league and playoff scenarios over HTTP. A full auction takes hundreds of timed lots, so the contract suite covers the lobby, auction-open and refusal paths over HTTP. The post-auction behaviour is covered by the mock tests, the Rust tests and the shared fixtures.
- Real WebSocket transport. The mock delivers events.
- Authentication and accounts. Guests only.
- PWA, offline support, service worker, install prompt (post-MVP, `game-design.md` §13).
- Analytics.
- The open items in `game-design.md` §14: final fantasy points formula, uncapped definition, Emerging Player age, pass action, purse exhaustion, disconnects.
- Custom franchise naming, invite-only lobbies, replay, leaderboards, player statistics, live commentary.
- Persisting lobby state across refreshes (beyond the guest ID).
- Final franchise brand colours (the UNVERIFIED entries).
- Visual regression (Chromatic) setup.

## Further Notes

- **Where this spec lives.** The issue tracker is not configured (`docs/agents/` is missing). On approval, save this spec to `docs/specs/mock-api-mvp.md` in the repo. Running `/setup-matt-pocock-skills` later can move it to a tracker.
- **Labels.** Publishing to a tracker would apply `ready-for-agent`. Repo-file publishing has no label.
- **Mock fidelity.** Mock results exist to test UI flow, not to validate balance. Balance and the fantasy points formula are separate work.
- **Migration path.** When the Rust API lands, the HTTP client implements the same interface, the API contract suite runs against it, and the switch flips. Components should not change.
- **Commit style.** Conventional Commits with scope `frontend`, e.g. `feat(frontend): add mock game API client`.
- **Bundle budget exception (Phase 7, #8).** The 150 KB gzipped JS-per-page target in AGENTS.md is below the Next 16 and React 19 framework floor. A bare page with no app code is about 175 KB gzipped. The home page measured 216 KB and the lobby page 235 KB, with the mock API already lazy-loaded. Phase 7 records this as an accepted exception rather than a waiver. Measured with `gzip -9` over each prerendered route's initial JS chunks. Reducing app-side JS (for example, moving zod off the client path, about 36 KB gzipped) is a separate follow-up.
