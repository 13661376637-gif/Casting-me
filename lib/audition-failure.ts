// This interlude happens before representation and before face customization.
// It shows the cost of the existing choice-01, without charging that cost again.
export const AUDITION_FAILURE_BEATS = [
  { speakerEn: 'CASTING OFFICE', en: 'Thank you for reading. We are not moving forward with your application. No callback is scheduled.' },
  { speakerEn: 'LIN', en: 'I gave her a history. A doubt. A reason to stay. They wanted a type they could sell.' },
  { speakerEn: 'LIN', en: 'I kept the part of her that felt like me. Now there is no role, no callback—and the rent is still due.' },
  { speakerEn: 'THE COST OF STAYING YOURSELF', en: 'In this version of Hollywood, talent alone does not open the door. Refusing the market’s image has left Lin outside it.' },
  { speakerEn: 'LIN', en: 'If I want another chance, I have to compromise. I’ll meet the agents. Let them change how I’m seen—before I disappear from the list.' },
];

export const AUDITION_FAILURE_ASSETS = {
  portrait: '/characters/lin-audition-failed-v3.png',
  background: '/backgrounds/night-apartment.png',
};

let pendingScene: Promise<void> | undefined;

function decodeImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let finished = false;
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(() => finish(new Error('Audition scene loading timed out')), 20_000);
    image.decoding = 'async';
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        finish(new Error('Audition artwork has no dimensions'));
        return;
      }
      image.decode().then(() => finish(), () => finish(new Error('Audition artwork could not decode')));
    };
    image.onerror = () => finish(new Error('Audition artwork could not load'));
    image.src = src;
  });
}

export function preloadAuditionFailure(): Promise<void> {
  if (pendingScene) return pendingScene;
  const pending = Promise.all(Object.values(AUDITION_FAILURE_ASSETS).map(decodeImage)).then(() => undefined);
  pendingScene = pending;
  void pending.catch(() => {
    if (pendingScene === pending) pendingScene = undefined;
  });
  return pending;
}
