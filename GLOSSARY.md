# IPL Cricket Simulator

A fantasy cricket game in which players in a lobby each own one IPL franchise, bid for players in a live auction, and follow a simulated IPL season. This glossary defines the game's vocabulary. Rules and numbers live in `docs/game-design.md`.

## Lobby and participants

**Lobby**:
A shared room in which one season is played, from the auction through to season end.
_Avoid_: Room, game, league (league means the phase, see below)

**Guest**:
A participant who joins a lobby without an account.
_Avoid_: User, player (player means a cricketer)

**Owner**:
The guest who holds one franchise in a lobby and controls its squad and purse.
_Avoid_: Manager, captain (captain means a player in the squad)

**Franchise**:
One of the 10 IPL teams (CSK, MI, RCB, KKR, DC, PBKS, RR, SRH, LSG, GT). In a lobby, each franchise has at most one owner.
_Avoid_: Team (in the UI, "team" is used loosely, so use franchise in the domain)

**System squad**:
A squad that the game fills automatically for a franchise with no owner.
_Avoid_: Bot, AI team

## Players and squads

**Player**:
A real IPL cricketer with a role, a base price and a trouble rating.
_Avoid_: Cricketer (in code), athlete

**Role**:
One of Batter, Bowler, All-rounder or Wicket-keeper.
_Avoid_: Position, type

**Category**:
An auction tier for a player: Marquee, Capped or Uncapped. A player's base price follows from its category.
_Avoid_: Tier, class

**Player pool**:
The master list of real IPL players that the auction draws from. A lobby copies the pool when it is created.
_Avoid_: Player list, database

**Squad**:
The 15 players a franchise drafts at auction.
_Avoid_: Team (see Franchise), roster

**Starting XI**:
The 11 players from a squad who play matches.
_Avoid_: Playing XI, lineup (in prose, lineup is acceptable only for the locked state)

**Captain**:
The starting-XI player whose fantasy points are multiplied by 1.5.
_Avoid_: Skipper

**Vice-captain**:
The starting-XI player whose fantasy points are multiplied by 1.25.
_Avoid_: Deputy

**Free substitution**:
A one-off swap, per season, of a starting-XI player for a squad player who is not in the starting XI.
_Avoid_: Transfer, trade

## Auction

**Auction**:
The live bidding phase in which owners bid for players in turn until all squads are drafted.
_Avoid_: Draft, pick

**Purse**:
The money an owner has left to spend in the auction. Each owner starts with ₹100cr.
_Avoid_: Budget, wallet

**Bid**:
An offer from an owner to buy the player currently up for auction.
_Avoid_: Offer, call

**Bid increment**:
The fixed step by which a bid can rise, which depends on the current bid amount.
_Avoid_: Raise, step

**Hammer**:
The moment a player goes to the highest bidder when the bidding timer runs out.
_Avoid_: Sold (in the domain, sold describes the outcome, hammer describes the event)

**Unsold pool**:
The players who received no bid in the auction. They are not auctioned again in the season.
_Avoid_: Leftovers, free agents

## Season

**Season**:
One complete run of the league and playoffs in one lobby.
_Avoid_: Tournament, edition

**League**:
The round-robin phase of 14 matches per franchise across 10 franchises, 70 matches in total.
_Avoid_: Group stage, regular season

**Round**:
One of the 18 scheduled match slots in a season: 14 league rounds and 4 playoff rounds.
_Avoid_: Week, matchday

**Points**:
League points awarded per result. A win is 2 points, a loss 0, and a tie 1 point each.
_Avoid_: Score (score means runs)

**Net run rate (NRR)**:
The tie-break measure for franchises level on points.
_Avoid_: Run rate

**Standings**:
The league table, ordered by points and then NRR.
_Avoid_: Table (in UI copy only), leaderboard

## Playoffs

**Playoffs**:
The four-match knockout stage that follows the league: Qualifier 1, Eliminator, Qualifier 2 and the Final.
_Avoid_: Knockouts, finals (when meaning the whole stage)

**Qualifier 1**:
League 1st against league 2nd. The winner goes straight to the Final.
_Avoid_: Q1 (in prose)

**Eliminator**:
League 3rd against league 4th. The loser is out.
_Avoid_: Semi-final (the IPL format has no semi-finals)

**Qualifier 2**:
The loser of Qualifier 1 against the winner of the Eliminator. The winner goes to the Final.
_Avoid_: Q2 (in prose)

**Final**:
The winner of Qualifier 1 against the winner of Qualifier 2.
_Avoid_: Championship

## Match play

**Fantasy points**:
Points a player earns from one match's performance, which the captain and vice-captain multipliers apply to.
_Avoid_: Score, rating (rating means trouble rating here)

**Key moment**:
A notable event shown during a playoff match, such as a wicket, a 50 or 100 milestone, a 4-wicket haul, the final over, or the result.
_Avoid_: Highlight, event

**Man of the Match**:
The player with the most fantasy points in a match.
_Avoid_: MoM (in UI copy only)

## Data

**Seed file**:
A versioned data file in `data/seeds/` that holds the franchises, the player pool or the league template. A lobby records the seed version it was created with, so its season can be replayed.
_Avoid_: Fixture, dump

## Fair play

**Trouble rating**:
A per-player value from 0 to 10 that sets how likely that player is to be involved in on-field trouble. It is a fantasy mechanic, not a factual claim about any player.
_Avoid_: Aggression, penalty

**Match score (fair play)**:
A player's fair-play score for a match: 10 less the player's trouble rating scaled by a random factor, clamped to 0–10.
_Avoid_: Fair-play points (points means league points)

**Match rating (fair play)**:
A franchise's fair-play score for one match: the average match score of its starting XI.
_Avoid_: Rating (on its own, rating is ambiguous)

**Season fair-play standing**:
A franchise's average match rating across the season, which ranks it for the Fair Play award.
_Avoid_: Fair-play table

## Awards

**Orange Cap**:
The batter with the most runs in the season.
_Avoid_: Most Runs (the old name)

**Purple Cap**:
The bowler with the most wickets in the season.
_Avoid_: Most Wickets (the old name)

**Most Valuable Player**:
The player with the highest season fantasy points.
_Avoid_: MVP (in UI copy only)

**Emerging Player**:
The IPL-style award for an uncapped young player with a strong season, using the eligibility limits in `docs/game-design.md`.
_Avoid_: Rookie, young player

**Fair Play award**:
The award for the franchise with the best season fair-play standing.
_Avoid_: Fairplay (one word)

**Award runner-up**:
The second-placed player or franchise for an award, shown with the same stats as the winner.
_Avoid_: Second place
