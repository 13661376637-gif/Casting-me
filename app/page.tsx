'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  ChevronsRight,
  FolderOpen,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type Language = 'en' | 'zh';
type Screen = 'title' | 'prologue' | 'profile' | 'firstRead' | 'lookTest' | 'training' | 'callback' | 'locked' | 'redCarpet' | 'ending';
type SpriteKey = 'linNatural' | 'linDragon' | 'linPorcelain' | 'linGraduation' | 'richard' | 'david' | 'maya';

type Choice = { id: string; en: string; zh: string; preset?: boolean };
type ChoiceSet = { id: string; items: Choice[]; fame: number; pressure: number; result: string };
type Beat = {
  speakerEn: string;
  speakerZh: string;
  en: string;
  zh: string;
  left?: SpriteKey;
  right?: SpriteKey;
  center?: SpriteKey;
  choice?: ChoiceSet;
  flash?: boolean;
  showProjects?: boolean;
  showRoleCard?: boolean;
  tag?: string;
};

const sprites: Record<SpriteKey, { src: string; name: string; frontCrop?: boolean }> = {
  linNatural: { src: '/characters/lin-natural-front-sheet.png', name: 'Lin', frontCrop: true },
  linDragon: { src: '/characters/lin-dragon.png', name: 'Lin — Night Orchid look' },
  linPorcelain: { src: '/characters/lin-porcelain.png', name: 'Lin — Porcelain Light look' },
  linGraduation: { src: '/characters/lin-graduation.png', name: 'Lin at graduation' },
  richard: { src: '/characters/richard.png', name: 'Richard Cole' },
  david: { src: '/characters/david.png', name: 'David Miller' },
  maya: { src: '/characters/maya.png', name: 'Maya Park' },
};

const choice01: ChoiceSet = {
  id: 'choice-01', fame: 1, pressure: 1, result: 'CASTING NOTE ADDED: CONTROLLED / UNREADABLE',
  items: [
    { id: 'a', en: "People don't come with headlines.", zh: '人物没有标题。' },
    { id: 'b', en: "Let's go again. I'll give you the headline first.", zh: '再来一次。我先给你标题。', preset: true },
    { id: 'c', en: "I want to know why she's afraid first.", zh: '我想先知道她为什么害怕。' },
  ],
};

const choice02: ChoiceSet = {
  id: 'choice-02', fame: 3, pressure: 2, result: 'MARKET RESPONSE: CLEAR',
  items: [
    { id: 'a', en: 'Neither one is me.', zh: '两种都不是我。' },
    { id: 'b', en: "I can play both. Let's shoot.", zh: '两种我都能演。先拍吧。', preset: true },
    { id: 'c', en: 'Keep the natural look only.', zh: '只保留自然造型。' },
  ],
};

const choice03: ChoiceSet = {
  id: 'choice-03', fame: 5, pressure: 0, result: 'ROLE LOCKED: NIGHT ORCHID',
  items: [
    { id: 'a', en: 'I want to wait for the reporter.', zh: '我要等记者那个角色。' },
    { id: 'b', en: 'Which one tests better?', zh: '哪一套数据更好？', preset: true },
    { id: 'c', en: 'Pass on both.', zh: '两部都拒绝。' },
  ],
};

const choice04: ChoiceSet = {
  id: 'choice-04', fame: 0, pressure: 2, result: 'LOOK PRESET LOADED',
  items: [
    { id: 'a', en: 'Send me the full script.', zh: '把完整剧本发给我。' },
    { id: 'b', en: 'Send me the last look.', zh: '把上一版造型发给我。', preset: true },
    { id: 'c', en: 'Ask them to audition me again.', zh: '请他们重新试镜我。' },
  ],
};

