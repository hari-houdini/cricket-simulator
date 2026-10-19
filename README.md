# IPL Cricket Simulator

A real-time multiplayer fantasy cricket game where users build IPL teams with budget constraints (₹100cr) and compete through a full season with league matches and playoffs.

## Game Overview

- **Format**: IPL T20 (20 overs per side)
- **Players**: Guest-based, lobby-based multiplayer
- **Season Structure**: 10-team league + 4-team playoffs
- **Match Speed**: League matches simulate in 1-2 seconds; playoff matches show over-by-over detail
- **Awards**: Full IPL award system (MVP, Most Runs, Most Wickets, Best Averages, Emerging Player)

## Architecture

### Tech Stack
- **Frontend**: React on Vercel (free tier)
- **Backend**: Cloudflare Workers + Rust/Go (free tier)
- **Database**: Cloudflare Durable Objects or Upstash Redis (free tier)
- **Realtime**: WebSocket for live match broadcasting
- **Repository**: Public GitHub (open source)

### Project Structure
```
cricket-simulator/
├── frontend/          # React app
│   ├── src/
│   │   ├── pages/     # Lobby, SquadSelection, Match, Season
│   │   ├── components/
│   │   └── hooks/     # useWebSocket, useMatch, etc.
│   └── package.json
├── backend/           # Cloudflare Workers
│   ├── src/
│   │   ├── match_simulator.rs
│   │   ├── models.rs
│   │   ├── api.rs
│   │   ├── ipl_data.rs
│   │   └── awards.rs
│   └── Cargo.toml
├── research/          # Architecture analysis
│   ├── 38-0-architecture-analysis.md
│   └── football-to-cricket-mapping.md
├── docs/              # Documentation
│   ├── game-design.md
│   ├── api-spec.md
│   └── deployment.md
└── .claude/           # AI assistant setup
    └── plans/
```

## Getting Started

### Prerequisites
- Node.js 16+
- Rust 1.70+
- GitHub account
- Vercel account (free)
- Cloudflare account (free)

### Development

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Backend:**
```bash
cd backend
cargo build
wrangler dev
```

**Deploy:**
```bash
# Frontend to Vercel
vercel deploy

# Backend to Cloudflare
wrangler publish
```

## Game Rules

### Squad Building
- 11 players total
- Budget: ₹100cr
- Roles: Batsman, Bowler, All-rounder, Wicket-keeper
- Select captain and vice-captain

### League Phase
- 10 teams (IPL franchises)
- Double round-robin (14 matches per team)
- Points: Win = 2pts, Loss = 0pts, Tie = 1pt each
- Fast simulation (1-2 seconds per match)

### Playoffs
- Top 4 teams advance
- Semi-finals + Final
- Detailed over-by-over simulation with animations
- Skippable to final score

### Awards
- Man of the Match (per match)
- Most Runs (season)
- Most Wickets (season)
- Best Batting Average (min 10 balls)
- Best Bowling Average (min 10 balls)
- Emerging Player (lowest-rated with best impact)
- Fair Play Award

## API Overview

See `docs/api-spec.md` for full API documentation.

**Key Endpoints:**
- `POST /api/lobbies` - Create lobby
- `GET /api/lobbies/:id` - Join lobby
- `POST /api/lobbies/:id/squad` - Submit squad
- `POST /api/lobbies/:id/simulate-match` - Run match
- `GET /api/lobbies/:id/standings` - View standings
- `WebSocket /api/lobbies/:id/match/:round/live` - Live updates

## Design Inspiration

This simulator is inspired by [38-0.app](https://38-0.app), a viral football fantasy game. Key patterns replicated:
- Fast-paced arcade simulation
- Budget-constrained team building
- Real-time multiplayer with shared match viewing
- Skip/fast-forward controls
- Award systems for engagement

See `research/38-0-architecture-analysis.md` for detailed analysis.

## Development Roadmap

- [ ] Phase 1: 38-0 architecture analysis
- [ ] Phase 2: Core match simulator
- [ ] Phase 3: Data models & APIs
- [ ] Phase 4: Frontend scaffolding
- [ ] Phase 5: UI implementation
- [ ] Phase 6: WebSocket integration
- [ ] Phase 7: Testing & optimization
- [ ] Phase 8: Production deployment

## Contributing

Contributions welcome! Please see CONTRIBUTING.md for guidelines.

## License

MIT

## Author

Built with [Claude Code](https://claude.com/claude-code)
