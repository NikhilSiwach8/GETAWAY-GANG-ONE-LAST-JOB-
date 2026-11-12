/**
 * The live environment (src/game/env) replaces the pre-rendered BG-*-LOOP videos: sharper at every screen
 * size, reacting in real time, and without a full-HD video decode every frame. Set true to bring the videos
 * back underneath the live layer (they are still shipped in the build).
 */
export const BG_VIDEO_LOOPS = false;