const prologue: Beat[] = [
  { speakerEn: 'IDENTITY', speakerZh: '身份', en: 'She trained for four years, learning how to become different people.', zh: '她学习了四年，练习如何成为不同的人。', center: 'linNatural', tag: 'PANEL 01 / ACTING SCHOOL' },
  { speakerEn: 'GRADUATION', speakerZh: '毕业', en: 'After graduation, she began looking for the first real door into the industry.', zh: '毕业以后，她开始寻找真正进入行业的第一扇门。', center: 'linGraduation', tag: 'PANEL 02 / CLASS OF 2026' },
  { speakerEn: 'HOLLYWOOD', speakerZh: '好莱坞', en: 'New roles are created here every day—and familiar faces are searched for again and again.', zh: '这里每天都产生新角色，也反复寻找熟悉的面孔。', center: 'linNatural', tag: 'PANEL 03 / LOS ANGELES' },
  { speakerEn: 'FIRST CALL', speakerZh: '第一次机会', en: 'She thought the next step was proving that she could act.', zh: '她以为下一步是证明自己会演戏。', center: 'linNatural', tag: 'AUDITION ROOM A-17' },
];

const firstRead: Beat[] = [
  { speakerEn: 'RICHARD', speakerZh: '理查德', en: "Page three. Start after the door closes. Don't look at me—just beside the lens.", zh: '第三页。门关上以后开始。不要看我，看镜头旁边。', left: 'linNatural', right: 'richard' },
  { speakerEn: 'LIN', speakerZh: '林', en: "You said I was safe here. Don't make me regret believing you.", zh: '你说这里很安全。别让我后悔相信你。', left: 'linNatural', right: 'richard' },
  { speakerEn: 'RICHARD', speakerZh: '理查德', en: "The acting is good, but the audience will ask who she is before they decide whether to hear what she's afraid of.", zh: '表演是好的，但观众会先问她是谁，再决定要不要听她害怕什么。', left: 'linNatural', right: 'richard' },
  { speakerEn: 'LIN', speakerZh: '林', en: 'What do you want them to know first?', zh: '你希望他们先知道什么？', left: 'linNatural', right: 'richard' },
  { speakerEn: 'RICHARD', speakerZh: '理查德', en: 'Control. Mystery. No apology. Give me the headline first; we can add the details later.', zh: '控制感。神秘。没有道歉。先给我标题，细节以后再补。', left: 'linNatural', right: 'richard' },
  { speakerEn: 'DAVID · QUIETLY', speakerZh: '大卫 · 低声', en: 'Let them remember you in ten seconds.', zh: '先让他们在十秒里记住你。', left: 'linNatural', right: 'david' },
  { speakerEn: 'CHOICE 01', speakerZh: '选择 01', en: 'How will you respond?', zh: '你要如何回应？', left: 'linNatural', right: 'david', choice: choice01 },
  { speakerEn: 'LIN', speakerZh: '林', en: 'You said I was safe here. Prove it.', zh: '你说这里很安全。证明给我看。', left: 'linDragon', right: 'richard' },
  { speakerEn: 'RICHARD', speakerZh: '理查德', en: "That's it. Now I know how to pitch you.", zh: '就是这个。现在我知道怎么介绍你了。', left: 'linDragon', right: 'richard' },
];

