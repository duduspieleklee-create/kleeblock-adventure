import Phaser from 'phaser';

export class PreloaderScene extends Phaser.Scene {
  private errorText?: Phaser.GameObjects.Text;
  private failedAssets: string[] = [];

  constructor() {
    super({ key: 'PreloaderScene' });
  }

  preload(): void {
    const { width, height } = this.cameras.main;

    // Loading bar background
    const bg = this.add.graphics();
    bg.fillStyle(0x222222, 0.8);
    bg.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    // Loading bar fill
    const bar = this.add.graphics();
    this.load.on('progress', (value: number) => {
      bar.clear();
      bar.fillStyle(0x00ff88, 1);
      bar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    // Enhanced error tracking with detailed logging
    this.load.on('error', (file: unknown, error: unknown) => {
      const fileObj = file as { key?: string };
      const errorObj = error as { message?: string };
      const assetKey = fileObj?.key || 'unknown';
      const errorMsg = errorObj?.message || String(error);
      this.failedAssets.push(assetKey);
      console.error(`[Preloader] Asset load failed: ${assetKey}`, errorMsg);

      // Update error display
      if (this.errorText) {
        this.errorText.setText(`⚠ Failed: ${assetKey}\nContinuing...`);
      }
    });

    // Timeout with graceful fallback
    this.time.addEvent({
      delay: 10_000,
      callback: () => {
        if (this.scene.isActive('PreloaderScene')) {
          if (this.failedAssets.length > 0) {
            console.warn('[Preloader] Timed out with failed assets:', this.failedAssets);
          } else {
            console.warn('[Preloader] Timed out — forcing menu');
          }
          this.scene.start('MainMenuScene');
        }
      },
    });

    // Loading text
    this.add
      .text(width / 2, height / 2 + 40, 'Loading...', {
        fontSize: '16px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    // Error display (hidden by default)
    this.errorText = this.add
      .text(width / 2, height / 2 + 70, '', {
        fontSize: '10px',
        color: '#ff6b6b',
        align: 'center',
      })
      .setOrigin(0.5);
    this.errorText.setVisible(false);

    // --- Tilesets ---
    try {
      this.load.image('sunnyside', 'assets/tilesets/spr_tileset_sunnysideworld_16px.png');
    } catch (e) {
      console.error('[Preloader] Failed to queue tileset:', e);
    }

    // --- Tilemap JSON ---
    try {
      this.load.tilemapTiledJSON('island', 'assets/tilemaps/island.json');
    } catch (e) {
      console.error('[Preloader] Failed to queue tilemap:', e);
    }

    // --- Sunnyside Human character (96x64 frames) ---
    try {
      this.load.spritesheet('ss_idle', 'assets/characters/sunnyside/base_idle_strip9.png', {
        frameWidth: 96,
        frameHeight: 64,
      });
      this.load.spritesheet('ss_walk', 'assets/characters/sunnyside/base_walk_strip8.png', {
        frameWidth: 96,
        frameHeight: 64,
      });
      this.load.spritesheet('ss_run', 'assets/characters/sunnyside/base_run_strip8.png', {
        frameWidth: 96,
        frameHeight: 64,
      });
    } catch (e) {
      console.error('[Preloader] Failed to queue character spritesheets:', e);
    }
  }

  create(): void {
    // Log asset loading summary
    if (this.failedAssets.length > 0) {
      console.warn('[Preloader] Loading completed with failures:', this.failedAssets);
      this.errorText?.setVisible(true);
      this.errorText?.setText(
        `⚠ ${this.failedAssets.length} asset(s) failed to load.\nGame may have visual issues.`,
      );

      // Delay transition to allow user to see the warning
      this.time.addEvent({
        delay: 2000,
        callback: () => {
          this.scene.start('MainMenuScene');
        },
      });
    } else {
      console.log('[Preloader] All assets loaded successfully');
      this.scene.start('MainMenuScene');
    }
  }
}
