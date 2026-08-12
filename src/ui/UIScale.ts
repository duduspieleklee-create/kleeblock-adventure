import { UI_CONFIG } from './UIConstants';

export type UIPoint = { x: number; y: number };

export type UIAnchors = {
  topLeft: UIPoint;
  topRight: UIPoint;
  bottomLeft: UIPoint;
  bottomRight: UIPoint;
  center: UIPoint;
};

/**
 * Screen anchors from logical game size (not window dimensions).
 * Recalculate only on RESIZE.
 */
export function getUIAnchors(width: number, height: number, margin = UI_CONFIG.MARGIN): UIAnchors {
  return {
    topLeft: { x: margin, y: margin },
    topRight: { x: width - margin, y: margin },
    bottomLeft: { x: margin, y: height - margin },
    bottomRight: { x: width - margin, y: height - margin },
    center: { x: width / 2, y: height / 2 },
  };
}

/** Round to integer pixels to reduce blur/jitter. */
export function roundPos(x: number, y: number): UIPoint {
  return { x: Math.round(x), y: Math.round(y) };
}

/** Minimum recommended touch target (logical px). */
export const TOUCH_TARGET_MIN = 48;