const lookTest: Beat[] = [
  { speakerEn: 'RICHARD', speakerZh: '理查德', en: 'Same scene, two posters. We only need to know which promise reads faster.', zh: '同一场戏，两张海报。我们只想知道哪一种承诺更快被看懂。', left: 'linDragon', right: 'linPorcelain', tag: 'LOOK A / LOOK B' },
  { speakerEn: 'LIN', speakerZh: '林', en: "They don't feel like the same person.", zh: '她们不像同一个人。', left: 'linDragon', right: 'linPorcelain' },
  { speakerEn: 'RICHARD', speakerZh: '理查德', en: 'Not in the script. In the feed, nuance happens after the second click.', zh: '剧本里不是。信息流里，细节发生在第二次点击以后。', left: 'linDragon', right: 'richard' },
  { speakerEn: 'LIN · CRIMSON EDGE', speakerZh: '林 · 绯红锋线', en: 'He thinks I am here to negotiate. Let him keep thinking that.', zh: '他以为我是来谈条件的。让他继续这么想。', center: 'linDragon', tag: 'RECOGNITION ↑↑ · CONTROL / DANGER / DESIRE' },
  { speakerEn: 'LIN · PORCELAIN LIGHT', speakerZh: '林 · 瓷白柔光', en: 'I can wait. He said he would come back.', zh: '我可以等。他说过他会回来。', center: 'linPorcelain', tag: 'EMPATHY ↑ · INNOCENCE / LOYALTY / RESCUE' },
  { speakerEn: 'DAVID', speakerZh: '大卫', en: "Both read immediately. That's rare.", zh: '两套都读得很快。这很少见。', left: 'linDragon', right: 'david' },
  { speakerEn: 'LIN', speakerZh: '林', en: 'Which part of me did they like?', zh: '他们喜欢的是我的哪一部分？', left: 'linNatural', right: 'david' },
  { speakerEn: 'DAVID', speakerZh: '大卫', en: 'The part they could describe without asking your name.', zh: '不需要再问名字就能描述的那一部分。', left: 'linNatural', right: 'david' },
  { speakerEn: 'CHOICE 02', speakerZh: '选择 02', en: 'The camera is ready.', zh: '镜头已经准备好。', left: 'linDragon', right: 'linPorcelain', choice: choice02 },
];

const callback: Beat[] = [
  { speakerEn: 'RICHARD', speakerZh: '理查德', en: 'Both tests cleared. The thriller wants your edge; the romance wants your stillness.', zh: '两套测试都过了。惊悚片要你的锋利，爱情片要你的安静。', left: 'linNatural', right: 'richard', showProjects: true },
  { speakerEn: 'LIN', speakerZh: '林', en: 'What about the reporter?', zh: '记者那个角色呢？', left: 'linNatural', right: 'richard', showProjects: true },
  { speakerEn: 'RICHARD', speakerZh: '理查德', en: 'They liked the work. Marketing is still looking for an entry point.', zh: '他们喜欢你的表演。市场部还在找入口。', left: 'linNatural', right: 'richard', showProjects: true },
  { speakerEn: 'DAVID', speakerZh: '大卫', en: 'This is the first real offer with your name on it.', zh: '这是第一张写着你名字的正式报价。', left: 'linNatural', right: 'david', showProjects: true },
  { speakerEn: 'CHOICE 03', speakerZh: '选择 03', en: 'Three rooms. Only two doors are open.', zh: '三个房间，只有两扇门打开。', left: 'linNatural', right: 'david', choice: choice03, showProjects: true },
  { speakerEn: 'DAVID', speakerZh: '大卫', en: 'Night Orchid. Cleaner numbers, larger rollout.', zh: '《夜兰》。数据更干净，发行规模也更大。', left: 'linNatural', right: 'david', showProjects: true },
  { speakerEn: 'LIN', speakerZh: '林', en: 'Then her.', zh: '那就她。', left: 'linNatural', right: 'richard', showProjects: true },
  { speakerEn: 'RICHARD', speakerZh: '理查德', en: "Good. Don't reinvent the look. We already know what works.", zh: '很好。造型不要重新发明，我们已经知道什么有效。', left: 'linDragon', right: 'richard', showProjects: true },
];

