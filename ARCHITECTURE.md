# IPL Cricket Simulator - Architecture Document

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 16+)                       │
│       Vercel CDN → Lobby | Squad | Match | Season Table         │
│    StyleX + Dark Theme | Responsive (Mobile/Tablet/Desktop)    │
│           PWA (Installable, Offline-capable)                    │
└────────────────────────┬─────────────────────────────────────────┘
                         │ HTTPS + WebSocket
         ┌───────────────┴───────────────┐
         ▼                               ▼
   ┌──────────────┐          ┌─────────────────────┐
   │ Browser      │          │  Cloudflare         │
   │ localStorage │          │  Workers (API)      │
   │              │          │                     │
   │ • UI State   │          │ • Lobby Manager     │
   │ • Cache      │          │ • Match Simulator   │
   │ • Drafts     │          │ • Season Manager    │
   └──────────────┘          │ • Awards Calculator │
                             └────────┬────────────┘
                                      │
                                      ▼
                    ┌──────────────────────────────────┐
                    │  Cloudflare Durable Objects      │
                    │  (Persistent Game State)         │
                    │  • Lobbies & Matches             │
                    │  • Standings & Awards            │
                    │  • User Squads                   │
                    └──────────────────────────────────┘
```

## Frontend Architecture (Next.js 16+)

### Technology Stack
- **Framework**: Next.js 16+ (App Router, React Server Components)
- **Language**: TypeScript for type safety
- **Styling**: StyleX (Meta's CSS-in-JS) + Dark Theme
- **Hosting**: Vercel (automatic deployments, edge functions)
- **Responsive Design**: Mobile-first (320px - 1920px+)
- **PWA**: post-MVP (see `docs/game-design.md` section 13)
- **Analytics**: Vercel Analytics (built-in, free tier)

### Responsive Breakpoints
```typescript
// Mobile: 320px - 768px (phones, small tablets)
// Tablet: 768px - 1024px (iPad-sized devices)
// Desktop: 1024px+ (laptops, large screens)
// Ultra-wide: 1920px+ (desktop monitors)
```

### State Management Strategy
**Hybrid approach for optimal performance:**

1. **Browser localStorage** (Client-side, ephemeral):
   - UI state (open modals, selected tabs, animations)
   - Draft squad selections (before submission)
   - Cached match results (for quick replay)
   - User preferences (theme, notification settings)
   - **Persistence**: UI state is session-based. The guest ID is kept in localStorage so a refresh keeps the franchise.

2. **Cloudflare Durable Objects** (Server-side, persistent):
   - Lobby state (created lobbies, active users)
   - User squads (saved for season)
   - Match results (league & playoff)
   - Season standings (league points, awards)
   - **Persistence**: Across sessions, survives refreshes

### Component Architecture
```
app/
├── page.tsx              # Home / lobby selection
├── layout.tsx            # Root layout with providers
├── lobby/
│   ├── [lobbyId]/
│   │   ├── page.tsx      # Lobby view
│   │   ├── squad/        # Squad selection flow
│   │   ├── match/        # Live match viewer
│   │   └── season/       # Season standings
│   └── create/           # Create new lobby
├── api/
│   ├── lobbies/          # Lobby CRUD
│   ├── squads/           # Squad submission
│   ├── matches/          # Match simulation
│   └── ws/               # WebSocket upgrade
└── styles/
    └── globals.tsx       # StyleX global styles
