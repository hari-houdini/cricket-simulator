# 0008: Season clock on the server

Status: accepted

The season moves on the server's clock. Each step (one league match, or one playoff match) is due one interval, 1.5 seconds, after the one before it. A request to the lobby brings the clock up to date and plays the step that has come due, so no client has to ask for the next match. The clock stands still while a substitution is open, and a request plays at most one step.

Before this, an owner's client asked for each match in turn. A season only moved while an owner had the sim open, and a blocked step showed its error only on that owner's screen.

The alternatives were:

- **An owner's client drives the sim.** Every match needs an owner's tab open. With two owners both clients ask at once, so the server has to refuse or merge duplicate steps. A closed tab stops the season.
- **A Durable Object alarm plays the steps.** The season would then move with nobody watching, which the design does not need. Each step would also wake the object and write the lobby, even when no one reads it. The auction already uses an alarm, so this would be a second timer to keep in step. It is a reasonable follow-up if the season should run unattended.
- **Catch up every overdue step on each read.** A read after a long gap would play many matches in one request. That is a burst of work and a long, unpaced response. Playing at most one step per read keeps each request cheap and the pace even.

The clock is kept in the lobby as two times: when the next step is due, and when the current pause began. A pause that ends moves the next step on by its length, so a substitution does not cost the sim its place.

**Trade-off:** the season moves only while the lobby is read. The lobby screen re-reads the lobby once a second through the season, so the season keeps moving while any guest has the lobby open. If nobody reads the lobby, nothing is played, and a guest who returns after a long gap sees one step catch up each time they read.

**Consequences:**

- A step blocked by an owner with no legal XI stays due. Reads still succeed, but the season does not move until the owner saves a legal XI. Nothing tells the owner why the sim has stopped. This is a known gap, and the fix is to report the blocked owner in the lobby view.
- A skip vote that passes is applied in the request that passes it, so the rest of the league plays at once rather than one match per interval.
- The clock takes the time of each request as an argument, so the core and the mock API can be tested with a fake clock.
- The mock API keeps the same clock as the server, so its tests advance a fake clock rather than calling a round-advance operation. The round-advance route is removed.