const locked: Beat[] = [
  { speakerEn: 'THREE MONTHS LATER', speakerZh: '三个月后', en: 'What worked begins to become the only option.', zh: '有效开始变成唯一。', left: 'linNatural', right: 'maya', showRoleCard: true },
  { speakerEn: 'LIN', speakerZh: '林', en: "She's an emergency-room doctor.", zh: '她是急诊科医生。', left: 'linNatural', right: 'maya', showRoleCard: true },
  { speakerEn: 'DAVID · VOICE NOTE', speakerZh: '大卫 · 语音', en: 'Exactly. Competent, private, dangerous when pushed. The audience already believes you as that kind of woman.', zh: '对。能干，隐秘，被逼到最后会很危险。观众已经相信你是这种人。', left: 'linNatural', right: 'maya', showRoleCard: true },
  { speakerEn: 'LIN', speakerZh: '林', en: 'Did they watch my audition?', zh: '他们看过我的试镜吗？', left: 'linNatural', right: 'maya' },
  { speakerEn: 'DAVID · VOICE NOTE', speakerZh: '大卫 · 语音', en: 'They watched the trailer.', zh: '他们看过预告片。', left: 'linNatural', right: 'maya' },
  { speakerEn: 'MAYA', speakerZh: '玛雅', en: 'The first time, they ask if you can do it.', zh: '第一次，他们会问你能不能做到。', left: 'linDragon', right: 'maya' },
  { speakerEn: 'MAYA', speakerZh: '玛雅', en: 'Later, they stop asking.', zh: '后来，他们就不再问了。', left: 'linDragon', right: 'maya' },
  { speakerEn: 'LIN', speakerZh: '林', en: 'Did it work for you?', zh: '这对你有用吗？', left: 'linDragon', right: 'maya' },
  { speakerEn: 'MAYA', speakerZh: '玛雅', en: "I'm still working.", zh: '我还在工作。', left: 'linDragon', right: 'maya' },
  { speakerEn: 'LIN', speakerZh: '林', en: "That wasn't my question.", zh: '我问的不是这个。', left: 'linDragon', right: 'maya' },
  { speakerEn: 'MAYA', speakerZh: '玛雅', en: 'I know.', zh: '我知道。', left: 'linDragon', right: 'maya' },
  { speakerEn: 'CHOICE 04', speakerZh: '选择 04', en: 'A new role waits in the folder.', zh: '新角色已经在资料夹里。', left: 'linNatural', right: 'maya', choice: choice04, showRoleCard: true },
  { speakerEn: 'DAVID · VOICE NOTE', speakerZh: '大卫 · 语音', en: "It's already in your folder.", zh: '已经在你的资料夹里了。', left: 'linDragon', right: 'maya', showRoleCard: true },
  { speakerEn: 'MAYA · WATCHING THE MIRROR', speakerZh: '玛雅 · 看着镜子', en: "They haven't called action yet.", zh: '他们还没喊开始。', left: 'linDragon', right: 'maya' },
];

const redCarpet: Beat[] = [
  { speakerEn: 'REPORTER 1', speakerZh: '记者 1', en: 'Lin, over here! Give us the Night Orchid eyes!', zh: '林，看这里！给我们《夜兰》里的眼神！', center: 'linDragon', right: 'maya', flash: true },
  { speakerEn: 'REPORTER 2', speakerZh: '记者 2', en: "Chin a little higher—yes, that's the one!", zh: '下巴再高一点——对，就是那个！', center: 'linDragon', right: 'maya', flash: true },
  { speakerEn: 'REPORTER 3', speakerZh: '记者 3', en: 'What kind of woman do you want to play next?', zh: '下一部，你最想演什么样的女人？', center: 'linDragon', right: 'maya', flash: true },
  { speakerEn: 'LIN', speakerZh: '林', en: 'I want to play someone who—', zh: '我想演一个——', center: 'linDragon', right: 'maya' },
  { speakerEn: 'REPORTER 2', speakerZh: '记者 2', en: "Don't move! Hold that!", zh: '别动！就保持这个！', center: 'linDragon', right: 'maya', flash: true },
];

const sequences: Partial<Record<Screen, Beat[]>> = { prologue, firstRead, lookTest, callback, locked, redCarpet };
const screenNext: Partial<Record<Screen, Screen>> = { prologue: 'profile', firstRead: 'lookTest', lookTest: 'training', callback: 'locked', locked: 'redCarpet', redCarpet: 'ending' };
const stageInfo: Record<Screen, { index: string; label: string }> = {
  title: { index: '00', label: 'CASTING ME' }, prologue: { index: '00', label: 'PROLOGUE' }, profile: { index: '00', label: 'PROFILE SETUP' },
  firstRead: { index: '01', label: 'FIRST READ' }, lookTest: { index: '02', label: 'LOOK TEST' }, training: { index: '02.5', label: 'TRAINING' },
  callback: { index: '03', label: 'CALLBACK' }, locked: { index: '04', label: 'LOCKED' }, redCarpet: { index: '05', label: 'RED CARPET' }, ending: { index: 'END', label: 'LOOK PRESET SAVED' },
};

