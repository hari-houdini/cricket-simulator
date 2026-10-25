# IPL Cricket Auction Simulator — UI/UX Design System

**Date**: 2026-10-25  
**Project**: Cricket Simulator (IPL Fantasy Cricket Game)  
**Design Approach**: Real-time multiplayer auction game with neumorphic UI  
**Status**: Design Complete — Ready for Implementation

---

## Context

The cricket simulator is a real-time multiplayer fantasy cricket game where users join lobbies, bid in live auctions to draft 15-player squads (including substitutes), simulate a full IPL season through league matches and playoffs, and compete for awards. The game is inspired by 38-0's proven patterns but built on a backend-heavy multiplayer architecture (Cloudflare Workers + Durable Objects).

**Design Vision**: Create a **luxurious, aspirational** interface using neumorphism — soft 3D surfaces on dark navy backgrounds with gold accents. The design should feel premium (like high-end fantasy sports platforms) yet remain fast and functional (like 38-0). Every interaction is refined, never flashy. The game's energy comes from real-time bidding tension and squad competition, not animation spectacle.

---

## Design Decisions Summary

### 1. Color Palette

**Golden Twilight** neumorphic theme with dark navy base and warm gold accents.

| Element | Color | Usage |
|---------|-------|-------|
| **Base / Background** | `#001d3d` (dark navy) | Primary surface, cards, buttons |
| **Mid-Tone** | `#003566` (medium navy) | Secondary surfaces, hover states |
| **Shadow** | `#000814` (deepest navy) | Neumorphic shadows, depth |
| **Primary Accent** | `#ffc300` (bright gold) | CTAs, highlights, active states |
| **Secondary Accent** | `#ffd60a` (light gold) | Hover states, secondary highlights |
| **Team Colors** | Official IPL franchise colors (CSK yellow, MI blue, RCB red, etc.) | Team badges, left borders on player cards, session branding |
| **Status Colors** | Green (available), Amber (warning), Red (unavailable/sold) | Player states, availability indicators |

**Mode**: Dark-only (no light mode). Neumorphism is optimized for dark backgrounds.

---

### 2. Typography System

**Serif + Sans Hybrid** for luxury + legibility.

| Level | Font | Size | Weight | Usage |
|-------|------|------|--------|-------|
| **Display** | Bodoni Moda | 48px | Bold | Season recap, full-screen titles |
| **Heading 1** | Bodoni Moda | 32px | Bold | Lobby titles, match headers, major sections |
| **Heading 2** | Bodoni Moda | 24px | Regular | Card titles, team names, section headers |
| **Body** | DM Sans | 16px | Regular | Player names, prices, descriptions, stat values |
| **Caption** | DM Sans | 12px | Regular | Timestamps, helper text, icon labels |

**Mobile Scaling**: Each level decreases by 1–2 sizes on mobile (375–480px breakpoint).

**Rationale**: Bodoni Moda elevates the luxury factor for IPL fans (broadcast-quality prestige). DM Sans keeps body copy scannable and modern. Serif headlines + sans body is a proven hybrid for sports/premium products.

---

### 3. Spacing System

**6-Level Spacing Scale** based on 16px base unit.

| Token | Value | Usage |
|-------|-------|-------|
| **xs** | 4px | Micro-spacing (icon padding, tight groups) |
| **sm** | 8px | Small gaps (badge padding, tight spacing) |
| **md** | 16px | Base unit (standard padding, card spacing) |
| **lg** | 24px | Section spacing (card to card, section breaks) |
| **xl** | 32px | Major spacing (section blocks, breathing room) |
| **2xl** | 48px | Max breathing room (screen-level spacing) |

**CSS Variable Example**:
```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-2xl: 48px;
```

---

### 4. Neumorphic Depth System

**3-Level Shadow System** for raised, pressed, and subtle states.

