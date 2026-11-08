/**
 * The −/+ ends of the UI-BET plate, as fractions of the plate's width: centre offset from the plate centre
 * (dx for +, −dx for −; dy downwards) and the square zone size. Measured from the art (2000×667: the −
 * button is x 120–480, y 220–580), matching the UI-BET-MINUS / UI-BET-PLUS crops drawn on top.
 */
export const BET_ZONE = { dx: 0.35, dy: 0.1 * (667 / 2000), size: 0.18 } as const;
