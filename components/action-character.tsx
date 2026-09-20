'use client';

import { useEffect, useState } from 'react';
import { ACTION_SPRITES, preloadActionSprite, resetActionSprite } from '@/lib/action-sprites';
import type { ActionSpritePose } from '@/lib/action-sprites';

type Props = {
  pose: ActionSpritePose;
  onReady: (pose: ActionSpritePose) => void;
  onLoadError: (pose: ActionSpritePose) => void;
};

/** One unmodified whole-body asset. No head overlays, masks or body warping. */
export function ActionCharacter({ pose, onReady, onLoadError }: Props) {
  const [decoded, setDecoded] = useState<ActionSpritePose | null>(null);
  useEffect(() => {
    let cancelled = false;
    preloadActionSprite(pose).then(() => {
      if (!cancelled) setDecoded(pose);
    }, () => {
      if (!cancelled) onLoadError(pose);
    });
    return () => { cancelled = true; };
  }, [pose, onLoadError]);

  useEffect(() => {
    if (decoded !== pose) return;
    const frame = requestAnimationFrame(() => onReady(pose));
    return () => cancelAnimationFrame(frame);
  }, [decoded, pose, onReady]);

  if (decoded !== pose) return null;
  return <img
    className={`filming-character filming-character-${pose}`}
    src={ACTION_SPRITES[pose]}
    alt={pose === 'crossed' ? 'Lin holding her sword and scabbard crossed overhead' : 'Lin in an open sword guard'}
    draggable={false}
    decoding="async"
    onError={() => { resetActionSprite(pose); onLoadError(pose); }}
  />;
}
