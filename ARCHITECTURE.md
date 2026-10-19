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
- **PWA**: manifest.json + Service Worker for offline support
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
   - **Persistence**: Session-based, cleared on browser close

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

### PWA Features
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
2. Weighted random outcomes (runs, boundaries, wickets)
3. Match context (powerplay, death overs) modifies probabilities
4. Deterministic seeding (same input = same result)

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
5. Run semi-finals and final
6. Calculate season awards

#### Lobby Manager (`lobby.rs`)
**Purpose**: Manage guest lobbies and match broadcasting

**Key Functions**:
- `create_lobby(name, creator_id) -> Lobby`
- `join_lobby(lobby_id, user_id, squad) -> Lobby`
- `broadcast_match_update(lobby_id, event)`
- `get_lobby_state(lobby_id) -> LobbyState`

**State Persistence**: Cloudflare Durable Objects
- Lobby metadata (users, current round)
- Match results (for all 10 teams)
- Standings (updated per match)
- Awards (accumulated per user)

#### Squad Builder (`squad.rs`)
**Purpose**: Validate and manage team squads

**Key Functions**:
- `validate_squad(squad) -> Result<()>`
- `check_budget(squad) -> remaining_budget`
- `assign_captain(squad, captain_id)`
- `get_player_stats(player_id, season) -> Stats`

**Constraints**:
- 11 players exactly
- Total salary ≤ ₹100cr
- 1 wicket-keeper minimum
- Valid roles for each position

#### Awards Calculator (`awards.rs`)
**Purpose**: Track and calculate season awards

**Key Functions**:
- `track_player_stats(match_result)`
- `calculate_man_of_match(match) -> Player`
- `calculate_season_awards(season_stats) -> Awards`
- `get_award_winner(award_type, stats) -> Player`

**Award Types**:
- Most Runs
- Most Wickets
- Best Batting Average
- Best Bowling Average
- Emerging Player
- Man of the Match (per match)
- Fair Play

### 2. Data Models (`models.rs`)

**Player**
```rust
struct Player {
    id: String,
    name: String,
    ipl_team: String,
    role: Role,  // Batsman, Bowler, AllRounder, WicketKeeper
    price: u32,  // ₹ salary
    ratings: PlayerRatings,
}

struct PlayerRatings {
    batting: f32,    // 0.0-100.0
    bowling: f32,    // 0.0-100.0
    fielding: f32,   // 0.0-100.0
}
```

**Squad**
```rust
struct Squad {
    id: String,
    lobby_id: String,
    user_id: String,
    players: Vec<Player>,  // 11 players
    captain_id: String,
    vice_captain_id: String,
    total_spent: u32,  // ₹
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
    team1: Squad,
    team2: Squad,
    toss_winner: String,
    batting_first: String,
    innings1: Innings,
    innings2: Innings,
    result: MatchResult,
    man_of_match: String,
    timestamp: DateTime,
}

struct Innings {
    batting_team: Squad,
    bowling_team: Squad,
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
    created_by: String,
    created_at: DateTime,
    users: Vec<LobbyUser>,
    current_phase: Phase,  // League, Playoffs, Complete
    current_round: u32,
    season: Season,
    standings: Standings,
}

struct LobbyUser {
    user_id: String,
    squad: Squad,
    league_points: u32,
    playoff_record: PlayoffRecord,
    awards: HashMap<AwardType, u32>,
}
```

### 3. API Endpoints

**Lobby Management**
```
POST   /api/lobbies
       Create lobby → returns lobby code

GET    /api/lobbies/:id
       Get lobby state & standings

POST   /api/lobbies/:id/users/:user_id/squad
       Submit squad selection

GET    /api/lobbies/:id/standings
       Get current league table & awards
```

**Match Simulation**
```
POST   /api/lobbies/:id/simulate-round
       Simulate next round of matches

GET    /api/lobbies/:id/match/:match_id
       Get match details & stats

GET    /api/lobbies/:id/season/awards
       Get season awards & winners
```

**Real-time Updates**
```
WebSocket /api/lobbies/:id/live
          Stream of events: match_started, ball_played, 
          over_complete, match_complete, season_complete
```

**Data Retrieval**
```
GET    /api/players
       Get all IPL players with ratings

GET    /api/ipl-schedule
       Get real IPL match schedule template

GET    /api/awards/:lobby_id
       Get detailed award statistics
```

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
useSquadBuilder(budget)       // Squad selection with validation
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
  
<SquadBuilder>
  - Player browser with filters
  - Budget tracker (₹100cr)
  - Drag-drop squad builder (mobile: swipe)
  
<MatchViewer>
  - League: Fast score-only display (1-2s)
  - Playoff: Over-by-over animations (30s+)
  - Skip button for animations
  
<SeasonTable>
  - League standings with sorting
  - Playoff bracket
  - Award winners with icons
```

## Database (Cloudflare Durable Objects)

### Durable Object: LobbyObject
**Purpose**: Persistent state for one lobby

**Keys Stored**:
- `lobby:{id}` → Lobby metadata
- `standings:{id}` → Current standings
- `matches:{id}:{round}` → Match results
- `awards:{id}` → Award tracking

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
| Playoff match | 30+ seconds (with animations) |
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