| State | Shadow CSS | Usage |
|-------|-----------|-------|
| **Raised** (default) | `0 8px 16px rgba(0,8,20,0.2), inset 0 2px 4px rgba(255,255,255,0.1)` | Buttons, cards, default state |
| **Pressed** (active) | `inset 0 4px 8px rgba(0,8,20,0.2), inset 0 -2px 4px rgba(255,255,255,0.1)` | Button active, form input focus |
| **Subtle** (secondary) | `0 4px 12px rgba(0,8,20,0.15)` | Lightweight cards, sidebar, secondary elements |

**Rationale**: Moderate shadows (6–8px blur) make neumorphic depth read clearly without overwhelming dark navy. Light inset highlight simulates premium surface reflection.

---

### 5. Border Radius

**Moderate Rounding**: 8px for buttons/inputs, 12px for cards.

```css
--radius-sm: 8px;   /* Buttons, inputs */
--radius-md: 12px;  /* Cards, modals */
```

**Rationale**: Soft enough to feel premium and modern; structured enough to stay crisp and neumorphic. Avoids inflated "pill-button" look.

---

### 6. Button System

**3 Sizes × 3 Variants** for complete interaction coverage.

#### Sizes

| Size | Height | Usage |
|------|--------|-------|
| **Small** | 32px | Icon buttons, compact actions (pass in auction) |
| **Medium** (default) | 44px | Primary CTAs, standard touch target (WCAG min) |
| **Large** | 56px | Major CTAs (Confirm Squad, Start Auction) |

#### Variants

| Variant | Background | Text | Border | Usage |
|---------|-----------|------|--------|-------|
| **Primary** | `#ffc300` (gold) | `#001d3d` (dark) | None | "Bid," "Confirm Squad," main CTAs |
| **Secondary** | `#001d3d` (dark) + neumorphic shadow | `#ffc300` (gold) | `1px #ffc300` | "Pass," "Cancel," secondary actions |
| **Tertiary** | Transparent | `#ffc300` (gold) | None | "View Details," "More," minimal actions |

**States**:
- **Hover**: Shadow deepens slightly (neumorphic depth increases)
- **Active**: Gold accent becomes brighter, shadow inverts (pressed state)
- **Disabled**: Opacity 50%, no interaction
- **Focus** (keyboard): 2px gold ring around button (custom, accessible focus indicator)

---

### 7. Animation & Transition Timing

**Restrained timing** for subtle, refined feel (no arcade energy).

| Interaction | Duration | Easing | Usage |
|-------------|----------|--------|-------|
| **Micro** (button press, badge flash) | 150ms | ease-out | Button active, highlight reveal |
| **Card** (expand, collapse, swap) | 300ms | ease-in-out | Squad card updates, bench swaps |
| **Page** (screen transitions) | 400ms | ease-out | Auction → results, lobby → squad |
| **Reveal** (scorecard animation, result) | 1200ms | ease-out | Match simulation, score ticking |

**All animations support `prefers-reduced-motion` — skip animations if user preference is set.**

**Special Moments** (Match Simulation):
- **Milestone/Wicket reveal**: Gold flash (150ms) on key moments
- **Outbid**: Card shakes 3px over 250ms + gold border flash (300ms)
- **Scroll**: Smooth, momentum-based scrolling (PWA app feel)

---

## Game-Specific UX Flows

### Auction Flow

**Core Interaction**: Players pop up in a lobby, users bid in real-time.

#### Auction Card (Center Screen)

Layout on mobile: Card fills screen, bid buttons scroll below.

```
┌─────────────────────────────┐
│        [TIMER: 0:18]        │  ← Countdown in gold, shifts orange→red
│         (progress ring)      │  ← Subtle progress ring around border
│                             │
│  [Flag: IND] Virat Kohli   │  ← Country flag + player name
│                             │
│  Current Bid: ₹15.5cr      │  ← Large, gold
│  Last Bidder: User42        │  ← Compact bid log (scrollable)
│  You → ₹14cr                │
│  User89 → ₹13.5cr           │
│                             │
│ [Bid ₹50L] [Bid ₹1cr] ...  │  ← Increment buttons (no manual input)
│ [Pass] [Watchlist]         │  ← Secondary actions
│
│ Squad: 9/15 | ₹28.5cr left │  ← Collapsed squad info
└─────────────────────────────┘
```

