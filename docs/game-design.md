# IPL Cricket Simulator - Game Design Document

Vocabulary is defined in [`GLOSSARY.md`](../GLOSSARY.md). Architectural decisions are in [`docs/adr/`](adr/). This document states the rules.

## 1. Overview

An **IPL T20 fantasy cricket game**. Guests join a lobby, each owns one IPL franchise, the owners bid for players in a live auction, and the lobby then plays a full simulated IPL season: a 14-match league and a four-match playoff.

- **Format**: IPL T20, 20 overs per innings
- **Players**: Guest-based, multiplayer lobbies (up to 10 owners)
- **Platform**: Web, mobile-first and responsive (Next.js on Vercel)
- **Styling**: StyleX, dark theme

## 2. Lobby and Franchises

- A lobby plays exactly one season. A new season means a new lobby.
- Each owner holds one of the 10 IPL franchises (CSK, MI, RCB, KKR, DC, PBKS, RR, SRH, LSG, GT). A franchise has at most one owner.
- Franchises with no owner are filled by **system squads**, so every season has all 10 teams.
- Joining is by lobby code or shared URL, e.g. `38-0.app?lobby=abc123`. Guests need no account. Each browser keeps a random guest ID, so a refresh keeps the same franchise. Clearing browser storage loses it.

## 3. Auction

- Players come up one at a time in a fixed order, derived from the lobby seed.
- Each owner has a **purse of ₹100cr** for the whole draft. Unspent money is not carried forward.
- Each player has a countdown **timer of 5 seconds**. Every bid resets it. When it reaches zero, the highest bidder wins the player (the hammer).
- If no one reads the auction while a timer runs out, the hammer still falls at its true time. The next lot then opens at the moment it is read, so an idle gap does not sell the whole pool at once.
- **Bid increments** depend on the current bid:
  - Below ₹1cr: steps of ₹10L
  - ₹1cr to ₹5cr: steps of ₹50L
  - Above ₹5cr: steps of ₹1cr
- Bids are made with increment buttons only. There is no manual amount entry.
- A player who receives no bid goes to the **unsold pool** and is not auctioned again.
- Each owner drafts a **squad of 15 players**.

## 4. Squad and Starting XI

- A squad has **15 players**. The **starting XI** is 11 of them.
- The starting XI must include **exactly one wicket-keeper** and at least **4 bowling options** (bowlers and all-rounders). No other role minimums apply.
- **Captain** earns fantasy points at **1.5x**. **Vice-captain** earns them at **1.25x**.
- The starting XI **locks after the first match**. An owner who has saved no XI when the first round is played gets the strongest legal XI from their squad, which is stored and locked with the rest. A squad with no legal XI blocks the round (see Open Items).
- Each owner gets **one free substitution per season**: one starting-XI player swapped for a squad player outside the XI. The swap is offered only after the first match.
- The **captain and vice-captain cannot be substituted out**. Leadership stays with the same players for the whole season.
- The swap can be made at any point once the first match has been played. Opening it pauses the sim for every owner until it is confirmed or cancelled. Cancelling does not use it up.

## 5. Season Structure

- **League**: 10 franchises, double round-robin, 14 matches per franchise, 70 matches in total. Rounds 1–14.
- **Points**: win 2, loss 0, tie 1 each.
- **Standings**: by points, with net run rate (NRR) as the tie-break.
- **Playoffs** follow the IPL format. Playoff matches cannot tie: a level match is settled by a **super over**. Rounds 15–18:
  1. **Qualifier 1**: 1st vs 2nd. The winner goes to the Final.
  2. **Eliminator**: 3rd vs 4th. The loser is out.
  3. **Qualifier 2**: the loser of Qualifier 1 vs the winner of the Eliminator. The winner goes to the Final.
  4. **Final**: the winner of Qualifier 1 vs the winner of Qualifier 2.
- The season has **18 rounds** in total.

## 6. Match Simulation

- Matches are **seeded and deterministic**: the seed comes from lobby ID and match ID, so every guest sees the same result ([ADR 0003](adr/0003-seeded-deterministic-simulation.md)).
- **League matches** run in 1–2 seconds and show the final score, runs, wickets and winner.
- **Pace**: the season moves on one shared clock, a match every 1.5 seconds. It moves while any guest has the lobby open, and it holds while a free substitution is open for everyone ([ADR 0008](adr/0008-season-clock.md)).
- **Playoff matches** run within **5 seconds** and show a **match log** of key moments only: the toss, each innings' openers, wickets with the bowler, batter and any catcher, 30, 50 and 100 milestones, partnership milestones, 4-wicket hauls, the final over, each innings' total and the result. Both innings are covered, and a super over is logged as its own innings. Guests can skip to the result at any time. A match log is replayed from the match's seed ([ADR 0007](adr/0007-replay-key-moments-from-the-seed.md)).

### 6.1 Ball outcome model (engine parameters)

| Outcome | Probability |
|---------|-------------|
| Normal delivery (dot, single, double, triple) | ~70% |
| Boundary (4 or 6) | ~20% |
| Dot ball | ~5% |
| Wicket | ~5% |

Modifiers: batter vs bowler ratings, powerplay vs death overs, chasing vs defending.

Wicket types: caught ~60%, LBW ~15%, bowled ~5%, run-out ~10%, other ~10%.

## 7. Fantasy Points and Man of the Match

