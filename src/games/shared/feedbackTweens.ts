import Phaser from 'phaser';

export const feedbackTweens = {
    squashStretch(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite): void {
        scene.tweens.add({
            targets: sprite,
            scaleX: 1.3,
            scaleY: 0.7,
            duration: 100,
            yoyo: true,
            ease: 'Power2',
            onComplete: () => {
                sprite.setScale(1, 1);
            },
        });
    },

    shake(scene: Phaser.Scene): void {
        const camera = scene.cameras.main;
        const originalX = camera.x;
        scene.tweens.add({
            targets: camera,
            x: originalX + 10,
            duration: 50,
            yoyo: true,
            repeat: 3,
            ease: 'Linear',
            onComplete: () => {
                camera.x = originalX;
            },
        });
    },

    starBurst(scene: Phaser.Scene, x: number, y: number): void {
        const particles = scene.add.particles(x, y, 'star', {
            speed: { min: 100, max: 300 },
            scale: { start: 0.5, end: 0 },
            lifespan: 600,
            quantity: 12,
            emitting: false,
        });
        particles.explode();
        scene.time.delayedCall(700, () => {
            particles.destroy();
        });
    },
};