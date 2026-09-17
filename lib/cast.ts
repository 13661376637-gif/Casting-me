/** Display identities only: dialogue and choice logic keep their original IDs. */
export const SUPPORTING_CAST = {
  RICHARD: { nameEn: 'Richard Cole', roleEn: 'Director' },
  DAVID: { nameEn: 'David Chen', roleEn: 'Agent' },
  CLAIRE: { nameEn: 'Claire Bennett', roleEn: 'Agent' },
  MAYA: { nameEn: 'Maya Park', roleEn: 'Actress' },
} as const;

export function formatSpeakerLabel(speakerEn: string): string {
  const key = speakerEn.split(' · ')[0];
  const person = SUPPORTING_CAST[key as keyof typeof SUPPORTING_CAST];
  if (!person) return speakerEn;
  const suffixAt = speakerEn.indexOf(' · ');
  const suffix = suffixAt >= 0 ? speakerEn.slice(suffixAt) : '';
  return `${person.nameEn} (${person.roleEn})${suffix}`;
}