- Each player earns **fantasy points** from runs, wickets and catches. The exact formula is still to be set (see Open Items).
- The captain and vice-captain multipliers apply to those points.
- **Man of the Match** goes to the player with the most fantasy points in the match. Ties go to the player with the higher `runs + 20 × wickets`, then to the earlier batting position.

## 8. Awards

Every award screen shows the winner and runner-up, with the team each represents and the stats that earned the award.

| Award | Basis |
|-------|-------|
| **Orange Cap** | Most runs in the season. Stats shown: runs, innings, average, strike rate. |
| **Purple Cap** | Most wickets in the season, ties broken by fewer runs conceded. Stats shown: wickets, economy, average. |
| **Most Valuable Player** | Highest season fantasy points. |
| **Man of the Match** | Per match, as in section 7. |
| **Emerging Player** | See eligibility below. |
| **Fair Play** | Best season fair-play standing, from section 9. |

Batting and bowling averages are shown as stats on the relevant award screens, not as awards.

### 8.1 Emerging Player eligibility

Modelled on IPL's rules. A player is eligible if, at the start of the season:

- has played fewer than **5 Tests**, fewer than **20 ODIs** and fewer than **25 IPL matches**,
- is **uncapped** (see Open Items for the exact definition),
- is **under 20** years old.

The rule that a previous winner is ineligible is not applied in this game.

## 9. Fair Play

This is a **fantasy mechanic**, not a factual claim about any player. It is labelled that way in the UI.

- **Trouble rating**: an integer from 0 to 10. It scores documented on-field sanctions and incidents only, by governing body or reputable reporting. Public opinion is not used. The rubric is applied the same way to every player: **0** no documented on-field sanction or incident; **1–2** one minor documented breach, such as a warning or small fine; **3–4** one notable sanction, such as a fine or short ban; **5–6** several sanctions; **7–8** a serious or repeated ban; **9–10** the most serious documented record in the pool. Off-field matters do not count, and an allegation that was never upheld does not count. Sources are not recorded in the seed. A player whose record has not been verified has no entry and uses a base of **2**, so an unverified player is never treated as clean.
- **Player match score** = 10 minus (trouble rating × a seeded random factor between 0.5 and 1.5), clamped to 0–10.
- **Team match rating** = average of the starting XI's player match scores.
- **Season fair-play standing** = average of the team's match ratings.
- The **Fair Play award** goes to the franchise with the highest season standing. Ties are broken by league points, then NRR.
- Each franchise's Fair Play screen lists two columns: the **two players who pulled its rating down most** and the **two who lifted it most**, by average effect across the season.

The randomiser is seeded from lobby and match, so the outcome is the same for every guest. Guests never roll anything.

## 10. Data Shapes (summary)

```
Player    { id, name, franchise_id, role, category, retired, batting, bowling, fielding, base_price, trouble_rating }
Squad     { 15 x Player, starting_xi (11 ids), captain_id, vice_captain_id, purse_remaining, substitution_used }
Lobby     { id, code, owners: [{ guest_id, franchise, squad }], phase: 'auction' | 'league' | 'playoffs' | 'complete', round: 1-18 }
Match     { lobby_id, round, home, away, result, key_moments, man_of_the_match, fair_play_ratings }
```

Player master data is a versioned seed file in the repo. It is copied into each lobby when the lobby is created, so a season can be replayed.

## 11. Real-time Communication

WebSocket events: `auction_bid`, `auction_hammer`, `match_started`, `key_moment` (playoffs), `match_complete`, `season_complete`.

## 12. Success Criteria

Targets for the MVP. None of these are complete yet.

- Lobby creation with a shareable code
- Live auction within the purse, bid increments and timer rules above
- Full 10-franchise league in the correct order, with playoffs as in section 5
- All awards with qualifying stats, including Fair Play
- League matches run in under 2 seconds; playoff matches in under 5 seconds
- Real-time updates to all guests in a lobby
- Fully responsive (mobile, tablet, desktop)
- Deployed on free tiers (Vercel and Cloudflare)

## 13. Future Features (after MVP)

- Progressive web app: installable, offline reading of cached standings
- Push notifications for match results
- Leaderboard across lobbies
- Player statistics and career stats
- Custom franchise naming
- Invite-only private lobbies
- Match replay
- Seasonal ranking ladder
- Live commentary

## 14. Open Items

These are not yet decided. They are listed so no one assumes an answer.

1. **Fantasy points formula**: points per run, wicket, catch, and any bonuses.
2. **Uncapped**: the exact definition used for Emerging Player eligibility.
3. **Emerging Player age**: the sources disagree on the cutoff. The current rule is "under 20" as the owner wrote it.
4. **Pass action**: whether a bidder can pass without bidding, and whether a pass is a bid-skip that does not end the auction.
5. **Purse exhaustion**: what happens if an owner cannot afford the remaining players before filling 15 slots.
6. **Disconnects**: what happens to an owner who loses connection during the auction.
7. **PWA and analytics**: whether these are MVP or future. They appear in earlier drafts but are not settled.
8. **Legal squads (TODO)**: the auction does not require a wicket-keeper or four bowling options, so a squad can end with no legal starting XI. Until the auction guarantees one, an owner in that position blocks the round. The fallback default XI in `defaultStartingXi` (`shared/utils/default-xi.ts`) cannot cover this case. Decide the squad rule the auction must enforce.