function ping(enabled: boolean, frequency = 520) {
  if (!enabled || typeof window === 'undefined') return;
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;
  const context = new AudioContextCtor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.025, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.07);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(); oscillator.stop(context.currentTime + 0.07);
  oscillator.addEventListener('ended', () => context.close());
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>('title');
  const [beatIndex, setBeatIndex] = useState(0);
  const [language, setLanguage] = useState<Language>('en');
  const [fame, setFame] = useState(0);
  const [pressure, setPressure] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [choiceReady, setChoiceReady] = useState(false);
  const [choiceNotice, setChoiceNotice] = useState('');
  const [resolved, setResolved] = useState<string[]>([]);
  const [trainingDone, setTrainingDone] = useState<string[]>([]);
  const [hudPulse, setHudPulse] = useState(false);

  const beats = sequences[screen];
  const beat = beats?.[beatIndex];

  useEffect(() => {
    setChoiceReady(false);
    setChoiceNotice('');
    if (!beat?.choice) return;
    const timer = window.setTimeout(() => setChoiceReady(true), 800);
    return () => window.clearTimeout(timer);
  }, [screen, beatIndex, beat?.choice]);

  useEffect(() => {
    if (!beat?.flash) return;
    ping(soundOn, 760);
  }, [beatIndex, beat?.flash, soundOn]);

  const progress = useMemo(() => {
    const order: Screen[] = ['prologue', 'profile', 'firstRead', 'lookTest', 'training', 'callback', 'locked', 'redCarpet', 'ending'];
    return Math.max(0, Math.round(((order.indexOf(screen) + 1) / order.length) * 100));
  }, [screen]);

  const moveTo = (next: Screen) => { ping(soundOn, 600); setScreen(next); setBeatIndex(0); };
  const advance = () => {
    if (!beats || !beat || beat.choice) return;
    ping(soundOn, 520);
    if (beatIndex < beats.length - 1) setBeatIndex(beatIndex + 1);
    else if (screenNext[screen]) moveTo(screenNext[screen]!);
  };

  const selectChoice = (choice: Choice, set: ChoiceSet) => {
    if (!choice.preset) {
      ping(soundOn, 280);
      setChoiceNotice(language === 'en' ? 'This two-minute demo follows the preset route.' : '本次两分钟 Demo 使用预设单线程路线。');
      return;
    }
    if (!choiceReady) return;
    ping(soundOn, 680);
    if (!resolved.includes(set.id)) {
      setFame((value) => value + set.fame);
      setPressure((value) => value + set.pressure);
      setResolved((value) => [...value, set.id]);
      setHudPulse(true);
      window.setTimeout(() => setHudPulse(false), 650);
    }
    setChoiceNotice(set.result);
    window.setTimeout(() => {
      if (beats && beatIndex < beats.length - 1) setBeatIndex((value) => value + 1);
      else if (screenNext[screen]) moveTo(screenNext[screen]!);
    }, 480);
  };

  const restart = () => {
    setScreen('title'); setBeatIndex(0); setFame(0); setPressure(0); setResolved([]); setTrainingDone([]); setChoiceNotice('');
  };

  return (
    <main className={`vn-app scene-${screen}`}>
      <GameTopbar screen={screen} progress={progress} language={language} setLanguage={setLanguage} fame={fame} pressure={pressure} soundOn={soundOn} setSoundOn={setSoundOn} hudPulse={hudPulse} />

      {screen === 'title' && <TitleScreen language={language} onStart={() => moveTo('prologue')} />}
      {screen === 'profile' && <ProfileScreen language={language} fame={fame} pressure={pressure} onConfirm={() => moveTo('firstRead')} />}
      {screen === 'training' && <TrainingScreen language={language} done={trainingDone} setDone={setTrainingDone} soundOn={soundOn} onContinue={() => moveTo('callback')} />}
      {screen === 'ending' && <EndingScreen language={language} fame={fame} pressure={pressure} onRestart={restart} />}
      {beat && <DialogueScene beat={beat} language={language} index={beatIndex} total={beats?.length ?? 1} choiceReady={choiceReady} choiceNotice={choiceNotice} onAdvance={advance} onChoice={selectChoice} />}
    </main>
  );
}

