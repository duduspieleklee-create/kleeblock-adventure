import Phaser from 'phaser';
import { BASE_WIDTH, BASE_HEIGHT } from '../config/GameConfig';
import { UI_CONFIG, TEXT_STYLES } from '../ui/UIConstants';

const MIN_VIEWPORT = 320;

/**
 * BootScene
 *
 * First scene. Waits for GameFont (Milestone 3.2), validates viewport,
 * then advances to PreloaderScene.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.logScaleDimensions();

    void this.bootSequence();
  }

  private async bootSequence(): Promise<void> {
    await this.waitForFonts();

    // Give Phaser one more frame to settle display size after font load
    this.time.delayedCall(50, () => {
      if (this.checkLayout()) {
        this.scene.start('PreloaderScene');
      }
    });
  }

  /** Milestone 3.2 — avoid layout jump from late font load. */
  private async waitForFonts(): Promise<void> {
    try {
      if (typeof document !== 'undefined' && document.fonts) {
        // Explicitly request the game face so we do not proceed on fallback metrics only.
        await document.fonts.load(`16px ${UI_CONFIG.FONT_FAMILY}`);
        await document.fonts.ready;

        if (import.meta.env.DEV) {
          const loaded = document.fonts.check(`16px GameFont`);
          console.log('[Boot] GameFont ready:', loaded);
        }
      }
    } catch (err) {
      console.warn('[Boot] Font wait failed; continuing with fallback metrics', err);
    }
  }

  private logScaleDimensions(): void {
    if (!import.meta.env.DEV) return;

    console.log('[Boot] Expected logical size:', BASE_WIDTH, '×', BASE_HEIGHT);
    console.log(
      '[Boot] Logical game size:',
      this.scale.gameSize.width,
      '×',
      this.scale.gameSize.height,
    );
    console.log(
      '[Boot] Display size:',
      this.scale.displaySize.width,
      '×',
      this.scale.displaySize.height,
    );
    console.log('[Boot] Canvas:', this.game.canvas?.width, '×', this.game.canvas?.height);
  }

  private checkLayout(): boolean {
    // Use Phaser's game size (logical canvas size) which accounts for scale mode
    // displaySize includes CSS scaling; gameSize is the actual game resolution
    const w = this.scale.gameSize.width;
    const h = this.scale.gameSize.height;

    console.log('[Boot] checkLayout:', w, '×', h, 'min=', Math.min(w, h), 'tooSmall=', Math.min(w, h) < MIN_VIEWPORT);

    if (!Number.isFinite(w) || !Number.isFinite(h) || w === 0 || h === 0) {
      console.log('[Boot] Invalid dimensions, aborting');
      return false;
    }

    const tooSmall = Math.min(w, h) < MIN_VIEWPORT;
    // Only enforce landscape lock on actual mobile devices with small screens
    // Desktop browsers with "mobile" in UA (e.g. dev tools device emulation) should not trigger
    const isMobileDevice = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const isSmallScreen = Math.max(w, h) <= 1024;
    const isMobile = isMobileDevice && isSmallScreen;
    // Only show rotate prompt on mobile portrait devices that are in landscape orientation
    const needsPortrait = isMobile && w > h;

    console.log('[Boot] tooSmall=', tooSmall, 'isMobile=', isMobile, 'needsPortrait=', needsPortrait);

    if (tooSmall || needsPortrait) {
      this.showGateOverlay(tooSmall, needsPortrait);
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

    this.add
      .text(Math.round(width / 2), Math.round(height / 2), lines.join('\n'), {
        ...TEXT_STYLES.body,
        fontSize: '18px',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5)
      .setDepth(100000);

    this.scale.once('resize', () => {
      // Debounce: wait for resize to settle before restarting
      this.time.delayedCall(100, () => {
        this.scene.restart();
      });
    });
  }
}
