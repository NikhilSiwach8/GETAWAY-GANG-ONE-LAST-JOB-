/**
 * A scene's environment as one unit: its container (art pixel space), its controllers, and a cross-fade.
 * The group only updates its controllers while it is visible, so inactive scenes cost nothing.
 */
import * as PIXI from 'pixi.js';
import type { EnvController, EnvFrame } from './director';

export class SceneGroup implements EnvController {
	readonly container = new PIXI.Container();
	private controllers: EnvController[] = [];
	private alpha = 0;
	private target = 0;

	constructor(
		build: (root: PIXI.Container) => EnvController[],
		private fadeSeconds = 0.6,
	) {
		this.controllers = build(this.container);
		this.container.alpha = 0;
		this.container.visible = false;
	}

	set active(on: boolean) {
		this.target = on ? 1 : 0;
	}

	update(f: EnvFrame) {
		if (this.alpha !== this.target) {
			const step = f.dt / this.fadeSeconds;
			this.alpha = this.target > this.alpha ? Math.min(this.target, this.alpha + step) : Math.max(this.target, this.alpha - step);
			this.container.alpha = this.alpha;
		}
		this.container.visible = this.alpha > 0;
		if (!this.container.visible) return;
		for (const c of this.controllers) c.update(f);
	}

	destroy() {
		for (const c of this.controllers) c.destroy?.();
		this.controllers = [];
		if (!this.container.destroyed) this.container.destroy({ children: true });
	}
}
