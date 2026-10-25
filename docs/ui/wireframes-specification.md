# IPL Cricket Auction Simulator — Wireframe Specifications

**Date**: 2026-10-25  
**Status**: Complete Wireframe Specs Ready for Implementation  
**Figma File**: [Open in Figma](https://www.figma.com/design/jTtCkPmeTv5UWXTJwCt57O)

---

## Overview

This document provides detailed specifications for all 12 core screens in the IPL Cricket Auction Simulator. Use this alongside the Figma file to build wireframes, or import these specs directly into Figma as frames.

**Design System Reference**: See `design-system.md` for colors, typography, spacing, and components.

---

## Mobile Wireframe Specifications (375–480px)

All mobile screens are single-column layouts with bottom navigation.

### 1. Splash / Loading Screen

**Purpose**: Initial app load with minimal branding

**Layout**:
- Center: Neumorphic badge icon (navy + gold sphere)
- Below: App name in Bodoni Moda 32px bold
- Below: Subtle loading bar (shimmer animation)
- Safe area insets top/bottom

**Dimensions**: 375×812px (iPhone 11)

**States**:
- Loading (shimmer animation)
- Ready (loading bar complete, auto-transition to Lobby Entry)

**Components Used**:
- Neumorphic Badge Icon (SVG, 120×120px)
- Text: App name
- Loading bar (shimmer effect)

---

### 2. Lobby Entry Screen

**Purpose**: Join a lobby by entering ID and selecting team

**Layout**:
```
┌──────────────────────────────┐
│ Top: Safe area inset (16px)  │
│ Title: "Join Lobby" (H1)      │
├──────────────────────────────┤
│                              │
│ Label: "Lobby ID"            │
│ Input: Text field (inset)    │
│ Placeholder: "e.g. ABC123"   │
│                              │
│ Label: "Your Name"           │
│ Input: Text field (inset)    │
│ Placeholder: "Enter name"    │
│                              │
│ [Select Team Button - lg]    │
│                              │
│ Bottom: Bottom nav (56px)    │
└──────────────────────────────┘
```

**Spacing**:
- Title to first input: 24px (lg)
- Between inputs: 16px (md)
- Input height: 44px (touch target)
- Input padding: 12px 16px (md)
- Button to nav: flex-grow

**Components Used**:
- Input (inset neumorphic, gold focus border)
- Button (primary, large)

**States**:
- Empty (inputs focused)
- Filled
- Joining (button disabled, spinner visible)

---

### 3. Team Selection Grid

**Purpose**: Pick one of 10 IPL franchises

**Layout**:
```
┌──────────────────────────────┐
│ Top: Safe area (16px)        │
│ Title: "Select Your Team"    │
├──────────────────────────────┤
│                              │
│  [CSK] [MI]                  │ Row 1
│  [RCB] [KKR]                 │
│  [DC]  [RR]                  │
│  [SRH] [LSG]                 │
│  [GT]  [PBKS]                │
│                              │
│ Bottom: Bottom nav (56px)    │
└──────────────────────────────┘
```

**Grid Specs**:
- 2 columns
- Column gap: 16px (md)
- Row gap: 16px (md)
- Card size: ~165px × 80px (equal aspect ratio)
- Card padding: 12px (sm)

**Card Content** (per team):
- Team color block (left border, 4px thick)
- Team badge/logo area (if available, else solid color)
- Team name (centered, DM Sans 14px)
- Team abbreviation (CSK, MI, etc.)

**Components Used**:
- Team Card (2×5 grid)
- Badge with team color

**States**:
- Default (neumorphic raised)
- Hover (shadow deepens)
- Selected (gold border, 2px)

---

### 4. Lobby Waiting Screen

**Purpose**: Wait for other players to join, show countdown

**Layout**:
```
┌──────────────────────────────┐
│ Title: "Lobby: ABC123"       │
│ Subtitle: "Starting in 0:45" │
├──────────────────────────────┤
│                              │
│ 👤 You (CSK) ✓ Ready         │
│                              │
│ 👤 User42 (MI) ⏳ Waiting     │
│                              │
│ 👤 User89 (RCB) ✓ Ready      │
│                              │
│ ⏳ Waiting for 1 more...     │
│                              │
│ [Start Auction] (disabled)   │
│                              │
│ Bottom: Bottom nav (56px)    │
└──────────────────────────────┘
```

**Spacing**:
- Title/subtitle: 8px (sm)
- Player rows: 16px (md) gap
- Each player: 12px (sm) internal spacing
- Button: bottom margin auto (flex)

**Components Used**:
- Player row (avatar + name + team color + status)
- Countdown timer (large, 32px)
- Button (primary, large, disabled state)

**States**:
- Waiting (countdown visible, button disabled)
- Ready (all players joined, button enabled)
- Auto-start (countdown reaches 0)

---

### 5. Auction Card (Center Screen)

**Purpose**: Real-time bidding on player

**Layout**:
```
┌──────────────────────────────┐
│ [TIMER: 0:18]                │ ← Large, gold, shifts color
│  (progress ring)             │ ← Subtle ring around border
│                              │
│ [Flag: IND] Virat Kohli      │ ← Country flag + name
│ CSK (team name below)        │
│                              │
│ Current Bid: ₹15.5cr         │ ← Large, gold (48px)
│                              │
│ Bid Log (scrollable):        │
│ ├─ User42 → ₹14cr           │
│ ├─ User89 → ₹13.5cr         │
│ └─ You → ₹14cr              │
│                              │
│ [Bid ₹50L] [Bid ₹1cr]        │ ← Primary buttons (sm)
│ [Bid ₹1.5cr] [Bid ₹2cr]     │
│                              │
│ [Pass]         [Watchlist]   │ ← Secondary buttons (sm)
│                              │
│ Squad: 9/15 | ₹28.5cr left  │ ← Collapsed info
│                              │
│ Bottom: Bottom nav (56px)    │
└──────────────────────────────┘
```

**Spacing**:
- Timer to player name: 24px (lg)
- Player name to bid: 24px (lg)
- Bid to bid log: 16px (md)
- Bid log height: max 120px (scrollable)
- Bid buttons grid: 2×2, 8px (sm) gap
- Squad info: 16px (md) above bottom nav

**Components Used**:
- Timer (gold text, 48px, color shifts)
- Progress ring (subtle)
- Player card (country flag + name)
- Bid log (scrollable list)
- Bid buttons (primary, small, increment-only)
- Pass button (secondary, small)
- Watchlist button (tertiary)
- Squad info card (collapsed)

**States**:
- Default (waiting for bid)
- Outbid (card shake 3px, gold flash 250ms)
- Timer warning (last 5s, color gold → orange → red)
- Passed (toast "Passed on [Player]")
- Player sold (card dismiss, next auto-pops)

---

### 6. Squad Building (Starting XI Selection)

**Purpose**: Choose 11 of 15 drafted players to play first match

**Layout**:
```
┌──────────────────────────────┐
│ Title: "Select Your XI"      │
│ Subtitle: "Choose 11 of 15"  │
├──────────────────────────────┤
│                              │
│ Budget Card (collapsed above)│
│ 9/15 drafted | ₹28.5cr left │
│                              │
│ Player List (scrollable):    │
│ ┌──────────────────────────┐ │
│ │ [Flag] Kohli ₹15cr [BAT] │ │ ← Compact card
│ │ CSK | ✓ Playing | C (Cap)│ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ [Flag] Dhoni ₹12cr [WK]  │ │ ← VC badge visible
│ │ CSK | ✓ Playing | VC     │ │
│ └──────────────────────────┘ │
│                              │
│ [← Bench player (unchecked)] │
│                              │
│ [Review Squad] [Ready to Play]
│                              │
│ Bottom: Bottom nav (56px)    │
└──────────────────────────────┘
```

**Player Card Specs**:
- Compact: 3 per row (max 100% width)
- Height: ~80px
- Layout: [Flag] Name | Price | [Role Icon]
- Second line: Team | Status | Captain/VC badge
- Checkmark: top-right corner (20px)
- Tap behavior: Check/uncheck; tap captain badge to toggle C/VC

**Budget Card**:
- Sticky to top when scrolling
- Show: 9/15 | ₹28.5cr remaining
- Show constraints: "Max Foreign: 2/4 ✓"

**Components Used**:
- Player card (compact, with checkmark)
- Captain/VC badge (inline, tap to toggle)
- Budget card (stat card, sticky)
- Button (primary, large)

**States**:
- Unselected (no checkmark, neutral opacity)
- Selected (checkmark visible, gold outline)
- Captain (C badge, gold highlight)
- Vice-captain (VC badge, gold highlight)
- Bench (checkbox unchecked, grayed)

---

### 7. League Standings (Mobile)

**Purpose**: View standings, all teams visible

**Layout**:
```
┌──────────────────────────────┐
│ Title: "League Standings"    │
│ Refresh button (top-right)   │
├──────────────────────────────┤
│                              │
│ ┌──────────────────────────┐ │
│ │ 1. [CSK badge] CSK       │ │ ← Card
│ │    Pts: 16 | NRR: +0.412 │ │
│ │    MW: 8 | ML: 0         │ │ (tap for full)
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ 2. [MI badge] MI         │ │
│ │    Pts: 14 | NRR: +0.156 │ │
│ │    MW: 7 | ML: 1         │ │
│ └──────────────────────────┘ │
│                              │
│ [... more teams ...]         │
│                              │
│ Bottom: Bottom nav (56px)    │
└──────────────────────────────┘
```

**Card Specs** (each team):
- Full width with 16px margin
- Height: ~90px
- Layout: Rank | Team badge + name | Key stats (2 rows)
- Stat row 1: "Pts: X | NRR: Y"
- Stat row 2: "MW: X | ML: Y"
- Tap: Expand to full stats modal

**Components Used**:
- Standing card (team badge, stat values)
- Expand icon (chevron, top-right)

**States**:
- Default (card, raised neumorphic shadow)
- Hover (shadow deepens)
- Tap (expand to modal with full table)

---

### 8. Match Simulation (Toss + Scorecard)

**Purpose**: Show toss result, then animated scorecard

**Layout**:
```
┌──────────────────────────────┐
│ Toss: CSK won, chose BATTING │ ← Header card
├──────────────────────────────┤
│                              │
│ CSK Innings:                 │ (animates in, 1–2s)
│ 156/4 (20 overs)            │
│ Kohli 72 | Dhoni 48         │
│                              │
│ ────────────────────────────  │ ← Divider
│                              │
│ MI Innings:                  │ (follows after CSK)
│ 142 all out (19.2 overs)    │
│ Bumrah 2/28 | Chahar 2/26   │
│                              │
│ ────────────────────────────  │
│                              │
│ Result: CSK won by 14 runs   │
│ MoM: Kohli (CSK) [gold]      │
│                              │
│ Bottom: Bottom nav (56px)    │
└──────────────────────────────┘
```

**Animation**:
- Toss card appears (static)
- CSK innings animates in over 600ms (ease-out)
- Pause 200ms
- MI innings animates in over 600ms
- Result reveal at 1200ms total

**Components Used**:
- Toss result card (header)
- Innings card (score + top performers)
- Result card (winner + MoM)

**States**:
- Toss shown
- CSK innings animated in
- MI innings animated in
- Result revealed

---

### 9. Match Results (League)

**Purpose**: Simple result summary

**Collapsed State**:
```
┌──────────────────────────────┐
│ CSK 168 - MI 142             │ ← Team badges + scores
│ [Tap to expand]              │
└──────────────────────────────┘
```

**Expanded State** (on tap):
```
┌──────────────────────────────┐
│ CSK 168 - MI 142             │
├──────────────┬───────────────┤
│ CSK          │ MI            │
├──────────────┼───────────────┤
│ 🏏 Kohli 72  │ 🏏 Sharma 45  │
│ ⚾ Bumrah 2/28 │ ⚾ Chahar 2/26 │
├──────────────┴───────────────┤
│ 👑 MoM: Kohli (CSK) [gold]   │
└──────────────────────────────┘
```

**Spacing**:
- Collapsed: Full width card, 56px height
- Expanded: Same, but 180px height, 2-column grid inside
- Column gap: 16px (md)

**Components Used**:
- Collapsed card (team badges + scores)
- Expanded grid (2 columns, top performers + MoM)

**States**:
- Collapsed (tap-to-expand indicator)
- Expanded (tap-to-collapse)

---

### 10. Results Tab (List of Matches)

**Purpose**: Browse all completed matches

**Layout**:
```
┌──────────────────────────────┐
│ Title: "Results"             │
│ Filter: [League] [Elim] (tabs)
├──────────────────────────────┤
│                              │
│ Date: Match 10 (League)      │ ← Match header
│ CSK 168 - MI 142 [Tap]       │ ← Collapsed result
│                              │
│ Date: Match 11 (League)      │
│ RCB 145 - DC 152 [Tap]       │
│                              │
│ ──────────────────────────────
│ Date: Eliminator (Knockout)  │
│ CSK 175 - RCB 140 [Tap]      │
│                              │
│ Bottom: Bottom nav (56px)    │
└──────────────────────────────┘
```

**Match Row**:
- Date/Match number (caption)
- Result card (collapsed, as above)
- Tap to open full result modal

**Filter Tabs**:
- "League" (default)
- "Eliminator" (shows only knockout matches)

**Components Used**:
- Match row (date + collapsed result)
- Filter tabs

**States**:
- League matches shown
- Eliminator tab selected shows knockouts
- Tap result → expand to 2-column grid

---

### 11. Awards

**Purpose**: Display end-of-season awards

**Layout**:
```
┌──────────────────────────────┐
│ Title: "Season Awards"       │
│ Subtitle: "Season concluded" │
├──────────────────────────────┤
│                              │
│ ┌──────────────────────────┐ │
│ │ 👑 Man of the Match      │ │ ← Award card
│ │ Award                    │ │
│ │ Kohli (6 times)          │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ 🏏 Most Runs             │ │
│ │ Award                    │ │
│ │ Kohli (892 runs)         │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ ⚾ Most Wickets          │ │
│ │ Award                    │ │
│ │ Bumrah (18 wickets)      │ │
│ └──────────────────────────┘ │
│                              │
│ [... more awards ...]        │
│                              │
│ Bottom: Bottom nav (56px)    │
└──────────────────────────────┘
```

**Award Card Specs**:
- Full width minus 16px margin
- Height: ~100px
- Grid: 3 cards per screen on scroll
- Icon + Award name (H2)
- Winner name + stat
- Background: neumorphic raised

**Components Used**:
- Award card (icon + title + stat)

**States**:
- Default (neumorphic raised)
- Hover (shadow deepens)

---

### 12. Season Recap (Auto-shown Post-Season)

**Purpose**: Summary of user's performance

**Layout**:
```
┌──────────────────────────────┐
│ Title: "Season Recap"        │
│ Your Final Rank: 3rd         │ ← Large, prominent
│ Out of 8 players             │
├──────────────────────────────┤
│                              │
│ Total Points: 847            │ ← Stat
│ Squad Value: ₹98.2cr        │
│ Avg Player Price: ₹6.5cr    │
│                              │
│ Best Player: Kohli (192 pts) │
│ Worst Player: [Name]         │
│                              │
│ Best Match: vs MI (95 pts)   │
│ Worst Match: vs DC (12 pts)  │
│                              │
│ [Browse All Profiles]        │
│ [Start New Season]           │
│                              │
│ Bottom: Bottom nav (56px)    │
└──────────────────────────────┘
```

**Spacing**:
- Rank display: 24px below title
- Stat cards: 16px (md) gap
- Button spacing: 16px (md)

**Components Used**:
- Rank display (large, centered)
- Stat cards (key-value pairs)
- Button (primary, large)

**States**:
- Post-season only
- Auto-shown on season end

---

## Desktop Wireframe Specifications (1024px+)

All desktop screens add a left sidebar navigation. Content area expands to fill remaining space.

### Navigation Sidebar (Left, Always Visible)

**Specs**:
- Width: 240px (fixed)
- Height: 100vh
- Background: Navy (#001d3d)
- Tabs: Vertical list (Squad | League | Simulate | Results | Awards)
- Tab height: 56px
- Tab styling: Gold accent on active tab (left 4px border)

**Layout**:
```
┌─────────────┬─────────────────────────────┐
│ [Squad   ]  │                             │
│ [League  ]  │                             │
│ [Simulate]  │  Content area (responsive) │
│ [Results ]  │                             │
│ [Awards  ]  │                             │
│             │                             │
│             │                             │
└─────────────┴─────────────────────────────┘
```

### Desktop Screens (1024px+)

**General Changes**:
1. Add sidebar (240px) + content (784px minimum)
2. Expand cards to full width where appropriate
3. Use 2-column layouts for card grids
4. Convert tables to full IPL-standard format
5. Increase padding/spacing proportionally (16px base maintained)

#### League Standings (Desktop)

**Changes from Mobile**:
- Convert card-based to full IPL-standard table
- Columns: Rank | Team | Matches | Wins | Losses | Points | NRR | Runs | Wickets
- Horizontal scroll if needed (or sticky left columns on desktop)
- Sortable column headers (tap to sort)

**Example**:
```
┌──────────────────────────────────────────────────────┐
│ Rank │ Team │ Mat │ W  │ L  │ Pts │ NRR    │ Runs  │
├──────────────────────────────────────────────────────┤
│ 1    │ CSK  │ 9   │ 8  │ 1  │ 16  │ +0.412 │ 1456  │
│ 2    │ MI   │ 9   │ 7  │ 2  │ 14  │ +0.156 │ 1389  │
│ ...  │ ...  │ ... │ ... │ ... │ ... │ ...    │ ...   │
└──────────────────────────────────────────────────────┘
```

#### Auction Card (Desktop)

**Changes from Mobile**:
- Center card may expand to 600px width
- Bid log may expand to show more recent bids (5–7 vs. 3–5)
- Squad info sidebar on the right (200px, sticky)

#### Results (Desktop)

**Changes from Mobile**:
- Expand results list to 2 columns (each result takes ~380px)
- Match header + result card side by side per row
- Filter tabs at top

---

## Component Library Specifications

Create these reusable components in Figma:

### Buttons (3 Sizes × 3 Variants)

**Primary Button**:
- Colors: Background gold (#ffc300), Text dark navy (#001d3d)
- States: Default (raised shadow), Hover (shadow deepens), Active (pressed, shadow inverts), Disabled (opacity 50%)
- Sizes: Small (32px), Medium (44px), Large (56px)

**Secondary Button**:
- Colors: Background dark navy (#001d3d) with neumorphic shadow, Text gold (#ffc300), Border gold (1px)
- States: Same as primary
- Sizes: Small (32px), Medium (44px), Large (56px)

**Tertiary Button**:
- Colors: Transparent background, Text gold (#ffc300)
- States: Same as primary
- Sizes: Small (32px), Medium (44px), Large (56px)

### Cards

**Player Card**:
- Layout: [Team color left border 4px] [Flag Icon 32px] Name | Price | Role Icon
- Size: Compact (140px × 80px), Full (responsive)
- Shadow: Raised (default), Subtle (secondary)
- States: Default, Hover, Selected (gold border 2px), Disabled (opacity 50%)

**Result Card**:
- Layout: Team badges | Scores | Expanded: 2-column grid (batsman/bowler)
- States: Collapsed, Expanded

**Budget Stat Card**:
- Layout: "Squad: 9/15" | "₹71.5cr spent | ₹28.5cr remaining" | Roster constraints
- Shadow: Subtle
- Sticky on mobile

**Award Card**:
- Layout: Icon | Award name (H2) | Winner name + stat
- Shadow: Raised (default)
- States: Default, Hover (shadow deepens)

### Badges & Chips

**Team Color Badge**:
- Shape: Circle or square (16×16px)
- Color: Official IPL franchise color
- Variants: CSK yellow, MI blue, RCB red, etc.

**Role Badge**:
- Text: "BAT", "BOWL", "AR", "WK"
- Background: Gold highlight, dark text
- Size: 24×24px icon + 12px text

**Status Badge**:
- Values: "Available" (green), "Sold" (red), "Captain" (gold)
- Text + icon

### Inputs (Neumorphic Inset Style)

**Text Input**:
- Background: #003566 (recessed)
- Border: None (default), 1px gold (#ffc300) on focus
- Border-radius: 8px
- Padding: 12px 16px (md)
- Height: 44px (touch target)
- Box-shadow: Raised shadow (default), Focus glow (gold)

**Dropdown**:
- Same as text input, plus chevron icon (right side)

**Toggle**:
- Background: Neumorphic dark
- States: Off (left), On (right, gold highlight)
- Size: 48px wide × 24px tall

### States (Reusable Across Components)

**Loading Skeleton**:
- Placeholder card outline
- Shimmer animation (left-to-right, 1.5s loop)

**Empty State**:
- Icon (illustration or symbolic shape)
- Text: "No matches yet"
- Subtext: "Check back soon"
- Button: "Retry"

**Error State**:
- Banner at top: Amber background, dark text
- Icon: Warning symbol
- Text: "Connection unstable. Retrying..."

**Disabled State**:
- Opacity: 50%
- Cursor: Not allowed
- No interaction feedback

---

## Responsive Behavior

### Breakpoints

| Device | Width | Behavior |
|--------|-------|----------|
| Mobile | 375–480px | Single column, bottom nav, card-based lists |
| Tablet | 480–768px | 2-column cards, adjusted spacing |
| Desktop | 1024px+ | Sidebar nav, expanded tables, 2+ column layouts |

### Spacing Scale

| Token | Value | Context |
|-------|-------|---------|
| xs | 4px | Icon padding, micro-spacing |
| sm | 8px | Badge padding, tight gaps |
| md | 16px | Standard padding, card spacing (base) |
| lg | 24px | Section spacing |
| xl | 32px | Major spacing, breathing room |
| 2xl | 48px | Screen-level spacing |

### Safe Area Insets

Mobile:
```css
padding: 
  max(16px, env(safe-area-inset-top))
  max(16px, env(safe-area-inset-right))
  max(16px, env(safe-area-inset-bottom))
  max(16px, env(safe-area-inset-left));
```

---

## Implementation Checklist

### Wireframe Creation
- [ ] 12 mobile screens created (375–480px)
- [ ] 12 desktop screens created (1024px+)
- [ ] Bottom nav (mobile) + sidebar nav (desktop) implemented
- [ ] All screen states documented (default, hover, active, disabled, loading, error)

### Component Library
- [ ] Button (3 sizes × 3 variants)
- [ ] Card variants (player, result, budget, award, generic)
- [ ] Badge & chip components (team, role, status)
- [ ] Input components (text, dropdown, toggle) with states
- [ ] Reusable state components (loading skeleton, empty, error, disabled)

### Annotations
- [ ] Each screen annotated with:
  - Component usage (which button variant, which card style)
  - Content examples (player names, prices, scores)
  - Interaction descriptions (tap behavior, state transitions)
  - Spacing & sizing (use design system tokens)
- [ ] Navigation flows documented (arrows between screens)
- [ ] User flows color-coded (happy path, alternative path, error path)

### Design System Integration
- [ ] Colors referenced from design-system.md (navy, gold, team colors)
- [ ] Typography scale applied (Bodoni Moda headlines, DM Sans body)
- [ ] Spacing tokens used (xs–2xl)
- [ ] Button system applied (3 sizes × 3 variants)
- [ ] Shadow system used (raised, pressed, subtle)

---

## Next Steps

1. **Import to Figma**: Use these specs to build wireframes in the Figma file
2. **Organize Pages**: Create pages for Design System, Mobile, Desktop, Components, Flows
3. **Build Components**: Create reusable component library matching specs above
4. **Add Interactions**: Document navigation flows with arrows/prototypes
5. **Annotate**: Add detailed notes for frontend team
6. **Share with Frontend**: Link the Figma file for implementation reference

---

**Figma File**: [Open in Figma](https://www.figma.com/design/jTtCkPmeTv5UWXTJwCt57O)

For design system reference, see `design-system.md`.
