/**
 * How long each key moment of a playoff match stays before the next one is revealed. A playoff
 * match runs within about five seconds (docs/game-design.md section 6), so the moments come
 * quickly; a guest can skip to the result at any time.
 */
export const MATCH_LOG_EVENT_MS = 170;

/**
 * How long a finished match log waits before the next playoff match is revealed, so a result
 * can be read before the next match starts.
 */
export const MATCH_LOG_PAUSE_MS = 1500;
