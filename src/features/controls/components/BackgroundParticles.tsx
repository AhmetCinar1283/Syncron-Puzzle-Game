'use client';

import { motion } from 'framer-motion';
import type { Particle } from '../lib/constants';

export function BackgroundParticles({ particles }: { particles: Particle[] }) {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: p.size,
            height: p.size,
            borderRadius: p.borderRadius,
            background: p.color,
            boxShadow: p.glow,
          }}
          animate={{
            x: [p.startX, p.startX + p.driftX],
            y: [p.startY, -40],
            opacity: [0, p.opacity, p.opacity, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}
