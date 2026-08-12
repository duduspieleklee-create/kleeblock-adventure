import Phaser from 'phaser';
import { BASE_WIDTH, BASE_HEIGHT } from '../config/GameConfig';

const MIN_VIEWPORT = 320;

/**
 * BootScene
 *
 * First scene. Validates that the browser viewport is at least
 * 320×320 and, on mobile, prefers portrait. Uses Phaser logical
 * size for drawing overlays (not window dimensions as gameplay coords).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.logScaleDimensions();

    if (this.checkLayout()) {
      this.scene.start('PreloaderScene');
    }
  }

  /** Milestone 1.4 — verify logical vs display size. */
  private logScaleDimensions(): void {
    if (!import.meta.env.DEV) return;

    console.log('[Boot] Expected logical size:', BASE_WIDTH, '×', BASE_HEIGHT);
    console.log('[Boot] Logical game size:', this.scale.gameSize.width, '×', this.scale.gameSize.height);
    console.log('[Boot] Display size:', this.scale.displaySize.width, '×', this.scale.displaySize.height);
    console.log('[Boot] Canvas:', this.game.canvas?.width, '×', this.game.canvas?.height);
  }

  private checkLayout(): boolean {
    // Browser viewport check only — not used as gameplay coordinates.
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (!Number.isFinite(w) || !Number.isFinite(h) || w === 0 || h === 0) {
      return false;
    }

    const tooSmall = Math.min(w, h) < MIN_VIEWPORT;
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const landscape = isMobile && w > h;

    if (tooSmall || landscape) {
      this.showGateOverlay(tooSmall, landscape);
      return false;
    }

    return true;
  }

  private showGateOverlay(tooSmall: boolean, landscape: boolean): void {
    const { width, height } = this.scale.gameSize;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(99999);

    const lines: string[] = [];
    if (tooSmall) {
      lines.push('This game needs at least');
      lines.push('320 × 320 to play.');
    }
    if (landscape) {
      lines.push('Please rotate your device');
      lines.push('to portrait mode.');
    }
    lines.push('');
    lines.push('Resize or rotate to continue.');

    const text = this.add
      .text(Math.round(width / 2), Math.round(height / 2), lines.join('\n'), {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5)
      .setDepth(100000);

    this.scale.once('resize', () => {
      overlay.destroy();
      text.destroy();
      if (this.checkLayout()) {
        this.scene.start('PreloaderScene');
      } else {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        this.showGateOverlay(
          Math.min(vw, vh) < MIN_VIEWPORT,
          /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) && vw > vh,
        );
      }
    });
  }
}
