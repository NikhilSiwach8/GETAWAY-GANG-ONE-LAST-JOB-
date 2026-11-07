import {staticFile} from 'remotion';

/** Production art processed by art/process_assets.py (copied from frontend/getaway_gang/static/assets/gg). */
export const art = (id: string) => staticFile(`gg/${id}.webp`);

export const CREW = {
	R: {name: 'ROXY', ability: 'LANE SWITCH', color: '#FF4C36', pose: 'CHR-ROXY-POSE', badge: 'SYM-ROXY'},
	B: {name: 'BYTE', ability: 'SYSTEM CLONE', color: '#A34BFF', pose: 'CHR-BYTE-POSE', badge: 'SYM-BYTE'},
	T: {name: 'TANK', ability: 'VAULT BREAKER', color: '#FFA12B', pose: 'CHR-TANK-POSE', badge: 'SYM-TANK'},
	F: {name: 'FUSE', ability: 'BIG BANG UPGRADE', color: '#28B9EF', pose: 'CHR-FUSE-POSE', badge: 'SYM-FUSE'},
} as const;
export type CrewKey = keyof typeof CREW;

export const GOLD = '#F7C947';
export const NAVY = '#0D1530';

export const SYMBOLS = [
	'SYM-H1', 'SYM-H2', 'SYM-H3', 'SYM-H4', 'SYM-L1', 'SYM-L2', 'SYM-L3', 'SYM-L4',
	'SYM-WILD', 'SYM-SCATTER', 'SYM-ROXY', 'SYM-BYTE', 'SYM-TANK', 'SYM-FUSE',
] as const;