function GameTopbar({ screen, progress, language, setLanguage, fame, pressure, soundOn, setSoundOn, hudPulse }: { screen: Screen; progress: number; language: Language; setLanguage: (value: Language) => void; fame: number; pressure: number; soundOn: boolean; setSoundOn: (value: boolean) => void; hudPulse: boolean }) {
  return (
    <header className="vn-topbar">
      <button className="folder-button" aria-label="Open player folder"><FolderOpen /><span>LIN_001</span></button>
      <div className="chapter-status"><span>{stageInfo[screen].index}</span><b>{stageInfo[screen].label}</b><i><em style={{ width: `${progress}%` }} /></i></div>
      {screen !== 'title' && <div className={`hud ${hudPulse ? 'pulse' : ''}`}><span>FAME <b>{fame}</b></span><span>PRESSURE <b>{pressure}</b></span></div>}
      <div className="top-actions">
        <button onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')} aria-label="Switch language">{language === 'en' ? '中' : 'EN'}</button>
        <button onClick={() => { if (!soundOn) ping(true, 700); setSoundOn(!soundOn); }} aria-label={soundOn ? 'Mute sound' : 'Enable sound'}>{soundOn ? <Volume2 /> : <VolumeX />}</button>
        <ChevronsRight className="skip-icon" aria-hidden="true" />
      </div>
    </header>
  );
}

function TitleScreen({ language, onStart }: { language: Language; onStart: () => void }) {
  return (
    <section className="title-screen">
      <div className="title-rays" aria-hidden="true" />
      <Sprite sprite="richard" position="left title-left" />
      <Sprite sprite="linNatural" position="center title-center" />
      <Sprite sprite="maya" position="right title-right" />
      <div className="title-copy">
        <p>2D SPRITE DIALOGUE · LIGHT CAREER SIM</p>
        <h1>CASTING<br /><span>ME</span></h1>
        <p className="title-zh">选角中的我</p>
        <div className="title-premise">{language === 'en' ? 'Hollywood rewards a recognizable type before it makes room for a complete person.' : '在好莱坞，选角系统先奖励可识别的类型，再决定是否容纳一个完整的人。'}</div>
        <Button className="play-button" size="lg" onClick={onStart}>{language === 'en' ? 'START AUDITION' : '开始试镜'} <ChevronRight /></Button>
        <small>{language === 'en' ? 'Approx. 2 minutes · single-path prototype' : '约 2 分钟 · 单线程原型'}</small>
      </div>
    </section>
  );
}

