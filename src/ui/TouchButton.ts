import Phaser from 'phaser';
import { UI_CONFIG } from './UIConstants';
import { TOUCH_TARGET_MIN } from './UIScale';

export type TouchButtonOptions = {
  label: string;
  onPress: () => void;
  width?: number;
  height?: number;
  depth?: number;
};

/**
 * Large touch-friendly button for mobile controls.
 * Hit area at least TOUCH_TARGET_MIN; no hover-only behavior required.
 */
export class TouchButton extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private btnW: number;
  private btnH: number;
  private readonly onPress: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, options: TouchButtonOptions) {
    super(scene, Math.round(x), Math.round(y));

    this.onPress = options.onPress;
    this.btnW = Math.max(options.width ?? 96, TOUCH_TARGET_MIN);
    this.btnH = Math.max(options.height ?? TOUCH_TARGET_MIN, TOUCH_TARGET_MIN);

    this.bg = scene.add.graphics();
    this.drawBg(false);
    this.add(this.bg);

    this.label = scene.add
      .text(0, 0, options.label, {
        fontFamily: UI_CONFIG.FONT_FAMILY,
        fontSize: '14px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);
    this.add(this.label);

    this.setSize(this.btnW, this.btnH);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-this.btnW / 2, -this.btnH / 2, this.btnW, this.btnH),
      Phaser.Geom.Rectangle.Contains,
    );

    this.on('pointerdown', () => {
      this.drawBg(true);
      this.onPress();
    });
    this.on('pointerup', () => this.drawBg(false));
    this.on('pointerout', () => this.drawBg(false));

    this.setDepth(options.depth ?? 10020);
    this.setScrollFactor(0);
    scene.add.existing(this);
  }

  private drawBg(pressed: boolean): void {
    this.bg.clear();
    this.bg.fillStyle(pressed ? 0x2a4a6e : 0x1a1a2e, 0.92);
    this.bg.fillRoundedRect(-this.btnW / 2, -this.btnH / 2, this.btnW, this.btnH, 8);
    this.bg.lineStyle(2, 0x5a8ab0, 1);
    this.bg.strokeRoundedRect(-this.btnW / 2, -this.btnH / 2, this.btnW, this.btnH, 8);
  }

  setLabel(text: string): void {
    this.label.setText(text);
  }
}
