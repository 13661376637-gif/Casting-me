export type ActionSpritePose = 'crossed' | 'guard';

// Complete generated figures only. Never layer editable heads over these PNGs.
export const ACTION_SPRITES: Record<ActionSpritePose, string> = {
  crossed: '/characters/lin-action-crossed-v48.png',
  guard: '/characters/lin-action-crossed-v48.png',
};

const decodedSprites = new Map<ActionSpritePose, Promise<HTMLImageElement>>();

export function resetActionSprite(pose: ActionSpritePose) {
  decodedSprites.delete(pose);
}

export function preloadActionSprite(pose: ActionSpritePose): Promise<HTMLImageElement> {
  const cached = decodedSprites.get(pose);
  if (cached) return cached;
  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    let finished = false;
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      if (error) reject(error);
      else resolve(image);
    };
    const timer = setTimeout(() => finish(new Error('Action portrait loading timed out')), 20_000);
    image.decoding = 'async';
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        finish(new Error('Action portrait has no dimensions'));
        return;
      }
      image.decode().then(() => finish(), () => finish(new Error('Action portrait could not decode')));
    };
    image.onerror = () => finish(new Error('Action portrait could not load'));
    image.src = ACTION_SPRITES[pose];
  });
  decodedSprites.set(pose, pending);
  // A failed speculative preload must not poison the later in-scene retry.
  void pending.catch(() => {
    if (decodedSprites.get(pose) === pending) decodedSprites.delete(pose);
  });
  return pending;
}

export function preloadActionSprites() {
  return Promise.all([preloadActionSprite('crossed'), preloadActionSprite('guard')]);
}
