export type AvatarHair = 'original' | 'sleek' | 'bob' | 'pony';
export type AvatarLook = 'natural' | 'editorial' | 'premiere' | 'qipao';
export type FaceFeature = 'eyes' | 'cheekbones' | 'nose' | 'skin' | 'jaw';
export type FaceSelections = Record<FaceFeature, string> & {
  adjustments?: Partial<Record<FaceFeature, number>>;
};

export type CharacterAppearance = {
  schema: 1;
  look: AvatarLook;
  hair: AvatarHair;
  face: FaceSelections;
};

export const DEFAULT_FACE: FaceSelections = {
  eyes: 'natural', cheekbones: 'soft', nose: 'defined', skin: 'original', jaw: 'oval',
};

export const LOOK_HAIR: Record<AvatarLook, AvatarHair> = {
  natural: 'original', editorial: 'bob', premiere: 'pony', qipao: 'original',
};

export function featureAmount(face: FaceSelections, feature: FaceFeature): number {
  const custom = face.adjustments?.[feature];
  if (typeof custom === 'number' && Number.isFinite(custom)) return Math.max(0, Math.min(1, custom));
  return face[feature] === DEFAULT_FACE[feature] ? 0 : 1;
}

// Dragging changes the actual drawing parameter. The named selection also remains
// available to the existing casting-score rules and bilingual controls.
export function adjustFace(face: FaceSelections, feature: FaceFeature, amount: number): FaceSelections {
  const value = Math.max(0, Math.min(1, Number.isFinite(amount) ? amount : 0));
  const changed = { eyes: 'coded', cheekbones: 'high', nose: 'rounded', skin: 'porcelain', jaw: 'long-square' };
  return {
    ...face,
    [feature]: value < 0.15 ? DEFAULT_FACE[feature] : feature === 'skin' && face.skin === 'deep' ? 'deep' : changed[feature],
    adjustments: { ...face.adjustments, [feature]: value },
  };
}

export function applyFaceOption(face: FaceSelections, feature: FaceFeature, id: string): FaceSelections {
  const adjustments = { ...face.adjustments };
  delete adjustments[feature];
  return { ...face, [feature]: id, adjustments };
}

export function lockAppearance(look: AvatarLook, face: FaceSelections): CharacterAppearance {
  return { schema: 1, look, hair: LOOK_HAIR[look], face: { ...face, adjustments: { ...face.adjustments } } };
}