```

### PWA Features (post-MVP)
- **manifest.json**: App name, icons, theme colors
- **Service Worker**: Cache-first strategy for assets
- **Offline Support**: 
  - Read cached matches while offline
  - Queue squad submissions when connection returns
  - Display offline indicator UI
- **Installability**: 
  - "Add to Home Screen" prompt on mobile
  - Standalone window mode on iOS
  - Taskbar icon on Android

---

## Backend Architecture (Cloudflare Workers)

The backend is a Cargo workspace. `cricket-core` holds the game rules as pure Rust with no I/O. `cricket-worker` is the Worker adapter, which owns the Durable Object and the HTTP and WebSocket surface. Time and randomness enter the core as arguments. See [ADR 0005](docs/adr/0005-pure-core-with-worker-adapter.md).

Delivery is in four phases: the core, the Worker adapter, the HTTP and WebSocket API, and the frontend cut-over from the mock.

### 1. Core Services

#### Match Simulator (`match_simulator.rs`)
**Purpose**: Simulate cricket matches deterministically

**Key Functions**:
- `simulate_match(team_a: Squad, team_b: Squad) -> Match`
- `simulate_innings(batting_team, bowling_team) -> Innings`
- `simulate_ball(bowler, batsman, context) -> Ball`
- `calculate_wicket() -> WicketType`
- `calculate_runs(batsman_rating, bowler_rating) -> u32`

**Algorithm**:
1. Player ratings determine ball probabilities
2. Probability-weighted outcomes (runs, boundaries, wickets) drawn from a seeded RNG
3. Match context (powerplay, death overs) modifies probabilities
4. Seed = lobby ID + match ID, so the same input always gives the same result ([ADR 0003](docs/adr/0003-seeded-deterministic-simulation.md))

**Performance**: <50ms for full 20-over match

#### Season Manager (`season.rs`)
**Purpose**: Orchestrate league and playoffs

**Key Functions**:
- `create_season(lobby_id, teams) -> Season`
- `schedule_matches() -> Vec<Match>`
- `process_match_result(match_id, result)`
- `update_standings()`
- `determine_playoffs() -> PlayoffBracket`
- `calculate_awards(season_stats) -> Awards`

**Data Flow**:
1. Create 10-team season (league + playoffs)
2. Schedule double round-robin (14 matches per team)
3. After each match, update standings
4. After league, determine top 4 for playoffs
5. Run the IPL playoff format: Qualifier 1, Eliminator, Qualifier 2, Final (rounds 15-18)
6. Calculate season awards

#### Lobby Manager (`lobby.rs`)
**Purpose**: Manage guest lobbies and match broadcasting

**Key Functions**:
- `create_lobby(name, creator_id) -> Lobby`
- `claim_franchise(lobby_id, guest_id, franchise) -> Lobby`
- `run_auction(lobby_id)`: runs the seeded auction, see `docs/game-design.md` section 3
- `broadcast_match_update(lobby_id, event)`
- `get_lobby_state(lobby_id) -> LobbyState`

**State Persistence**: Cloudflare Durable Objects
- Lobby metadata (owners, phase, current round)
- Match results (for all 10 teams)
- Standings (updated per match)
- Awards (computed from season stats)

#### Squad Builder (`squad.rs`)
**Purpose**: Validate the 15-player squad and the 11-player starting XI

**Key Functions**:
- `validate_squad(squad) -> Result<()>`
- `check_purse(squad) -> purse_remaining`
- `assign_captain(squad, captain_id)`
- `get_player_stats(player_id, season) -> Stats`

**Constraints**:
- 15 drafted players; 11 in the starting XI
- Purse ₹100cr per owner, no carry-over; total spent ≤ ₹100cr
- Starting XI: exactly 1 wicket-keeper
- Starting XI: at least 4 bowling options (bowlers and bowling all-rounders)
- Starting XI locks after the first match; one free substitution per season

#### Awards Calculator (`awards.rs`)
**Purpose**: Track and calculate season awards

**Key Functions**:
- `track_player_stats(match_result)`
- `calculate_man_of_match(match) -> Player`
- `calculate_season_awards(season_stats) -> Awards`
- `get_award_winner(award_type, stats) -> Player`

**Award Types** (see `docs/game-design.md` section 8):
- Orange Cap (most runs)
- Purple Cap (most wickets)
- Most Valuable Player (highest season fantasy points)
- Man of the Match (per match)
- Emerging Player
- Fair Play (franchise season standing, see `docs/game-design.md` section 9)

Batting and bowling averages are stats on award screens, not awards.

### 2. Data Models (`models.rs`)

**Player**
```rust
struct Player {
    id: String,
    name: String,
    franchise_id: Option<String>,  // current franchise, or last IPL franchise when retired; None only for a retired player with no IPL history
    role: Role,  // Batter, Bowler, AllRounder, WicketKeeper
    category: Category,  // Marquee, Capped, Uncapped
    retired: bool,
    base_price: u32,  // lakhs (₹1cr = 100 lakhs), set by category (ADR 0004)
    trouble_rating: u8,  // 0-10, seeded; base value 2 if unseeded (game-design section 9)
    ratings: PlayerRatings,
}

struct PlayerRatings {
    batting: u8,    // integer 0-100 (ADR 0004)
    bowling: u8,    // integer 0-100
    fielding: u8,   // integer 0-100
}
```

**Squad**
```rust
struct Squad {
    id: String,
    lobby_id: String,
    owner_id: String,  // the guest who owns the franchise
    franchise_id: String,
    players: Vec<Player>,  // 15 drafted players
    starting_xi: Vec<String>,  // 11 player IDs from players
    captain_id: String,
    vice_captain_id: String,
    total_spent: u32,  // lakhs (ADR 0004)
    substitution_used: bool,
    season_stats: SeasonStats,
}

