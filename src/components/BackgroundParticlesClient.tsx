'use client';

import dynamic from 'next/dynamic';

export const BackgroundParticles = dynamic(
  () => import('./BackgroundParticles').then((mod) => ({ default: mod.BackgroundParticles })),
  { ssr: false }
);
