/**
 * Texture quality defaults, set before any texture is created.
 * The art is stored at 2× its largest on-screen size; mipmaps + trilinear filtering keep it smooth when
 * it is drawn smaller (no shimmering or jagged edges), and anisotropy keeps scaled sprites crisp.
 * Video textures opt out in clips.svelte.ts (regenerating mipmaps for every frame would cost a lot).
 */
import * as PIXI from 'pixi.js';

PIXI.TextureSource.defaultOptions.autoGenerateMipmaps = true;
PIXI.TextureSource.defaultOptions.scaleMode = 'linear';
PIXI.TextureSource.defaultOptions.mipmapFilter = 'linear';
PIXI.TextureSource.defaultOptions.maxAnisotropy = 8;
