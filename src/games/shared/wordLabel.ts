import Phaser from 'phaser';

export interface WordLabelHandle {
    setText(text: string): void;
    setPosition(x: number, y: number): void;
    destroy(): void;
}

export function wordLabel(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    options?: { color?: string }
): WordLabelHandle {
    const domElement = scene.add.dom(x, y).setOrigin(0.5, 0.5);
    const div = document.createElement('div');
    div.style.cssText = `
        color: ${options?.color ?? '#ffffff'};
        font-size: 24px;
        font-weight: bold;
        text-align: center;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        pointer-events: none;
        user-select: none;
    `;
    div.textContent = text;
    domElement.setElement(div);

    return {
        setText(newText: string): void {
            div.textContent = newText;
        },
        setPosition(x: number, y: number): void {
            domElement.setPosition(x, y);
        },
        destroy(): void {
            domElement.destroy();
        },
    };
}