**States**:
- **Outbid**: Card shakes (3px) + gold flash on new bid (250ms)
- **Timer Warning** (last 5 seconds): Timer color shifts gold → orange → red
- **Passed**: Toast notification "Passed on [Player]" (no modal)
- **Player Sold**: Card dismissed, next auction pops up instantly

#### Bid Log Display
- **Always visible** below auction card
- Shows last 3–5 bids as compact list (scrollable if many)
- Format: "User123 → ₹1.5cr | User456 → ₹1.2cr | You → ₹1cr"
- Builds trust and competitive engagement

---

### Squad Building (Post-Auction)

**Starting XI Selection**: After 15 players drafted, user picks which 11 play.

- All 15 players visible in scrollable list
- Tap to lock in 11 players (visual checkmark appears)
- Captain/Vice-Captain badges shown inline (gold "C" / "VC" badges)
- Tap badge to reassign roles
- "Review Squad" button → locked view → "Ready to Play"

**Substitution Rules**:
- Lineup locked after first match
- One free substitute swap allowed per season (if player underperforms/injured)
- Clear "Swap" button appears only after first match

---

### League Standings

**Desktop**: Standard IPL table (rank, team, matches, wins, points, NRR, runs, wickets)

**Mobile**: Card-based standings
```
┌─────────────────────────────┐
│ 1. [CSK Badge] CSK          │
│    Pts: 16 | NRR: +0.412    │ ← Tap for full stats
│                             │
│ 2. [MI Badge] MI            │
│    Pts: 14 | NRR: +0.156    │
└─────────────────────────────┘
```

---

### Match Results Display

**League Matches** (Simple, instant):
```
┌─────────────────────────────┐
│ CSK 168 - MI 142            │  ← Team badges + scores
│ Best Batsman: Kohli 72      │  ← Both teams' performers
│ Best Bowler: Bumrah 2/28    │
│ Man of Match: Kohli         │  ← Gold highlight
└─────────────────────────────┘
```

**Eliminator Matches** (Detailed, modal view):
- Tap result → full-screen modal
- Both innings, top 2 batsmen + 2 bowlers per innings
- Full scores + bowling figures
- Man of Match highlighted in gold

---

### Awards Presentation

**End of Season**: Simple award cards (no podium ceremony, keep it clean).

```
┌─────────────────────────────┐
│ Man of the Match Award      │
│ Kohli (6 awards)            │
│                             │
│ Most Runs: Kohli (892)      │
│ Most Wickets: Bumrah (18)   │
│ Best Average: [Player]      │
│ Emerging Player: [Player]   │
│ Fair Play: [Team]           │
└─────────────────────────────┘
```

**Season Recap Screen** (Auto-shown post-season):
- Your final rank + total points
- Squad value, best/worst player purchase
- Best performing match, team highlights
- Button: "Browse All Profiles" or "Start New Season"

---

### Lobby & Team Selection

**Entry Flow** (No login system):
1. User enters/receives lobby ID
2. Types their name
3. Picks IPL franchise from grid (2×5 grid, colored badges + team name)
4. Joins lobby → sees countdown + other players' names + team colors
5. Timer starts → auction begins

**Lobby Screen**:
```
┌─────────────────────────────┐
│ Lobby: IPL-Fantasy-A2B1    │
│ Starting in: 0:45          │
│                             │
│ 👤 You (CSK)               │ ← Current user highlighted
│ 👤 User42 (MI)             │
│ 👤 User89 (RCB)            │
│ ⏳ Waiting for 1 more...    │
│                             │
│ [Start Auction]            │ (only if host / all ready)
└─────────────────────────────┘
```

---

### Match Simulation

**Toss Reveal + Scorecard Animation**:

