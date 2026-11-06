---
name: IPL Cricket Simulator
description: A fantasy IPL season played in one shared lobby, staged as a floodlit stadium at night.
colors:
  turf-night: "#0b2116"
  turf-deep: "#0f2d1e"
  turf-shadow: "#050f0a"
  floodlight-ochre: "#e8a33d"
  ochre-bright: "#f0b55a"
  chalk: "#f4f1e8"
  chalk-muted: "#c5cdbf"
  lime: "#9fdc6a"
  amber: "#f2a65a"
  red-ball: "#ff6b66"
  floodlight-glow: "rgba(232, 163, 61, 0.22)"
  chalk-glow: "rgba(244, 241, 232, 0.10)"
  stripe-light: "rgba(244, 241, 232, 0.035)"
  stripe-dark: "rgba(0, 0, 0, 0.22)"
  hairline: "rgba(180, 197, 221, 0.16)"
typography:
  display:
    fontFamily: "Bodoni Moda, serif"
    fontSize: "clamp(2.5rem, 1.6rem + 3.6vw, 4rem)"
    fontWeight: 700
    lineHeight: 1.1
  headline:
    fontFamily: "Bodoni Moda, serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.1
  title:
    fontFamily: "Bodoni Moda, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.1
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.16em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "99px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.floodlight-ochre}"
    textColor: "{colors.turf-deep}"
    rounded: "{rounded.sm}"
  button-primary-hover:
    backgroundColor: "{colors.ochre-bright}"
    textColor: "{colors.turf-deep}"
  button-secondary:
    backgroundColor: "{colors.turf-deep}"
    textColor: "{colors.floodlight-ochre}"
    rounded: "{rounded.sm}"
  input-field:
    backgroundColor: "{colors.turf-night}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.sm}"
  card:
    backgroundColor: "{colors.turf-night}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.md}"
    padding: "16px"
  modal:
    backgroundColor: "{colors.turf-night}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.md}"
    padding: "24px"
---

# Design System: IPL Cricket Simulator

## Overview

**Creative North Star: "The Floodlit Pitch"**

The screen is a stadium after dark. Deep turf fills the page, the pitch stripes run faintly beneath it, and warm floodlight drifts across the top of the field. Everything a player needs sits on that dark ground: a card, a bid, a standings row, each one a raised surface lit by ochre. The product's own words, given when the system was reviewed, set the ambition: "one of a kind, very unique, animation-intensive and novel." The look should feel like no other fantasy-sports screen, and the motion is part of that identity rather than an afterthought.

The system is dark-only. The palette was replaced by this stadium-at-night direction; the navy and gold palette in `docs/ui/design-system.md` is retired. Controls are tactile: raised at rest, pressed when active, lit by an ochre focus. Decoration (floodlight, chalk glow, stripes) lives behind content and never behind text. Density stays moderate, because a season is read over several sessions rather than in one glance.

**Key Characteristics:**
- Dark turf surfaces with ochre as the single warm accent.
- Tactile, raised controls that press in on use.
- Animation-led identity: a slow-drifting stadium background, a sheen sweep on buttons, and a live pulse on the broadcast frame. Each is off under reduced motion.
- Bodoni headings with DM Sans body copy, for a broadcast-grade contrast between display and text.

## Colors

A dark, warm-lit palette: turf greens for surfaces, ochre for the accent, chalk for text, and three status colours that read as sport (lime for available, amber for warnings, red ball for sold or unavailable).

