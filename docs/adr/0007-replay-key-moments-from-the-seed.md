# 0007: Replay key moments from the seed

Status: accepted

A playoff match's match log (its key moments, from the toss to the result) is not stored. It is regenerated on each read by replaying the match from its seed, with the starting XIs the match was played with. This relies on [ADR 0003](0003-seeded-deterministic-simulation.md) and extends [ADR 0006](0006-match-summaries-not-balls.md), which says ball-level events must come from play rather than from storage.

The alternatives were:

- **Store the event list when the match is played.** This is the simplest read, and it fits ADR 0006's "produced as the match is played" rule. It adds a list of a few dozen events per playoff match to the lobby's single stored value. That is small, but it is a second copy of data the seed already determines, and it has to be kept in step with the simulator by hand.
- **Store the balls.** ADR 0006 rejected this for league size, and a playoff match alone would be about 240 balls.

Replay keeps the stored state as small as ADR 0006 intends. It also makes the log a pure function of the seed, the XIs and the simulator config, which the tests check.

Two things make the replay faithful:

- **The XI at the time of each match.** A free substitution can be made during the playoffs, which changes the XI for later matches. The lobby rebuilds each playoff match's sides by undoing the owner's substitutions made after it, using the substitution history. A test plays a match, makes a swap, and checks that the replayed earlier match equals the stored result.
- **The catchers.** A catch is drawn from its own seeded stream, so a replay names the same fielder the scorecard counts. The catch draws are shared by the scorecard and the replay, so they cannot disagree.

**Trade-off:** a replay is only faithful while the simulator config is the same. Changing the modifier weights would change old playoff logs, and a change to the config is a change to the season's rules. It must come with a new seed version, as ADR 0006 already requires.

**Consequence:** every read of a playoff result replays up to four matches. That is about a thousand deliveries of work, which is cheap. A match log that is read often could be cached, but the cache must be keyed by lobby and match, not stored in the lobby.