struct SeasonStats {
    matches_played: u32,
    league_points: u32,
    playoff_record: PlayoffRecord,
    total_runs: u32,
    total_wickets: u32,
    batting_avg: f32,
    bowling_avg: f32,
    awards: HashMap<AwardType, u32>,
}
```

**Match**
```rust
struct Match {
    id: String,
    lobby_id: String,
    round: u32,
    home: Squad,  // see GLOSSARY.md, Franchise and Squad
    away: Squad,
    toss_winner: String,  // franchise_id
    batting_first: String,  // franchise_id
    innings1: Innings,
    innings2: Innings,
    result: MatchResult,
    man_of_match: String,
    timestamp: DateTime,
}

struct Innings {
    batting_franchise_id: String,
    bowling_franchise_id: String,
    balls: Vec<Ball>,
    total_runs: u32,
    total_wickets: u32,
    overs_completed: u32,
}

struct Ball {
    over: u32,
    ball: u32,
    bowler: String,
    batsman: String,
    runs: u32,
    wicket: Option<WicketType>,
    is_dot: bool,
}
```

**Lobby**
```rust
struct Lobby {
    id: String,
    code: String,  // Shareable code
    name: String,
    created_by: String,  // guest_id
    created_at: DateTime,
    owners: Vec<Owner>,  // removed owners are dropped (GLOSSARY.md, Removed owner)
    phase: Phase,  // auction | league | playoffs | complete
    current_round: u32,
    seed_version: String,  // seed data set the lobby was created with, copied at creation (see data/seeds/)
    season: Season,
    standings: Standings,
}