### Primary
- **Floodlight Ochre** (#e8a33d): The accent for primary CTAs, focus rings, the captain marker, and role badges. Primary buttons put Turf Deep text on it. It is 7.8:1 on Turf Night.
- **Ochre Bright** (#f0b55a): The hover and pressed lift of Floodlight Ochre, and the captain status badge.

### Secondary
- **Turf Deep** (#0f2d1e): The raised surface for secondary buttons and the tab track. Chalk text is 13.2:1 on it.
- **Red Ball** (#ff6b66): Error and unavailable or sold states. 6.1:1 on Turf Night and 5.3:1 on Turf Deep, so it works for text too.

### Tertiary
- **Lime** (#9fdc6a): Available and success. 10.4:1 on Turf Night.
- **Amber** (#f2a65a): Warnings and the connection banner. 8.4:1 on Turf Night.

### Neutral
- **Turf Night** (#0b2116): The page and card surface, and the input field fill. Chalk text is 15.0:1 on it.
- **Turf Shadow** (#050f0a): The deepest green, used for the modal backdrop and shadow depth.
- **Chalk** (#f4f1e8): Body text. 15.0:1 on Turf Night.
- **Chalk Muted** (#c5cdbf): Secondary text. 10.3:1 on Turf Night.
- **Hairline** (rgba 180, 197, 221 at 0.16): Row dividers. Structure only, never text.
- **Floodlight Glow** (rgba 232, 163, 61 at 0.22), **Chalk Glow** (rgba 244, 241, 232 at 0.10), **Stripe Light** and **Stripe Dark**: Decorative background layers for the stadium. None carries text.

### Named Rules
**The Behind-The-Play Rule.** Decorative light and stripes sit behind content and never behind text. The stadium is scenery, and the scoreboard stays in front of it.

**The Ink-On-Ochre Rule.** Ochre is a fill, so text on it is Turf Deep, never chalk. Primary buttons follow this rule.

## Typography

**Display Font:** Bodoni Moda (with serif fallback)
**Body Font:** DM Sans (with sans-serif fallback)
**Label/Mono Font:** None. Labels use DM Sans in uppercase.

**Character:** A high-contrast Didone display face sets the headings with the drama of a stadium programme, while DM Sans keeps the working copy plain and legible.

### Hierarchy
- **Display** (700, fluid 40px to 64px, 1.1): Step titles on the broadcast frame.
- **Headline** (700, 32px, 1.1): Page headings. Section headings use a fluid 24px to 32px.
- **Title** (400, 24px, 1.1): Card and modal titles, Bodoni at the regular weight.
- **Lead** (1.25rem, 1.5): Introductory copy and the lead line under a title.
- **Body** (400, 16px, 1.5): Running copy. Keep lines between 65 and 75 characters.
- **Label** (600, 12px, 0.16em, uppercase): The eyebrow above a broadcast heading. This is under review; see Do's and Don'ts.
- **Readout** (fluid 36px to 52px): The large live numbers, such as the current bid.

### Named Rules
**The Two-Voice Rule.** Bodoni speaks only in headings and readouts. DM Sans carries everything a player reads to act on.

## Layout

The app shell is a single column capped at 1024px. Phones run from 320px, tablets from 768px, and desktops from 1024px, the breakpoints in `ARCHITECTURE.md`. Franchise cards sit in a grid whose minimum column is 14rem, with 12px between cards. Spacing follows a 4px base: 4, 8, 16, 24, 32, and 48px, with 12px vertical padding on inputs. Touch targets are at least 44px. The tab bar is 54px tall. On phones, tab labels drop to 1rem so "Development" fits a 320px bar; from 768px they rise to 1.25rem.

## Elevation & Depth

The system is tactile, not flat. Raised shadows (a soft offset with a faint inner highlight) show that a control can be pressed. Pressed shadows (inset) show that it is active or focused. Shadows always carry an offset and a blur. A focused input adds a faint ochre glow to its inset shadow, which is the only glow used on a control.

### Shadow Vocabulary
- **Raised** (`box-shadow: 0 8px 16px rgba(0,8,20,0.2), inset 0 2px 4px rgba(255,255,255,0.1)`): Buttons, cards, modals, and the tab track at rest.
- **Raised Hover** (`box-shadow: 0 12px 24px rgba(0,8,20,0.28), inset 0 2px 4px rgba(255,255,255,0.1)`): Primary buttons on hover, under a fine pointer only.
- **Pressed** (`box-shadow: inset 0 4px 8px rgba(0,8,20,0.2), inset 0 -2px 4px rgba(255,255,255,0.1)`): Active buttons and the input field's resting inset.
- **Input Focus** (`box-shadow: 0 4px 8px rgba(0,8,20,0.2), inset 0 2px 4px rgba(0,0,0,0.15), 0 0 4px rgba(255,195,0,0.3)`): Focused inputs.
- **Subtle** (`box-shadow: 0 4px 12px rgba(0,8,20,0.15)`): Secondary elements that need less lift.

### Named Rules
**The Lit-From-Within Rule.** Depth is a response to state. A control is raised at rest, deepens on hover, and presses in when active. Nothing else gets a shadow.

## Shapes

Corners are soft and consistent. Buttons and inputs use an 8px radius, cards and modals 12px, hero panels 16px, and the tab bar a full pill. Borders are 1px hairlines; the team-colour stripe on a card is a 4px edge. The keyboard focus ring is 2px Floodlight Ochre with a 2px offset, so it reads on turf and never disappears into the surface.

## Components

Controls feel physical and confident: they rise at rest, press in on use, and light up in ochre. Motion is part of the identity, but each component still reads as a control first.

### Buttons
- **Shape:** 8px radius (`{rounded.sm}`). Sizes: small 32px, medium 44px (the touch minimum), large 56px for a screen's main action.
- **Primary:** Floodlight Ochre fill with Turf Deep text, a raised shadow, and a sheen that sweeps across once on press and loops while pressed.
- **Hover / Focus:** Hover deepens the shadow and lifts the fill to Ochre Bright, gated to fine pointers so a touch tap does not stick. Focus is a 2px ochre ring with a 2px offset. Active scales the button to 98% for 150ms.
- **Secondary:** Turf Deep surface, ochre text and a 1px ochre border, raised shadow. On hover, the edge lines draw in around the button.
- **Tertiary:** Transparent, ochre text, with corner hairlines that draw on hover.
- **Disabled:** Pointer events off, opacity 50%, the sheen and hover suppressed.

### Chips and Badges
- **Style:** 12px, 600 weight, 8px radius, 4px and 8px padding. Role badges are Floodlight Ochre with Turf Deep text. Team badges are Turf Night with chalk text and a 16px colour swatch.
- **State:** Available is Lime with Turf Deep text, Sold is Red Ball with Turf Deep text, Captain is Ochre Bright with Turf Deep text.

### Cards / Containers
- **Corner Style:** 12px radius.
- **Background:** Turf Night.
- **Shadow Strategy:** Raised at rest. The subtle shadow is for secondary cards.
- **Border:** None by default. A team-colour stripe 4px wide marks a franchise.
- **Internal Padding:** 16px.

### Inputs / Fields
- **Style:** Turf Night fill, chalk text, 8px radius, 1px transparent border, pressed inset shadow, 44px minimum height, 16px text.
- **Focus:** Ochre 1px border and the Input Focus shadow with its ochre glow.
- **Error / Disabled:** Invalid fields get a Red Ball border, and the message beneath says what is wrong, so colour is not the only signal. Disabled is 50% opacity with a not-allowed cursor.
- **Placeholder:** Chalk Muted (10.3:1). The browser default grey was 3.7:1 and has been replaced.

### Tabs
- **Style:** A pill track in Turf Deep with a raised shadow, 12px inset, a 54px tab height. The active tab sits on a Turf Night pill with ochre text.
- **Label:** 16px below 768px, 20px from 768px up.

### Modal
- **Style:** Turf Night dialog, 12px radius, raised shadow, 24px padding, 480px maximum width. The backdrop is solid Turf Shadow.
- **Title:** Bodoni at 24px, regular weight.
- **Close:** A 44px target with ochre text; hover tints it Turf Deep.

### Broadcast Frame and Stadium
- **Stadium background:** Two floodlight glows (ochre and chalk) drift over 36s and 44s on alternating cycles, with the pitch stripes sliding and faint dust rising. All of it is decorative and off under reduced motion.
- **Live indicator:** A pulse on the live dot over 1.5s, stopped under reduced motion.
- **Lower third:** The step title sits on the frame. The lobby entry page has no eyebrow above it.
- **Lobby entry intro:** On load the floodlights rise over 1.2s, the title lifts 24px over 0.8s, and the form card rises 32px and scales from 98% over 0.9s. All of it is off under reduced motion, and the page shows its final state at once.
- **Lobby entry dissolve:** A successful create or join fades the form card up and out over 0.3s while a floodlight wash rises beneath it over 0.45s, then the lobby opens. Under reduced motion the route opens at once, with no wash.
- **Lobby entry panel grid:** With a fine pointer, an 8×6 grid of hairline cells fades in around the pointer, brightest nearest it, and fades out when the pointer leaves the window. The grid is hidden until the pointer moves, and it is off under reduced motion and on touch devices.

## Do's and Don'ts

### Do:
- **Do** take every colour, space, radius, shadow and duration from the `tokens.stylex.ts` variables; never hard-code them in a component.
- **Do** keep text at 4.5:1 or better on its surface, and use Chalk Muted for secondary text on Turf Night.
- **Do** make every animation respect `prefers-reduced-motion`, with a static final state.
- **Do** limit animated properties to `transform`, `opacity`, `color`, `background-color`, `border-color` and `box-shadow`.
- **Do** gate hover effects to `@media (hover: hover)` so touch taps do not leave a stuck state.

### Don't:
- **Don't** put chalk text on Floodlight Ochre. Ink (Turf Deep) on ochre.
- **Don't** place text on the glow, stripe, or floodlight layers.
- **Don't** reintroduce the retired navy and gold palette from `docs/ui/design-system.md`.
- **Don't** animate layout properties (width, height, top, left, margin).
- **Don't** remove the reduced-motion switches from the stadium, the sheen, the live pulse, or the lobby entry motion.

### Under review:
- **The radial floodlight glow** on the stadium background is flagged as a decorative spotlight. It is a deliberate effect from the stadium prototype and is kept until the owner decides.
- **The repeating turf stripes on the page body** are flagged as an advisory decorative gradient. They are intentional texture and are kept until the owner confirms.
- **The 4px team-colour stripe on franchise cards** is a coloured edge accent, which the craft floor refuses on cards. It is the incumbent franchise marker in the prototype grid and is kept until the owner decides whether franchises should be marked another way.