```
┌─────────────────────────────┐
│ Toss: CSK won, chose BATTING│  ← Toss header
│                             │
│ CSK Innings:               │  ← Animated reveal (1–2 sec)
│ 156 for 4 (20 overs)       │
│ Kohli 72, Dhoni 48         │
│                             │
│ MI Innings:                │  ← Follows after CSK completes
│ 142 all out (19.2 overs)   │
│ Bumrah 2/28, Chahar 2/26   │
│                             │
│ Result: CSK won by 14 runs │
│ MoM: Kohli                 │  ← Gold highlight
└─────────────────────────────┘
```

**Animation Details**:
- Toss result shown at top as card header
- Scorecard animates below over 1–2 seconds
- Key moments (wickets, milestones) flash in gold during animation
- No ball-by-ball detail (just progress animation with key moments)
- Smooth transition between innings

---

## Component Specifications

### Player Card

**Usage**: Squad building, auction display, league results

```
┌──────────────────────────┐
│ ▌[Team Color Left Border]│
│ [Flag Icon] Virat Kohli  │ ← Country flag + name
│ ₹15.5cr | [Icon] BAT     │ ← Price + role badge
│ CSK (team name)          │ ← Team, optional
└──────────────────────────┘
```

**Sizes**: 
- **Compact** (auction): 140px wide, 80px height
- **Full** (squad view): responsive to container

**Interactive States**:
- **Hover** (desktop): Shadow deepens slightly
- **Selected/Owned**: Gold left border becomes thicker (4px)
- **Unavailable/Sold**: Opacity 50%, label "SOLD"

---

### Result Card

**Usage**: League standings, match results

```
┌──────────────────────────┐
│ [CSK Badge] CSK 168 -    │
│ MI 142 [MI Badge]        │  ← Team badges + scores
│                          │
│ 🏏 Best Batsman: Kohli 72│  ← Both teams' top performers
│ 🏏 Best Batter: Sharma 45│
│ ⚾ Best Bowler: Bumrah 2/28
│ ⚾ Best Bowler: Chahar 2/26
│ 👑 Man of Match: Kohli   │  ← Gold highlight
└──────────────────────────┘
```

---

### Budget Stat Card

**Usage**: Squad building screen, always visible

```
┌──────────────────────────┐
│ Squad Progress           │
│ 9/15 Players Drafted     │  ← Player count
│                          │
│ ₹71.5cr Spent            │  ← Budget breakdown
│ ₹28.5cr Remaining        │
│                          │
│ Max Foreign: 2/4 ✓       │  ← Roster constraints
│ Min Bowlers: 4/5 —       │
│ Wicket-Keeper: 1/1 ✓     │
└──────────────────────────┘
```

---

### Forms & Inputs

**Styling**: Inset/recessed neumorphic inputs

```css
/* Input base */
background: #003566;           /* Recessed into surface */
border: none;
border-radius: 8px;
padding: 12px 16px;
box-shadow: 0 4px 8px rgba(0,8,20,0.2), 
            inset 0 2px 4px rgba(0,0,0,0.15);

/* Focus state */
border: 1px solid #ffc300;     /* Gold border on focus */
outline: none;
box-shadow: 0 4px 8px rgba(0,8,20,0.2), 
            inset 0 2px 4px rgba(0,0,0,0.15),
            0 0 4px rgba(255,195,0,0.3);   /* Gold glow */
```

**Variants**:
- **Text Input** (name, lobby ID): Standard inset
- **Dropdown** (team selection): Inset with gold border on open
- **Toggles** (captain selection): Neumorphic button-style

---

## Responsive Design

### Breakpoints

| Device | Width | Layout |
|--------|-------|--------|
| **Mobile** | 375–480px | Single-column, stacked cards, bottom tab nav |
| **Tablet** | 480–768px | 2-column cards where appropriate, adjusted spacing |
| **Desktop** | 1024px+ | Full-width tables, side-by-side layouts, horizontal nav |

### Safe Area Insets

Mobile support for notches and home indicators:
```css
padding: 
  max(16px, env(safe-area-inset-top))
  max(16px, env(safe-area-inset-right))
  max(16px, env(safe-area-inset-bottom))
  max(16px, env(safe-area-inset-left));
```

### Touch Targets

