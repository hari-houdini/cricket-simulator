# IPL Cricket Simulator - Game Design Document

## Design Vision

Build an **IPL T20 fantasy cricket game** inspired by 38-0's architecture. Users pick an IPL team with budget constraints (₹100cr), manage a squad, and compete in a full multiplayer season with real IPL schedules and simulated match outcomes. Fully responsive for mobile-first experience with progressive web app capabilities.

**Tech Stack:**
- **Frontend**: Next.js 16+ on Vercel
- **Styling**: StyleX + Dark Theme (mobile-first responsive design)
- **State Management**: Hybrid (localStorage for UI, Durable Objects for persistence)
- **PWA**: Installable, works offline
- **Analytics**: Vercel Analytics (built-in, free)

---

## 1. Game Overview

**Title:** IPL Cricket Simulator  
**Genre:** Fantasy Sports / Simulation Game  
**Platform:** Web (Next.js 16+ on Vercel)  
**Players:** Multiplayer (guest-based lobbies)  
**Format:** IPL T20 (20 overs per side)  
**Responsive Design:** Mobile, Tablet, Desktop

## 2. Core Mechanics

### 2.1 Squad Building
- **Budget**: ₹100 crore (real IPL salary cap)
- **Squad Size**: 11 players
- **Player Roles**:
  - Batsman
  - Bowler
  - All-rounder
  - Wicket-keeper (1 mandatory)
- **Captain Selection**: Captain (1.5x points multiplier), Vice-captain (1.25x multiplier)
- **Player Data**: Real IPL player names, teams, and ratings

### 2.2 Season Structure
- **10 Teams**: All IPL franchises (CSK, MI, RCB, KKR, DC, PBKS, RR, SRH, LSG, GT)
- **League Phase**: Double round-robin (14 matches per team, 70 total matches)
- **Playoffs**: Top 4 teams → Semi-finals (2 matches) → Final (1 match)
- **Points System**:
  - Win: 2 points
  - Loss: 0 points
  - Tie/NRR decision: 1 point each

### 2.3 Match Simulation

#### League Matches (Fast Mode)
- **Duration**: 1-2 seconds per match
- **Display**: Final score only
- **Details Shown**: Runs, wickets, winner
- **Man of Match**: Calculated but not detailed

#### Playoff Matches (Detailed Mode)
- **Duration**: 30+ seconds with animations
- **Display**: Over-by-over progression with ball-by-ball detail
- **Animations**: Score updates, wicket displays, sixes/fours
- **Skip Controls**: User can skip animations to final score anytime
- **Details**: Full innings stats, player performances

### 2.4 Scoring Simulation

**Ball Outcome Probabilities** (weighted by player ratings):
- ~70%: Normal delivery (dot, single, double, triple)
- ~20%: Boundary (4 or 6)
- ~5%: Dot ball
- ~5%: Wicket

**Modifiers**:
- **Player Ratings**: Batsman vs Bowler rating determines run frequency
- **Match Context**: Powerplay vs death overs affect aggression
- **Pressure**: Defending vs chasing affects risk-taking
- **Strike Rate**: Higher-rated batsmen have higher strike rates

**Wicket Types**:
- Bowled (5% of wickets)
- Caught (60% of wickets)
- LBW (15% of wickets)
- Run-out (10% of wickets)
- Other (10% of wickets)

## 3. Awards System

### Season Awards
- **Man of the Match** (per match): Best batting/bowling performance
- **Most Runs**: Total runs across all innings
- **Most Wickets**: Total wickets across all innings
- **Best Batting Average**: Highest average (min 10 balls)
- **Best Bowling Average**: Lowest average (min 10 balls bowled)
- **Emerging Player**: Lowest-rated player with best season impact
- **Fair Play Award**: (Placeholder for community/good conduct)

### Award Scoring
- Awards tracked per user in the lobby
- Displayed on season standings
- Contributes to overall season leaderboard ranking

## 4. Game Flow

### 4.1 User Journey

1. **Landing Page**
   - Join existing lobby (enter code/URL)
   - Create new lobby

2. **Lobby Screen**
   - See other users in lobby
   - View lobby code/share link
   - Start squad selection button

3. **Squad Selection**
   - Browse all IPL players with prices
   - Budget tracker (remaining ₹cr)
   - Build 11-player squad
   - Select captain & vice-captain
   - Submit squad

4. **League Phase**
   - Watch all 14 league matches
   - Each match takes ~1-2 seconds
   - See final score + standings update
   - Accumulate league points

5. **Playoffs**
   - View playoff bracket (top 4 teams)
   - Watch semi-finals with detailed animations
   - Watch final with detailed animations
   - See match replay or skip to result

6. **Season End**
   - Final standings table
   - Award winners displayed
   - Season summary & stats
   - Option to start new lobby

### 4.2 Multiplayer Synchronization

- **Lobby Code**: Shareable URL (e.g., `38-0.app?lobby=abc123`)
- **Shared Match Viewing**: All users in lobby watch same match live via WebSocket
- **State Synchronization**: Match results, standings updated for all users in real-time
- **Guest-based**: No login required, session-based presence