/// The guest who holds one franchise, its squad and its purse.
struct Owner {
    guest_id: String,
    franchise_id: String,
    purse_remaining: u32,  // lakhs
    squad: Squad,
    league_points: u32,
    playoff_record: PlayoffRecord,
    awards: HashMap<AwardType, u32>,
}
```

### 3. API Endpoints

The frontend's `GameApi` is the authoritative contract. Its zod schemas (`frontend/src/shared/types/*.schema.ts`) define each response, and the shared fixtures in `data/fixtures/api/` are parsed by both those schemas and the Rust DTOs in `cricket-worker/src/api.rs`. The lobby code is the Durable Object name, so every lobby route goes to that object. Each refusal is a JSON body `{"error": <name>, "reason": <kebab-case reason or null>}` with the status the frontend expects.

**Lobby**
```
POST   /api/lobbies                          Create a lobby; the creator is its first guest (201)
GET    /api/lobbies/:code                    Lobby state
POST   /api/lobbies/:code/join               Join as a guest
POST   /api/lobbies/:code/franchise          Claim a franchise
```

**Auction**
```
POST   /api/lobbies/:code/auction/start      Start the auction once every owner has claimed
GET    /api/lobbies/:code/auction            Current lot, high bid, bid log and purses
POST   /api/lobbies/:code/auction/bids       Bid on the open lot (amountLakhs)
```

**Squad and starting XI**
```
GET    /api/lobbies/:code/squad?guestId=     One owner's squad (after the auction)
POST   /api/lobbies/:code/squad/xi          Set the starting XI with captain and vice-captain
POST   /api/lobbies/:code/squad/substitution  The one free substitution, after the first match
```

**League and playoffs**
```
GET    /api/lobbies/:code/league             Fixtures, results and standings
POST   /api/lobbies/:code/league/advance     Play the next round (league) or match (playoffs)
GET    /api/lobbies/:code/playoffs           Bracket and results
GET    /api/lobbies/:code/awards             Season awards, Man of the Match and Fair Play
```

The frontend runs on its own origin. The Worker answers preflight requests and sends CORS headers only to the origins listed in `ALLOWED_ORIGINS` in `backend/wrangler.toml`. Before deploying, add the deployed frontend origin there. The frontend selects this API with `NEXT_PUBLIC_API_MODE=http` and `NEXT_PUBLIC_API_URL` set to the Worker's origin.

The auction timer is a Durable Object alarm. Overdue lots are settled before any request reads or changes the lobby, so a read after the deadline shows the settled state.

### 4. WebSocket Events

**Client → Server**
```json
{
  "type": "join_lobby",
  "lobby_id": "abc123",
  "user_id": "user1"
}

{
  "type": "skip_animation",
  "match_id": "m1"
}
```

**Server → Client**
```json
{
  "type": "match_started",
  "match": { team1, team2, toss_info }
}

{
  "type": "ball_played",
  "ball": { bowler, batsman, runs, wicket }
}

{
  "type": "over_complete",
  "over_summary": { runs, wickets }
}

{
  "type": "match_complete",
  "result": { winner, man_of_match }
}

{
  "type": "standings_update",
  "standings": [ ... ]
}

{
  "type": "season_complete",
  "awards": { ... }
}
```

## Frontend Implementation Details

### Styling with StyleX
```typescript
// StyleX provides type-safe, performant CSS-in-JS
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    padding: '1rem',
    backgroundColor: '#0a0a0f',  // Dark theme
    '@media (max-width: 768px)': {
      padding: '0.5rem'
    }
  }
});

// Apply atomically - no class name bloat
<div {...stylex.props(styles.container)} />
```

### Custom Hooks for Game Logic
```typescript
useWebSocket(lobbyId)         // Real-time match updates via WebSocket
useLobbyState(lobbyId)        // Lobby state + standings
useAuction(lobbyId)           // Live auction: current player, bids, timer
useLocalStorage(key)          // Sync UI state to localStorage
useMatchSimulation(matchId)   // Live match state
useAwards(lobbyId)            // Award calculations
useResponsive()               // Current breakpoint (mobile/tablet/desktop)
usePWA()                      // PWA installation & offline status
```

### Key Components
```
<LobbyView>
  - Displays active lobbies
  - Create/Join lobby forms
  
<AuctionView>
  - Auction card with countdown timer and increment buttons
  - Bid log and purse remaining
  - Squad count (of 15)

<StartingXI>
  - Pick 11 of 15, with captain and vice-captain
  - Locks after first match

<MatchViewer>
  - League: score-only display (1-2s)
  - Playoff: key moments within 5s
  - Skip button to reach the result
  
<SeasonTable>
  - League standings with sorting
  - Playoff bracket
  - Award winners with icons
```

## Database (Cloudflare Durable Objects)

### Durable Object: LobbyObject
**Purpose**: Persistent state for one lobby

**Storage**: one key, `lobby`, holding the whole `Lobby` as JSON. It holds members, claims, the auction, squads, the schedule, every match summary, the bracket and the phase. It does not hold ball-by-ball data, and it does not copy the seed files: the Worker embeds `data/seeds/` and the lobby records the `seedVersion` it was created with. Storage stays well under the 2 MiB value limit for a full season. See [ADR 0006](docs/adr/0006-match-summaries-not-balls.md).

**Alarm**: the auction's next lot deadline, so an expired lot closes without a request.

**Lifespan**: Lobby creation → season completion (cleanup after 24h)

## Deployment Architecture

### Frontend (Vercel)
```
GitHub repo → Vercel → Global CDN
└─ Automatic deployments on push
└─ Environment vars for API URL
```

### Backend (Cloudflare Workers)
```
Rust code + wasm → Cloudflare Workers
├─ Global edge deployment
├─ Automatic scaling
└─ 100k requests/day free tier
```

### Database (Cloudflare Durable Objects)
```
LobbyObject instances → Global replication
├─ Strongly consistent writes
├─ Automatic durability
└─ Free tier included with Workers
```

## Performance Targets

| Metric | Target |
|--------|--------|
| Match simulation | <2 seconds (league) |
| Playoff match | ≤5 seconds (key moments) |
| API response | <100ms |
| WebSocket latency | <500ms |
| Page load | <2 seconds |
| Memory per lobby | <10MB |

## Security Considerations

- **No authentication**: Guest-based, session-based
- **Lobby codes**: Random 6-char codes for sharing
- **Validation**: All squad submissions validated server-side
- **Rate limiting**: Rate limit API requests to prevent abuse
- **WebSocket**: Only broadcast state, no sensitive data

## Scalability

**MVP (Day 1)**:
- 1 lobby, 10 concurrent users
- 1 match per 2 seconds (simulated)
- ~50MB data per lobby

**Scaling**:
- Cloudflare Workers: Auto-scaling (100k req/day free)
- Durable Objects: Create new instance per lobby
- No database queries (all state in memory)
- Stateless API layer

## Monitoring

- Cloudflare Analytics: Request counts, errors, latency
- Custom logging: Match simulation times, API errors
- WebSocket health checks: Connection status per client
