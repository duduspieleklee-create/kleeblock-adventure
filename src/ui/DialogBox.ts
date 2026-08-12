import Phaser from 'phaser';
import { UI_CONFIG, TEXT_STYLES } from './UIConstants';

const TEXT_PADDING = 20;

/**
 * Screen-space dialogue panel (Container).
 * Bottom-anchored by default; word-wrap tracks panel width.
 * show / hide / setText API for UIScene integration.
 */
export class DialogBox extends Phaser.GameObjects.Container {
  private bg!: Phaser.GameObjects.Graphics;
  private textBox!: Phaser.GameObjects.Text;
  private continueIndicator?: Phaser.GameObjects.Text;

  private fullText = '';
  private displayedText = '';
  private typewriterTimer?: Phaser.Time.TimerEvent;
  private charIndex = 0;
  private typewriterSpeed = 40;
  private isComplete = false;
  private panelW = 0;
  private panelH = 0;

  private readonly boundTick: () => void;

  constructor(scene: Phaser.Scene, text = '', speed = 40) {
    super(scene, 0, 0);
    this.typewriterSpeed = speed;
    this.boundTick = this.typewriterTick.bind(this);

    this.bg = scene.add.graphics();
    this.add(this.bg);

    this.textBox = scene.add
      .text(0, 0, ' ', {
        ...TEXT_STYLES.body,
        fontSize: '16px',
        color: '#e8e8e8',
        wordWrap: { width: 100 },
      })
      .setOrigin(0.5);
    this.add(this.textBox);

    this.continueIndicator = scene.add
      .text(0, 0, '▼', {
        fontFamily: UI_CONFIG.FONT_FAMILY,
        fontSize: '12px',
        color: '#ffff88',
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.add(this.continueIndicator);

    this.setScrollFactor(0);
    this.setDepth(10010);
    this.setVisible(false);

    scene.add.existing(this);

    if (text) {
      this.setText(text);
      this.show();
    }
  }

  /** Rebuild panel geometry for current logical size. */
  layout(): void {
    const { width, height } = this.scene.scale.gameSize;
    const margin = UI_CONFIG.MARGIN;

    this.panelW = Math.min(width - margin * 2, 720);
    const wrapW = this.panelW - TEXT_PADDING * 2;

    this.textBox.setStyle({
      ...TEXT_STYLES.body,
      fontSize: '16px',
      color: '#e8e8e8',
      wordWrap: { width: Math.round(wrapW) },
    });
    this.textBox.setWordWrapWidth(Math.round(wrapW));

    // Measure with full text for stable height
    // Guard: skip measurement if text frame is not ready (font still loading)
    if (!this.textBox.frame) {
      this.panelH = 120; // fallback height
      this.setPosition(Math.round(width / 2), Math.round(height - margin - this.panelH / 2));
      return;
    }
    const prev = this.textBox.text;
    this.textBox.setText(this.fullText || ' ');
    const bounds = this.textBox.getBounds();
    this.panelH = Math.max(80, Math.round(bounds.height + TEXT_PADDING * 2 + 16));
    this.textBox.setText(prev);

    this.bg.clear();
    this.bg.fillStyle(UI_CONFIG.PANEL_COLOR, UI_CONFIG.PANEL_ALPHA);
    this.bg.fillRoundedRect(-this.panelW / 2, -this.panelH / 2, this.panelW, this.panelH, 8);
    this.bg.lineStyle(2, 0x5a5a7a, 0.9);
    this.bg.strokeRoundedRect(-this.panelW / 2, -this.panelH / 2, this.panelW, this.panelH, 8);

    this.continueIndicator?.setPosition(0, Math.round(this.panelH / 2 - 14));

    this.setPosition(Math.round(width / 2), Math.round(height - margin - this.panelH / 2));
  }

  setText(text: string): void {
    this.fullText = text;
    this.displayedText = '';
    this.charIndex = 0;
    this.isComplete = false;
    // Guard: ensure text object has valid frame before setting empty string
    // Phaser Text can throw "Cannot read properties of null (reading 'drawImage')"
    // if the texture frame is not ready when setText('') is called
    if (this.textBox.frame) {
      this.textBox.setText('');
    }
    this.continueIndicator?.setAlpha(0);
    this.layout();
    this.startTypewriter();
  }

  show(): void {
    this.setVisible(true);
    this.layout();
  }

  hide(): void {
    this.setVisible(false);
    this.stopTypewriter();
  }

  private startTypewriter(): void {
    this.stopTypewriter();
    if (!this.fullText.length) {
      this.isComplete = true;
      return;
    }
    this.typewriterTimer = this.scene.time.addEvent({
      delay: this.typewriterSpeed,
      callback: this.boundTick,
      repeat: this.fullText.length - 1,
    });
  }

  private stopTypewriter(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.remove();
      this.typewriterTimer = undefined;
    }
  }

  private typewriterTick(): void {
    if (this.charIndex < this.fullText.length) {
      this.displayedText += this.fullText[this.charIndex];
      this.textBox.setText(this.displayedText);
      this.charIndex++;
      if (this.charIndex >= this.fullText.length) {
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
    this.stopTypewriter();
    this.displayedText = this.fullText;
    this.textBox.setText(this.displayedText);
    this.charIndex = this.fullText.length;
    this.isComplete = true;
    this.showContinueIndicator();
  }

  isTypewriterComplete(): boolean {
    return this.isComplete;
  }

  /**
   * Optional: place near an NPC in screen space (legacy InteractionManager).
   * Prefer bottom-anchored layout for readability.
   */
  positionAtNPC(npc: { x: number; y: number }, cam: Phaser.Cameras.Scene2D.Camera): void {
    void npc;
    void cam;
    // Keep bottom-anchored panel for readability (AI_CONTEXT / plan).
    this.layout();
  }

  destroy(fromScene?: boolean): void {
    this.stopTypewriter();
    super.destroy(fromScene);
  }
}
