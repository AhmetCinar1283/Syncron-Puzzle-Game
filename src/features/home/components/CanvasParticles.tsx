'use client';
import { useEffect, useRef } from 'react';

export function CanvasParticles({ isMobile }: { isMobile: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let width = window.innerWidth;
    let height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const handleResize = () => {
      if (!canvas) return;
      const currentDpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * currentDpr;
      canvas.height = height * currentDpr;
      const currentCtx = canvas.getContext('2d');
      if (currentCtx) {
        currentCtx.scale(currentDpr, currentDpr);
      }
    };
    window.addEventListener('resize', handleResize);

    const particleCount = isMobile ? 12 : 28;
    const colors = [
      '#00ff88',
      '#00c4ff',
      '#ffd700',
      '#fbbf24',
      '#9333ea',
      '#a5f3fc',
      '#ec4899',
      '#f97316',
    ];

    class Particle {
      x: number;
      y: number;
      size: number;
      speedY: number;
      driftX: number;
      driftSpeed: number;
      color: string;
      maxOpacity: number;
      opacity: number;
      angle: number;

      constructor(isInitial = false) {
        this.x = Math.random() * width;
        this.y = isInitial ? Math.random() * height : height + 30;
        this.size = 8 + Math.random() * 18;
        this.speedY = 0.4 + Math.random() * 0.8;
        this.driftX = (Math.random() - 0.5) * 1.2;
        this.driftSpeed = 0.005 + Math.random() * 0.015;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.maxOpacity = 0.10 + Math.random() * 0.18;
        this.opacity = 0;
        this.angle = Math.random() * Math.PI * 2;
      }

      update() {
        this.y -= this.speedY;
        this.angle += this.driftSpeed;
        this.x += Math.sin(this.angle) * 0.4 + this.driftX;

        const fadeZone = 120;
        if (this.y > height - fadeZone) {
          const pct = (height - this.y) / fadeZone;
          this.opacity = pct * this.maxOpacity;
        } else if (this.y < fadeZone) {
          const pct = this.y / fadeZone;
          this.opacity = pct * this.maxOpacity;
        } else {
          this.opacity = this.maxOpacity;
        }

        if (this.y < -30 || this.x < -30 || this.x > width + 30) {
          this.x = Math.random() * width;
          this.y = height + 30;
          this.size = 8 + Math.random() * 18;
          this.speedY = 0.4 + Math.random() * 0.8;
          this.driftX = (Math.random() - 0.5) * 1.2;
          this.color = colors[Math.floor(Math.random() * colors.length)];
          this.maxOpacity = 0.10 + Math.random() * 0.18;
          this.opacity = 0;
        }
      }

      draw(context: CanvasRenderingContext2D) {
        context.save();
        context.fillStyle = this.color;

        // Glow (outer circle) - hardware accelerated double drawing
        context.beginPath();
        context.arc(this.x, this.y, this.size * (isMobile ? 1.3 : 1.8), 0, Math.PI * 2);
        context.globalAlpha = Math.max(0, Math.min(1, this.opacity * 0.28));
        context.fill();

        // Core (inner circle)
        context.beginPath();
        context.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        context.globalAlpha = Math.max(0, Math.min(1, this.opacity));
        context.fill();

        context.restore();
      }
    }

    const particlesList: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particlesList.push(new Particle(true));
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particlesList.length; i++) {
        const p = particlesList[i];
        p.update();
        p.draw(ctx);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isMobile]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