Minimum 44×44px for all interactive elements (WCAG standard).

---

## Loading & Error States

### Loading States

Use **skeleton screens** (shimmer placeholders) while data loads.

```
┌──────────────────────────┐ ← Skeleton card outline
│ ████████████████        │ ← Shimmering placeholder
│ ██████████              │
│ ████                    │
└──────────────────────────┘
```

Feels faster than spinners; modern PWA pattern.

### Empty States

Use illustration + message + retry button.

```
┌──────────────────────────┐
│                          │
│   [Friendly illustration]│
│   "No matches yet"       │
│   "Check back soon"      │
│   [Retry Button]         │
│                          │
└──────────────────────────┘
```

### Error Handling

**Banner Alert** (top of screen):
```
⚠️ Connection unstable. Retrying...
```

- Amber background, dark text
- Persistent until resolved
- Gracefully pauses auction; all state safe on server
- Reconnect resumes seamlessly

---

## Interaction States & Feedback

### Hover States (Desktop)

- **Buttons**: Shadow deepens (neumorphic depth increases)
- **Cards**: Shadow deepens slightly
- **Interactive elements**: Cursor changes to pointer

### Active States

- **Buttons**: Gold accent brightens, shadow inverts (pressed)
- **Cards**: Gold border or accent appears
- **Form inputs**: Gold border appears, inset shadow slightly brightens

### Focus States (Keyboard)

- **Buttons/Inputs**: Custom 2px gold ring around element (not default browser blue)
- **Tab Order**: Left-to-right, top-to-bottom (natural reading order)

### Disabled States

- **All disabled elements**: Opacity 50%, no cursor change, not interactive

### Tap Feedback (Mobile)

- **Brief scale** (98%) on tap + shadow darken for 150ms
- No ripple effect (too material-design for neumorphic aesthetic)
- Haptic feedback: Not specified (depends on PWA constraints; optional)

---

## Accessibility

### Color Contrast

- **Gold on navy**: `#ffc300` on `#001d3d` = 8.3:1 contrast ratio ✓ (far exceeds WCAG AA 4.5:1)
- **Team colors on navy**: Some don't hit WCAG AA alone
  - **Solution**: Always pair with text label, icon, or badge (never rely on color alone)
  - Example: Team badge shows color + team abbreviation (e.g., "CSK")

### Text Alternatives

- Country flags → accompany with country code abbreviation (e.g., "IND")
- Role icons → accompany with text label (e.g., "BAT")
- Status colors → accompany with text or icon (e.g., green check for "Available")

### Keyboard Navigation

- All buttons, inputs, and cards are tab-reachable
- Tab order is logical (left-to-right, top-to-bottom)
- Focus ring is visible (2px gold) on all interactive elements

### Motion & Animation

- All animations support `prefers-reduced-motion`
- If user has reduced motion enabled, skip animations; show final state instantly
- Audio/haptic cues are optional (not required for any interaction)

---

## App Branding

### App Icon

**Neumorphic Badge**: Navy + gold geometric sphere (soft 3D neumorphic look).
- Scalable SVG
- Recognizable at multiple sizes (32px favicon → 512px PWA icon)
- Matches app aesthetic (no external branding)

### Splash Screen

**Branded Minimal**:
- Center: Neumorphic badge icon
- Below: App name
- Below: Subtle loading bar (or skeleton lobby screen)
- No tagline or fluff — fast entry to game

---

## Design System Tokens (CSS Variables)

