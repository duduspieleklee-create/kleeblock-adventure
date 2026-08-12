import Phaser from 'phaser';
import { UI_CONFIG, TEXT_STYLES } from '../ui/UIConstants';
import { log } from '../utils/logger';
import { AssetKeys } from '../config/AssetKeys';

export class PreloaderScene extends Phaser.Scene {
  private errorText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private failedAssets: string[] = [];

  constructor() {
    super({ key: 'PreloaderScene' });
  }

  preload(): void {
    const { width, height } = this.scale.gameSize;
    const cx = Math.round(width / 2);
    const cy = Math.round(height / 2);

    const title = this.add
      .text(cx, cy - 80, 'KleeBlock Adventure', {
        fontFamily: UI_CONFIG.FONT_FAMILY,
        fontSize: '22px',
        color: '#f5e6c8',
      })
      .setOrigin(0.5);

    const bg = this.add.graphics();
    bg.fillStyle(0x2a2118, 0.9);
    bg.fillRoundedRect(cx - 160, cy - 20, 320, 28, 6);
    bg.lineStyle(2, 0x8b6914, 1);
    bg.strokeRoundedRect(cx - 160, cy - 20, 320, 28, 6);

    const bar = this.add.graphics();
    this.load.on('progress', (value: number) => {
      bar.clear();
      bar.fillStyle(0x00c878, 1);
      bar.fillRoundedRect(cx - 156, cy - 16, Math.max(4, 312 * value), 20, 4);
      this.statusText?.setText(`Loading… ${Math.round(value * 100)}%`);
    });

    this.statusText = this.add
      .text(cx, cy + 28, 'Loading… 0%', {
        ...TEXT_STYLES.body,
        fontSize: '14px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    this.errorText = this.add
      .text(cx, cy + 56, '', {
        fontFamily: UI_CONFIG.FONT_FAMILY,
        fontSize: '11px',
        color: '#ff6b6b',
        align: 'center',
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.load.on('error', (file: unknown, error: unknown) => {
      const fileObj = file as { key?: string };
      const errorObj = error as { message?: string };
      const assetKey = fileObj?.key || 'unknown';
      const errorMsg = errorObj?.message || String(error);
      this.failedAssets.push(assetKey);
      log.error(`[Preloader] Asset load failed: ${assetKey}`, errorMsg);
      this.errorText?.setVisible(true);
      this.errorText?.setText(`Failed: ${assetKey}`);
    });

    this.time.addEvent({
      delay: 12_000,
      callback: () => {
        if (this.scene.isActive('PreloaderScene')) {
          log.warn('[Preloader] Timed out — forcing menu');
          this.scene.start('MainMenuScene');
        }
      },
    });

    // ── Explicit asset loading (phaser4-gamedev style - better error handling) ──

    // Sunnyside world tileset
    this.load.image(AssetKeys.Tilesets.SUNNYSIDE, 'assets/tilesets/spr_tileset_sunnysideworld_16px.png');

    // Hilau 16×16 RPG Tileset (CC-BY)
    this.load.image(AssetKeys.Tilesets.RPG_TERRAIN, 'assets/tilesets/buildings/1_terrain.png');
    this.load.image(AssetKeys.Tilesets.RPG_BUILDINGS, 'assets/tilesets/buildings/4_buildings.png');
    this.load.image(AssetKeys.Tilesets.RPG_ROOFS, 'assets/tilesets/buildings/11_roofs.png');
    this.load.image(AssetKeys.Tilesets.RPG_INDOORS, 'assets/tilesets/buildings/2_indoors.png');
    this.load.image(AssetKeys.Tilesets.RPG_PLANTS, 'assets/tilesets/buildings/3_plants.png');
    this.load.image(AssetKeys.Tilesets.RPG_BEACH, 'assets/tilesets/buildings/9_beach.png');

    // Tilemaps
    this.load.tilemapTiledJSON(AssetKeys.Tilemaps.ISLAND, 'assets/tilemaps/island.json');
    this.load.tilemapTiledJSON(AssetKeys.Tilemaps.ISLAND_EXPANDED, 'assets/tilemaps/island_expanded.json');

    // Data
    this.load.json(AssetKeys.Data.DIALOGUES, 'assets/data/dialogues.json');
    this.load.json(AssetKeys.Data.QUESTS, 'assets/data/quests.json');

    // Character spritesheets
    this.load.spritesheet(AssetKeys.Characters.IDLE, 'assets/characters/sunnyside/base_idle_strip9.png', {
      frameWidth: 96,
      frameHeight: 64,
    });
    this.load.spritesheet(AssetKeys.Characters.WALK, 'assets/characters/sunnyside/base_walk_strip8.png', {
      frameWidth: 96,
      frameHeight: 64,
    });
    this.load.spritesheet(AssetKeys.Characters.RUN, 'assets/characters/sunnyside/base_run_strip8.png', {
      frameWidth: 96,
      frameHeight: 64,
    });

    // NPC sprites (Kenney Roguelike Characters - CC0)
    // 16×16 tiles with 1px margin, arranged in a grid
    this.load.spritesheet(AssetKeys.NPCs.WELCOME, 'assets/npcs/roguelikeChar_transparent.png', {
      frameWidth: 16,
      frameHeight: 16,
      spacing: 1,
      margin: 1,
    });
    this.load.spritesheet(AssetKeys.NPCs.SHOPKEEPER, 'assets/npcs/roguelikeChar_transparent.png', {
      frameWidth: 16,
      frameHeight: 16,
      spacing: 1,
      margin: 1,
    });

    // Item sprites (Kenney Roguelike RPG Pack - CC0)
    // 16×16 tiles with 1px margin, arranged in a grid
    this.load.spritesheet(AssetKeys.Items.CRATE, 'assets/items/roguelikeSheet_transparent.png', {
      frameWidth: 16,
      frameHeight: 16,
      spacing: 1,
      margin: 1,
    });
    this.load.spritesheet(AssetKeys.Items.BARREL, 'assets/items/roguelikeSheet_transparent.png', {
      frameWidth: 16,
      frameHeight: 16,
      spacing: 1,
      margin: 1,
    });
    this.load.spritesheet(AssetKeys.Items.SUPPLY, 'assets/items/roguelikeSheet_transparent.png', {
      frameWidth: 16,
      frameHeight: 16,
      spacing: 1,
      margin: 1,
    });

    void title;
  }

  create(): void {
    if (this.failedAssets.length > 0) {
      log.warn('[Preloader] Loading completed with failures:', this.failedAssets);
      this.errorText?.setVisible(true);
      this.errorText?.setText(
        `${this.failedAssets.length} asset(s) failed.\nGame may have visual issues.`,
      );
      this.time.addEvent({
        delay: 2000,
        callback: () => this.scene.start('MainMenuScene'),
      });
    } else {
      log.debug('[Preloader] All assets loaded successfully');
      this.scene.start('MainMenuScene');
    }
  }
}