'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
}

const PARTICLE_COUNT = 42;

export function BackgroundParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];

    const createParticle = (): Particle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      radius: Math.random() * 1.8 + 0.6,
      alpha: Math.random() * 0.32 + 0.08,
    });

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles = Array.from({ length: PARTICLE_COUNT }, createParticle);
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      const isDark = document.documentElement.classList.contains('dark');
      const particleColor = isDark ? 'rgba(251, 191, 36, ALPHA)' : 'rgba(249, 115, 22, ALPHA)';
      const lineColor = isDark ? 'rgba(52, 211, 153, ALPHA)' : 'rgba(16, 185, 129, ALPHA)';

      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < -20) particle.x = width + 20;
        if (particle.x > width + 20) particle.x = -20;
        if (particle.y < -20) particle.y = height + 20;
        if (particle.y > height + 20) particle.y = -20;

        context.beginPath();
        context.fillStyle = particleColor.replace('ALPHA', String(particle.alpha));
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      }

      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.hypot(dx, dy);

          if (distance < 120) {
            context.beginPath();
            context.strokeStyle = lineColor.replace('ALPHA', String(0.08 * (1 - distance / 120)));
            context.lineWidth = 0.8;
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.stroke();
          }
        }
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
    };
  }, [mounted]);

  if (!mounted) {
    return null;
  }

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 -z-10 opacity-70" aria-hidden="true" />;
}