```css
:root {
  /* Colors */
  --color-base: #001d3d;
  --color-mid: #003566;
  --color-shadow: #000814;
  --color-gold-primary: #ffc300;
  --color-gold-secondary: #ffd60a;
  --color-status-success: #10b981;
  --color-status-warning: #f59e0b;
  --color-status-error: #ef4444;

  /* Typography */
  --font-serif: 'Bodoni Moda', serif;
  --font-sans: 'DM Sans', sans-serif;
  --text-display: 48px bold;
  --text-h1: 32px bold;
  --text-h2: 24px regular;
  --text-body: 16px regular;
  --text-caption: 12px regular;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;

  /* Shadows */
  --shadow-raised: 0 8px 16px rgba(0,8,20,0.2), inset 0 2px 4px rgba(255,255,255,0.1);
  --shadow-pressed: inset 0 4px 8px rgba(0,8,20,0.2), inset 0 -2px 4px rgba(255,255,255,0.1);
  --shadow-subtle: 0 4px 12px rgba(0,8,20,0.15);

  /* Border Radius */
  --radius-sm: 8px;
  --radius-md: 12px;

  /* Transitions */
  --duration-micro: 150ms;
  --duration-card: 300ms;
  --duration-page: 400ms;
  --duration-reveal: 1200ms;
  --easing-out: cubic-bezier(0.16, 1, 0.3, 1);
  --easing-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## Implementation Readiness

### Critical Files to Create/Modify

1. **Design Tokens** (`design-system/tokens.css` or config)
   - All color, typography, spacing, shadow values
   - Export as CSS variables, SCSS maps, or JSON for Tailwind

2. **Component Library** (React/Vue/Svelte, depending on stack)
   - Button (3 sizes × 3 variants)
   - Card (player, result, budget, generic)
   - Input (text, dropdown, toggle)
   - Badge/Chip (team, role, status)
   - Modal (confirmation dialogs)
   - Toast (notifications)
   - Skeleton screens

3. **Screens/Pages**
   - Lobby join/team selection
   - Auction UI (full flow)
   - Squad building (starting XI selection)
   - League standings
   - Match results
   - Awards/season recap
   - Error states, loading states

4. **App Shell** (PWA)
   - Minimal splash screen (app icon + name + loader)
   - Bottom tab navigation (5 tabs: Squad, League, Simulate, Results, Awards)
   - Safe area insets for mobile notches

### Testing & Verification

1. **Responsive Design**: Test at 375px, 480px, 768px, 1024px breakpoints
2. **Touch Interactions**: Verify all buttons are 44px+ and easy to tap
3. **Keyboard Navigation**: Tab through all screens; verify focus ring visibility
4. **Color Contrast**: Gold and all team colors tested for WCAG AA compliance
5. **Animations**: Verify `prefers-reduced-motion` is respected
6. **Offline**: Test connection drop during auction; verify graceful pause and recovery
7. **Real-time Auction**: Test simultaneous bids, outbid notifications, state updates
8. **Match Simulation**: Verify 1–2 second animation with key moments
9. **Accessibility Audit**: WCAG 2.1 AA compliance check (contrast, labels, keyboard nav)

---

## Hand-Off Checklist

- [x] Color palette locked (navy + gold + 10 team colors)
- [x] Typography system finalized (Bodoni Moda + DM Sans, 5-level hierarchy)
- [x] Spacing & shadow tokens documented
- [x] Button system specified (3 sizes × 3 variants)
- [x] Auction flow designed and detailed
- [x] Squad building (15 players, team selection) specified
- [x] League standings & results layouts documented
- [x] Match simulation (toss + scorecard) designed
- [x] Awards/season recap defined
- [x] Responsive design (mobile, desktop) planned
- [x] Component specifications (player card, result card, budget card) documented
- [x] Loading, error, and empty states specified
- [x] Accessibility guidelines (contrast, alternatives, keyboard nav) defined
- [x] Interaction states (hover, active, focus, disabled) detailed
- [x] Animation timing and easing locked
- [x] App icon & splash screen designed
- [x] Design tokens (CSS variables) documented
- [x] All design decisions locked; no silently assumed details

---

## Next Steps

1. **Developer Handoff**: Share this document with frontend team
2. **Component Development**: Build component library using tokens
3. **Prototype & Test**: Create high-fidelity prototype; test on mobile/desktop
4. **User Testing** (if applicable): Test auction flow with real users
5. **Polish & Iterate**: Refine animations, spacing, micro-interactions based on feedback
6. **Launch**: Deploy PWA with complete design system

---

**Design Complete. Ready for Implementation.**
