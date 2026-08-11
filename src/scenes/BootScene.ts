import Phaser from 'phaser';

const MIN_VIEWPORT = 320;

/**
 * BootScene
 *
 * First scene. Validates that the visible game area is at least
 * 320×320 and, on mobile, that the device is in portrait mode.
 * If either check fails, it shows an overlay instead of advancing.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    if (this.checkLayout()) {
      this.scene.start('PreloaderScene');
    }
  }

  private checkLayout(): boolean {
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (!Number.isFinite(w) || !Number.isFinite(h) || w === 0 || h === 0) {
      return false;
    }

    const tooSmall = Math.min(w, h) < MIN_VIEWPORT;
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const landscape = isMobile && w > h;

    if (tooSmall || landscape) {
      this.showGateOverlay(tooSmall, landscape, w, h);
      return false;
    }

    return true;
  }

  private showGateOverlay(tooSmall: boolean, landscape: boolean, w: number, h: number): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, w, h);
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
      .text(w / 2, h / 2, lines.join('\n'), {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5)
      .setDepth(100000);

    this.scale.once('resize', () => {
      overlay.destroy();
      text.destroy();
      if (this.checkLayout()) {
        this.scene.start('PreloaderScene');
      } else {
        this.showGateOverlay(
          Math.min(window.innerWidth, window.innerHeight) < MIN_VIEWPORT,
          /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) && window.innerWidth > window.innerHeight,
          window.innerWidth,
          window.innerHeight,
        );
      }
    });
  }
}
