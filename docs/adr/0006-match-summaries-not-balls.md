# 0006: Store match summaries, not balls

Status: accepted

A finished match keeps its innings totals, player performances, fall of wickets and fair-play rating. It does not keep the ball-by-ball record. The whole lobby is stored as one JSON value in its Durable Object, and a full season of balls would push that value toward the 2 MiB limit.

The alternative was to store every ball and serve the live-event stream from storage. That gives a complete replay in the lobby's own state, but a season is about 74 matches of around 240 balls each, and the value would grow with every ball played. Summaries keep a full season well under the limit and are all the awards, standings and match-score views need.

The ball record is not lost. [ADR 0003](0003-seeded-deterministic-simulation.md) makes the simulator a function of the lobby ID, the match ID and the simulator config, so any match can be replayed to its balls on demand. The trade-off is that a replay is only faithful while the simulator config is the same. Changing the modifier weights would change old results when replayed, so a change to the config is a change to the season's rules and must come with a new seed version, not an edit in place.

Ball-level live events (ARCHITECTURE section 4) therefore have to be produced as the match is played, and not read back from storage later.
