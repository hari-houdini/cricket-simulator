# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are a friend group who join one shared lobby, each take one IPL franchise, bid for players in a live auction, and follow the season together over several sessions. The job is to build a squad under a fixed purse, name a starting XI, and watch a full season play out to the playoffs and awards.

Solo play against system squads exists in the mechanics (unowned franchises are filled automatically), but no solo audience has been confirmed.

## Product Purpose

An IPL fantasy cricket simulator. Guests each own one IPL franchise in a lobby, run a live auction for 15 players on a ₹100cr purse, name an 11-player starting XI, and then play a 10-team double round-robin league and the IPL playoff format, ending with IPL-style awards.

Success is a complete, end-to-end IPL season experience: auction, league, playoffs and awards read as one continuous season rather than separate mini-games.

## Positioning

A full end-to-end IPL simulation: the auction, the league, the playoffs and the awards all run inside one shared lobby. Rivals in the fantasy space may offer one of these parts; the claim is that the whole season, from first bid to final awards, is played in the same room.

## Operating Context

- Matches are simulated, not played live by the users. League matches resolve in about 1–2 seconds; playoff matches show key moments within about 5 seconds and can be skipped to the final score (README).
- Lobbies are shared, so several people may be looking at the same auction or season state at the same time.
- Season state is persisted by the backend between sessions (ADR 0002 and ADR 0008 in `docs/adr/`).

## Capabilities and Constraints

- Live auction for 15 players per owner, with a ₹100cr purse per franchise.
- Starting XI of 11 from the squad of 15, with exactly one wicket-keeper and at least four bowling options; captain multiplier 1.5x and vice-captain 1.25x (README).
- 10-team double round-robin, 14 matches per team; win 2 points, tie 1 point each, loss 0 (README).
- IPL playoff format: Qualifier 1, Eliminator, Qualifier 2, Final (rounds 15–18).
- Awards: Man of the Match, Orange Cap, Purple Cap, Most Valuable Player, Emerging Player, Fair Play.
- Matches are deterministic from a seed (ADR 0003), so results can be reproduced.
- Frontend is Next.js with React and StyleX; the game API is served by the Rust backend on Cloudflare Workers (`ARCHITECTURE.md`).
- Vocabulary is fixed by `GLOSSARY.md`: use "lobby", "owner", "franchise", "squad", "starting XI", not the banned synonyms listed there.
- Undecided: how real-time match viewing should look for a lobby (the mechanism is listed in the README as a planned WebSocket feature but its interface is not decided).

## Brand Commitments

- Working name: "IPL Cricket Simulator" (repository and README title). No separate brand name has been chosen.
- Franchises are shown by their names and abbreviations (CSK, MI, RCB, KKR, DC, PBKS, RR, SRH, LSG, GT) and may use their team colours.
- Franchise logos must not be used.

## Evidence on Hand

- Game rules: `README.md` and `docs/game-design.md`.
- Domain vocabulary: `GLOSSARY.md`.
- Architecture decisions: `docs/adr/`.
- Prior analysis of the reference product: `research/38-0-architecture-analysis.md` and `research/football-to-cricket-mapping.md`.
- Existing UI documentation: `docs/ui/design-system.md` and `docs/ui/wireframes-specification.md`.
- Absent, and must not be fabricated: testimonials, customer or user counts, case studies, press, benchmark numbers, pricing, licensing terms, and deployment claims.

## Product Principles

- Keep the whole season in one place. The auction, league, playoffs and awards are one story; no screen should make a season feel like separate mini-games.
- Make shared bidding legible. Every person in a lobby should understand the current bid, each purse and each squad's state at the same moment.
- Results must be explainable. Any match or award shown to users must trace back to the seeded season record, so an outcome can be replayed and checked.
- Keep matches fast by default. Simulated league matches resolve in seconds; playoff detail is available but skippable.
- Identify franchises by name, never by logo.

## Accessibility & Inclusion

The project targets WCAG 2.2 AA (`AGENTS.md`). Every interactive element is keyboard-reachable with a visible focus indicator; colour is never the only signal; body text contrast is at least 4.5:1; dynamic results are announced through live regions; pages are usable from 320px upward.
