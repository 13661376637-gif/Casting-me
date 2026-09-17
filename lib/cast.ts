/** Display identities only: dialogue and choice logic keep their original IDs. */
export const SUPPORTING_CAST = {
  RICHARD: { nameEn: 'Richard Cole', nameZh: '理查德·科尔', roleEn: 'Director', roleZh: '导演' },
  DAVID: { nameEn: 'David Chen', nameZh: '大卫·陈', roleEn: 'Agent', roleZh: '经纪人' },
  CLAIRE: { nameEn: 'Claire Bennett', nameZh: '克莱尔·班尼特', roleEn: 'Agent', roleZh: '经纪人' },
  MAYA: { nameEn: 'Maya Park', nameZh: '玛雅·朴', roleEn: 'Actress', roleZh: '演员' },
} as const;

export function formatSpeakerLabel(speakerEn: string, speakerZh: string, language: 'en' | 'zh'): string {
  const key = speakerEn.split(' · ')[0];
  const person = SUPPORTING_CAST[key as keyof typeof SUPPORTING_CAST];
  if (!person) return language === 'en' ? speakerEn : speakerZh;
  const localized = language === 'en' ? speakerEn : speakerZh;
  const suffixAt = localized.indexOf(' · ');
  const suffix = suffixAt >= 0 ? localized.slice(suffixAt) : '';
  return language === 'en'
    ? `${person.nameEn} (${person.roleEn})${suffix}`
    : `${person.nameZh}（${person.roleZh}）${suffix}`;
}
