import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

gsap.registerPlugin(useGSAP);

/**
 * How long the submit dissolve runs, in milliseconds. The route waits for it, so
 * the wash finishes before the lobby appears. It matches the wash (450ms) and the
 * card fade (starts at 100ms, runs 300ms).
 */
const DISSOLVE_MS = 450;

/** The panel-grid cell opacity at the pointer, and far from it (prototype B4). */
const PANEL_NEAR = 0.6;
const PANEL_FAR = 0.03;

/** The distance, in pixels, at which a panel cell reaches its far opacity. */
const PANEL_RANGE = 220;

/** The data attributes the motion targets. The hook finds elements by these, not by class. */
const CARD_SELECTOR = "[data-entry-card]";
const WASH_SELECTOR = "[data-entry-wash]";
const CELL_SELECTOR = "[data-entry-cell]";
const FLOODLIGHT_SELECTOR = "[data-floodlight]";
const GRID_SELECTOR = "[data-entry-grid]";
const TITLE_SELECTOR = "main h1";

/** A panel cell and its centre, in viewport pixels as `getBoundingClientRect` reports them. */
type Cell = { el: HTMLElement; x: number; y: number };

/** What {@link useLobbyEntryMotion} returns to the entry component. */
export type LobbyEntryMotion = {
  /** True when the panel grid is on: a fine pointer, and no reduced motion. */
  readonly cursorOn: boolean;
  /**
   * Plays the dissolve, then calls `onRoute` once it has finished. Under reduced
   * motion `onRoute` runs at once. The route is a plain timer, not a GSAP
   * callback, so it still runs if the entry unmounts mid-dissolve.
   */
  readonly playSubmitTransition: (onRoute: () => void) => void;
};

/**
 * Measures every panel cell's centre in viewport pixels. The grid is fixed to the
 * viewport, so these centres change only on resize, not on scroll. Measuring once,
 * and again only on resize, keeps layout reads out of the `pointermove` handler.
 *
 * @param gridEl - The fixed panel grid, which holds the cells.
 * @returns The cells with their centres.
 */
function measureCells(gridEl: HTMLElement): Cell[] {
  return Array.from(
    gridEl.querySelectorAll<HTMLElement>(CELL_SELECTOR),
    (el) => {
      const box = el.getBoundingClientRect();
      return {
        el,
        x: box.left + box.width / 2,
        y: box.top + box.height / 2,
      };
    },
  );
}

/**
 * The intro: the floodlights come up, the title rises, and the form card enters.
 * It runs once on mount. The start states are applied at once, so nothing flashes
 * before the first frame.
 *
 * @param rootEl - The entry root, which holds the form card.
 */
function playIntro(rootEl: HTMLDivElement | null): void {
  const card = rootEl?.querySelector<HTMLElement>(CARD_SELECTOR) ?? null;
  const title = document.querySelector<HTMLElement>(TITLE_SELECTOR);
  const floodlights =
    document.querySelectorAll<HTMLElement>(FLOODLIGHT_SELECTOR);

  const tl = gsap.timeline();
  tl.fromTo(
    floodlights,
    { opacity: 0.35 },
    { opacity: 1, duration: 1.2, ease: "power2.out" },
    0,
  );
  if (title) {
    tl.fromTo(
      title,
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" },
      0.1,
    );
  }
  if (card) {
    tl.fromTo(
      card,
      { y: 32, opacity: 0, scale: 0.98 },
      { y: 0, opacity: 1, scale: 1, duration: 0.9, ease: "expo.out" },
      0.2,
    );
  }
}

/**
 * The motion for the lobby entry: the intro on mount, the submit dissolve, and the
 * panel grid that lights up with the pointer. Every effect is off under reduced
 * motion, and the panel grid is also off without a fine pointer.
 *
 * The hook takes `contextSafe` from {@link useGSAP}'s return value. In
 * `@gsap/react` 2.1.2 the callback receives no such argument, so reading it there
 * would silently do nothing.
 *
 * @param root - The entry root, which is the scope for every selector.
 * @returns Whether the panel grid is on, and the function that plays the submit transition.
 */
export function useLobbyEntryMotion(
  root: RefObject<HTMLDivElement | null>,
): LobbyEntryMotion {
  const reduced = useRef(false);
  const [cursorOn, setCursorOn] = useState(false);

  const { contextSafe } = useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduce: "(prefers-reduced-motion: reduce)",
          fine: "(hover: hover) and (pointer: fine)",
        },
        (context) => {
          const isReduced = context.conditions?.reduce === true;
          reduced.current = isReduced;
          setCursorOn(!isReduced && context.conditions?.fine === true);
          if (!isReduced) {
            playIntro(root.current);
          }
        },
      );
    },
    { scope: root },
  );

  // The dissolve's visuals live in the hook's context, so unmounting reverts them.
  const playVisuals = useMemo(
    () =>
      contextSafe(() => {
        const rootEl = root.current;
        const wash = rootEl?.querySelector<HTMLElement>(WASH_SELECTOR);
        const card = rootEl?.querySelector<HTMLElement>(CARD_SELECTOR);
        if (!wash || !card) {
          return;
        }
        gsap
          .timeline()
          .fromTo(
            wash,
            { opacity: 0 },
            { opacity: 1, duration: 0.45, ease: "power2.out" },
            0,
          )
          .to(
            card,
            { opacity: 0, y: -12, duration: 0.3, ease: "power2.in" },
            0.1,
          );
      }),
    [contextSafe, root],
  );

  const playSubmitTransition = useCallback(
    (onRoute: () => void) => {
      if (reduced.current) {
        onRoute();
        return;
      }
      playVisuals();
      window.setTimeout(onRoute, DISSOLVE_MS);
    },
    [playVisuals],
  );

  // The pointer effect. It runs after the grid has rendered, because `cursorOn`
  // turns the grid on in the same commit that starts this effect. The grid covers
  // the viewport, so the listeners sit on the window: a pointer anywhere on the page
  // lights the panels, not only a pointer over the form card.
  useEffect(() => {
    const rootEl = root.current;
    const gridEl = rootEl?.querySelector<HTMLElement>(GRID_SELECTOR) ?? null;
    if (!cursorOn || !gridEl) {
      return;
    }

    let cells = measureCells(gridEl);
    const cellEls = () => cells.map((cell) => cell.el);

    const onMove = (event: PointerEvent) => {
      // The centres and the pointer are both in viewport pixels, so the move handler
      // does no layout reads and no conversion.
      for (const cell of cells) {
        const distance = Math.hypot(
          cell.x - event.clientX,
          cell.y - event.clientY,
        );
        const opacity = gsap.utils.mapRange(
          0,
          PANEL_RANGE,
          PANEL_NEAR,
          PANEL_FAR,
          Math.min(distance, PANEL_RANGE),
        );
        gsap.to(cell.el, {
          opacity,
          duration: 0.45,
          ease: "power2.out",
          overwrite: "auto",
        });
      }
    };

    const onLeave = () => {
      gsap.to(cellEls(), { opacity: 0, duration: 0.6, overwrite: "auto" });
    };

    // The grid is fixed to the viewport, so its size changes only with the viewport.
    const observer = new ResizeObserver(() => {
      cells = measureCells(gridEl);
    });

    window.addEventListener("pointermove", onMove);
    // `pointerleave` on the document element fires when the pointer leaves the window.
    document.documentElement.addEventListener("pointerleave", onLeave);
    observer.observe(gridEl);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      observer.disconnect();
    };
  }, [cursorOn, root]);

  return { cursorOn, playSubmitTransition };
}
