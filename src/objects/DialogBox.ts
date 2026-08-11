import Phaser from 'phaser';

/**
 * DialogBox
 *
 * Sizing is dynamic based on the game canvas so it scales with window
 * changes and mobile orientations. It no longer assumes a fixed 480×360
 * canvas or fixed word-wrap widths.
 */
export class DialogBox extends Phaser.GameObjects.Container {
  private textBox!: Phaser.GameObjects.Text;
  private fullText: string = '';
  private displayedText: string = '';
  private typewriterTimer?: Phaser.Time.TimerEvent;
  private charIndex: number = 0;
  private typewriterSpeed: number = 50;
  private isComplete: boolean = false;
  private continueIndicator?: Phaser.GameObjects.Text;

  private boundTick: () => void;

  constructor(scene: Phaser.Scene, text: string, speed: number = 50) {
    super(scene);

    this.fullText = text;
    this.typewriterSpeed = speed;
    this.boundTick = this.typewriterTick.bind(this);

    this.build();

    scene.add.existing(this);
    this.setScrollFactor(0);
    this.setDepth(10000);

    this.startTypewriter();
  }

  private uiScale(v: number): number {
    const cam = this.scene.cameras.main;
    const ref = 480;
    const raw = Math.max(0.5, Math.min(1.4, Math.min(cam.width, cam.height) / ref)) * v;
    return Math.round(raw);
  }

  private build(): void {
    const cam = this.scene.cameras.main;

    const narrow = cam.width < cam.height;
    const targetWidth = narrow
      ? cam.width - this.uiScale(12)
      : Math.min(cam.width - this.uiScale(40), this.uiScale(400));

    const fontSize = `${this.uiScale(10)}px`;
    const padding = this.uiScale(8);

    const measure = this.scene.add
      .text(0, 0, this.fullText, {
        fontFamily: 'monospace',
        fontSize,
        wordWrap: { width: targetWidth - padding * 2 },
      })
      .setOrigin(0);

    const bounds = measure.getBounds();
    const boxW = Math.round(Math.max(targetWidth, bounds.width + padding * 2));
    const boxH = Math.round(bounds.height + padding * 2);
    measure.destroy();

    const x = Math.round(cam.width / 2);
    const y = Math.round(cam.height - boxH / 2 - this.uiScale(6));

    this.setPosition(x, y);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, this.uiScale(4));
    bg.lineStyle(this.uiScale(1), 0x5a5a7a, 0.9);
    bg.strokeRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, this.uiScale(4));
    this.add(bg);

    this.textBox = this.scene.add
      .text(Math.round(0), Math.round(0), '', {
        fontFamily: 'monospace',
        fontSize,
        color: '#e0e0e0',
        wordWrap: { width: Math.round(boxW - padding * 2) },
      })
      .setOrigin(0.5);
    this.add(this.textBox);

    this.continueIndicator = this.scene.add
      .text(Math.round(0), Math.round(boxH / 2 - this.uiScale(10)), '▼', {
        fontFamily: 'monospace',
        fontSize: `${this.uiScale(8)}px`,
        color: '#ffff88',
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.add(this.continueIndicator);
  }

  private startTypewriter(): void {
    this.charIndex = 0;
    this.displayedText = '';
    this.isComplete = false;

    this.typewriterTimer = this.scene.time.addEvent({
      delay: this.typewriterSpeed,
      callback: this.boundTick,
      repeat: this.fullText.length - 1,
    });
  }

  private typewriterTick(): void {
    if (this.charIndex < this.fullText.length) {
      this.displayedText += this.fullText[this.charIndex];
      this.textBox.setText(this.displayedText);
      this.charIndex++;

      if (this.charIndex === this.fullText.length) {
        this.isComplete = true;
        this.showContinueIndicator();
      }
    }
  }

  private showContinueIndicator(): void {
    if (!this.continueIndicator) return;
    this.scene.tweens.add({
      targets: this.continueIndicator,
      alpha: { from: 0, to: 1 },
      duration: 500,
      repeat: -1,
      yoyo: true,
    });
  }

  skipTypewriter(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.remove();
    }
    this.displayedText = this.fullText;
    this.textBox.setText(this.displayedText);
    this.charIndex = this.fullText.length;
    this.isComplete = true;
    this.showContinueIndicator();
  }

  positionAtNPC(npc: { x: number; y: number }, cam: Phaser.Cameras.Scene2D.Camera): void {
    const offset = this.uiScale(40);
    let x = (npc.x - cam.scrollX) * cam.zoom;
    let y = (npc.y - offset - cam.scrollY) * cam.zoom;

    const minX = this.uiScale(60);
    const maxX = cam.width - this.uiScale(60);
    const minY = this.uiScale(10);
    const maxY = cam.height - this.uiScale(10);

    x = Phaser.Math.Clamp(x, minX, maxX);
    y = Phaser.Math.Clamp(y, minY, maxY);

    this.setPosition(Math.round(x), Math.round(y));
  }

  isTypewriterComplete(): boolean {
    return this.isComplete;
  }

  destroy(fromScene?: boolean): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.remove();
    }
    this.removeAll(true);
    super.destroy(fromScene);
  }
}