function ProfileScreen({ language, fame, pressure, onConfirm }: { language: Language; fame: number; pressure: number; onConfirm: () => void }) {
  return (
    <section className="profile-screen stage-screen">
      <div className="screen-card profile-card">
        <div className="card-label">PLAYER PROFILE · 001</div>
        <div className="profile-layout">
          <div className="profile-portrait"><NaturalFront className="profile-natural" /></div>
          <div className="profile-data">
            <p>LIN / 林</p><h2>ACTOR</h2>
            <dl><div><dt>LOOK</dt><dd>NATURAL</dd></div><div><dt>TRAINING</dt><dd>FORMAL ACTING</dd></div><div><dt>STATUS</dt><dd>UNCAST</dd></div><div><dt>FAME / PRESSURE</dt><dd>{fame} / {pressure}</dd></div></dl>
            <blockquote>{language === 'en' ? '“I want to play a person, not a category.”' : '“我想演一个人，不是一个类别。”'}</blockquote>
            <Button className="confirm-button" onClick={onConfirm}>{language === 'en' ? 'CONFIRM INITIAL LOOK' : '确认初始形象'} <ChevronRight /></Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function DialogueScene({ beat, language, index, total, choiceReady, choiceNotice, onAdvance, onChoice }: { beat: Beat; language: Language; index: number; total: number; choiceReady: boolean; choiceNotice: string; onAdvance: () => void; onChoice: (choice: Choice, set: ChoiceSet) => void }) {
  const sceneClass = beat.showProjects ? 'with-projects' : beat.showRoleCard ? 'with-role-card' : '';
  return (
    <section className={`dialogue-scene ${sceneClass}`}>
      <div className="set-dressing"><span>{beat.tag || stageInfoFromBeat(beat)}</span><i>{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</i></div>
      {beat.left && <Sprite sprite={beat.left} position="left" />}
      {beat.center && <Sprite sprite={beat.center} position="center" />}
      {beat.right && <Sprite sprite={beat.right} position="right" />}
      {beat.showProjects && <ProjectCards />}
      {beat.showRoleCard && <RoleCard />}
      {beat.flash && <div className="camera-flash" key={`flash-${index}`} />}

      {beat.choice ? (
        <ChoicePanel set={beat.choice} language={language} ready={choiceReady} notice={choiceNotice} onChoice={onChoice} />
      ) : (
        <div className="dialogue-shell">
          <span className="speaker-tag">{language === 'en' ? beat.speakerEn : beat.speakerZh}</span>
          <button className="dialogue-box" onClick={onAdvance} aria-label="Continue dialogue">
            <span className="dialogue-text">{language === 'en' ? beat.en : beat.zh}</span>
            <span className="dialogue-next"><ChevronRight /></span>
          </button>
        </div>
      )}
    </section>
  );
}

function ChoicePanel({ set, language, ready, notice, onChoice }: { set: ChoiceSet; language: Language; ready: boolean; notice: string; onChoice: (choice: Choice, set: ChoiceSet) => void }) {
  return (
    <div className="choice-panel">
      <div className="choice-title"><span>{language === 'en' ? 'CASTING RESPONSE' : '试镜回应'}</span><small>{language === 'en' ? 'Choose a line' : '选择一句台词'}</small></div>
      <div className="choice-list">
        {set.items.map((choice, index) => (
          <button key={choice.id} className={choice.preset && ready ? 'preset' : ''} onClick={() => onChoice(choice, set)}>
            <span>{String.fromCharCode(65 + index)}</span><b>{language === 'en' ? choice.en : choice.zh}</b>{choice.preset && ready && <em>PRESET</em>}
          </button>
        ))}
      </div>
      <p className="choice-notice">{notice || (ready ? (language === 'en' ? 'Preset route available.' : '预设路线已亮起。') : (language === 'en' ? 'Reading the room…' : '正在读取现场…'))}</p>
    </div>
  );
}

function TrainingScreen({ language, done, setDone, soundOn, onContinue }: { language: Language; done: string[]; setDone: (value: string[]) => void; soundOn: boolean; onContinue: () => void }) {
  const tokens = [
    { id: 'acting', label: 'ACTING', zh: '表演', result: 'DEPTH REGISTERED', detailEn: 'Suspicion · Protection · Revenge', detailZh: '怀疑 · 保护 · 报复' },
    { id: 'martial', label: 'MARTIAL ARTS', zh: '武术', result: 'TAG: COMBAT-READY', detailEn: 'Fatigue not registered', detailZh: '疲惫未被登记' },
    { id: 'accent', label: 'ASIAN ACCENT', zh: '亚洲口音', result: 'TAG: INTERNATIONAL', detailEn: '“Easier to place”', detailZh: '“更容易被听出来”' },
  ];
  const click = (id: string) => { if (done.includes(id)) return; ping(soundOn, 570 + done.length * 80); setDone([...done, id]); };
  return (
    <section className="training-screen stage-screen">
      <div className="training-copy"><span>TRAINING TOKENS ×3</span><h2>{language === 'en' ? 'What becomes a market tag?' : '什么会变成市场标签？'}</h2><p>{language === 'en' ? 'Training changes the language used to describe Lin. It does not change Fame or Pressure.' : '训练只改变描述林的语言，不直接改变 Fame 或 Pressure。'}</p></div>
      <div className="training-tokens">
        {tokens.map((token, index) => <button key={token.id} onClick={() => click(token.id)} className={done.includes(token.id) ? 'done' : ''}><span>0{index + 1}</span><b>{language === 'en' ? token.label : token.zh}</b><small>{done.includes(token.id) ? token.result : language === 'en' ? token.detailEn : token.detailZh}</small></button>)}
      </div>
      <NaturalFront className="training-character" />
      <Button className="continue-button" disabled={done.length !== 3} onClick={onContinue}>{language === 'en' ? 'CONTINUE TO CALLBACK' : '进入回调'} <ChevronRight /></Button>
    </section>
  );
}

function EndingScreen({ language, fame, pressure, onRestart }: { language: Language; fame: number; pressure: number; onRestart: () => void }) {
  return (
    <section className="ending-screen">
      <div className="ending-flash" />
      <Sprite sprite="linDragon" position="center ending-lin" />
      <Sprite sprite="maya" position="right ending-maya" />
      <div className="ending-echo">“Now I know how to pitch you.”</div>
      <div className="ending-card">
        <span>LOOK PRESET SAVED</span><h2>NIGHT ORCHID</h2><p>DRAGON LADY · SAME EYES · SAME HAIR · SAME RESTRAINT</p>
        <div><b>FAME {fame}</b><b>PRESSURE {pressure}</b></div>
        <blockquote>{language === 'en' ? 'She is seen. Her sentence is not finished.' : '她被看见了。她的话没有说完。'}</blockquote>
        <Button className="restart-button" onClick={onRestart}><RotateCcw /> {language === 'en' ? 'PLAY AGAIN' : '重新开始'}</Button>
      </div>
    </section>
  );
}

function Sprite({ sprite, position }: { sprite: SpriteKey; position: string }) {
  const data = sprites[sprite];
  if (data.frontCrop) return <NaturalFront className={`character-sprite ${position}`} />;
  return <img className={`character-sprite ${position}`} src={data.src} alt={data.name} />;
}

function NaturalFront({ className }: { className: string }) {
  return (
    <div className={`lin-natural-front ${className}`} role="img" aria-label={sprites.linNatural.name}>
      <img src={sprites.linNatural.src} alt="" aria-hidden="true" />
    </div>
  );
}

function ProjectCards() {
  return <div className="project-cards"><article className="hot"><span>01</span><b>NIGHT ORCHID</b><small>INFORMATION BROKER · DRAGON LADY</small></article><article><span>02</span><b>PAPER MOON</b><small>IMMIGRANT LOVE INTEREST · CHINA DOLL</small></article><article className="hold"><span>03</span><b>THE THIRD ROOM</b><small>INVESTIGATIVE REPORTER · POSITIONING UNCLEAR</small></article></div>;
}

function RoleCard() {
  return <div className="role-card"><span>INCOMING ROLE · 04</span><h3>DR. ELAINE WU</h3><p>EMERGENCY PHYSICIAN</p><small>SAME EYES / SAME HAIR / SAME RESTRAINT</small></div>;
}

function stageInfoFromBeat(beat: Beat) {
  if (beat.showProjects) return 'CALLBACK ROOM / PROJECT SLATE';
  if (beat.showRoleCard) return 'MAKEUP TRAILER / THREE MONTHS LATER';
  if (beat.center === 'linGraduation') return 'CLASS OF 2026';
  return 'AUDITION IN PROGRESS';
}