## 5. UI/UX Design

### 5.1 Screen Layouts

**Lobby Screen**
- Header: Lobby name, share button
- User list: Current players in lobby
- Start button: Begin squad selection
- Chat/info panel (optional future feature)

**Squad Selection**
- Left panel: Player list with filters (team, role, price)
- Center panel: Selected squad with positions
- Right panel: Budget tracker, validation
- Submit button: Finalize squad

**Match Screen**
- Top: Score card (team 1 vs team 2)
- Center: Live match visualization
  - League: Score display updating
  - Playoff: Ball-by-ball animation
- Right: Commentary or stats
- Controls: Skip button, match speed
- Bottom: Previous matches summary

**Season Table**
- League standings: Points table
- Playoff bracket: SF & Final results
- Awards section: Winners per category
- Stats: Top performers

### 5.2 Visual Design & Responsiveness
- **Dark theme** with high contrast for accessibility
- **Mobile-first** responsive design for all viewports:
  - Mobile (320px - 768px): Optimized touch targets, stacked layouts
  - Tablet (768px - 1024px): Balanced two-column layouts
  - Desktop (1024px+): Full-width with sidebars
- **StyleX styling**: Type-safe CSS-in-JS, atomic styles for performance
- Minimalist, fast-paced design (inspired by 38-0)
- Animated transitions for match progression
- Color coding: Team colors, award badges
- Clear, scannable scorecards
- Trophy icons for awards
- Safe area insets for notched devices (iPhone X+)

## 6. Technical Specifications

### 6.1 Data Structures

**Player**
```
{
  id, name, ipl_team, role,
  ratings: { batting, bowling, fielding },
  price: ₹
}
```

**Squad**
```
{
  11 x Player,
  captainId, viceCaptainId,
  totalSpent: ₹,
  seasonStats: { runs, wickets, avg, bowlingAvg }
}
```

**Match**
```
{
  lobbyId, round, team1, team2,
  innings1: { balls[], runs, wickets, overs },
  innings2: { balls[], runs, wickets, overs },
  result, manOfMatch
}
```

**Lobby**
```
{
  id, code, createdAt,
  users: [{ id, teamName, squad, leaguePoints, awards }],
  currentPhase: 'league' | 'playoffs' | 'complete',
  currentRound: 1-14 | 15-17
}
```

### 6.2 Simulation Engine

**Match Simulator**
- Input: Team A squad, Team B squad, match metadata
- Output: Ball-by-ball results
- Speed: Deterministic (same input = same result)
- Time: <1 second per 20-over match

**Season Manager**
- Tracks 10 teams through 14 rounds
- Calculates standings (points, NRR)
- Schedules playoffs
- Calculates awards

### 6.3 Real-time Communication

**WebSocket Events**
- `match_started`: Match begins
- `ball_played`: New ball result (playoffs only)
- `over_complete`: Over summary (playoffs only)
- `match_complete`: Final score + MoM
- `season_complete`: Final standings + awards

## 7. Success Criteria

### MVP Requirements
- ✅ Create lobby with shareable URL
- ✅ Build squad within ₹100cr budget
- ✅ Simulate full 10-team league in correct order
- ✅ Determine top 4 for playoffs
- ✅ Run semi-finals + final
- ✅ Calculate all awards
- ✅ Display standings with awards
- ✅ Real-time WebSocket updates
- ✅ League matches run in <2 seconds
- ✅ Deploy on zero-cost tiers (Vercel + Cloudflare)
- ✅ Fully responsive (mobile, tablet, desktop)
- ✅ PWA installable on home screen
- ✅ Basic Vercel Analytics tracking
- ✅ Dark theme with StyleX styling

## 8. Progressive Web App (PWA) Features

### MVP PWA Support
- **manifest.json**: Add-to-home-screen capability for mobile
- **Service Worker**: Offline support for cached matches and standings
- **Cache Strategy**: 
  - Network-first for live data (standings, match updates)
  - Cache-first for static assets (UI components, icons)
  - Stale-while-revalidate for season data
- **Mobile-optimized UI**: Touch-friendly controls, full-height layouts
- **Installability**: "Install app" prompt on mobile browsers

### Future PWA Enhancements
- Offline match replay functionality
- Push notifications for match starts/results
- Background sync for squad submissions

## 9. Future Features (v1.1+)

- Leaderboard across lobbies
- Player statistics and career stats
- Custom team naming and branding
- Invite-only private lobbies
- Replay system for matches
- Trading or player auction system
- Seasonal ranking/ladder
- Live commentary system
- Prediction markets
- Boot monitoring & error reporting (v1.1)
- GDPR/CCPA consent management (v1.1)

## 9. Success Metrics

- Match simulation speed: <2 seconds per league match
- Real-time update latency: <500ms
- Concurrent players per lobby: 10+
- Deployment size: <100MB total
- Infrastructure cost: $0/month (free tiers)
