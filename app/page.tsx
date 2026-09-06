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
type Screen = 'title' | 'creator' | 'prologue' | 'profile' | 'firstRead' | 'lookTest' | 'training' | 'callback' | 'locked' | 'redCarpet' | 'ending';
type SpriteKey = 'linNatural' | 'linDragon' | 'linDragonBack' | 'linTraining' | 'linPorcelain' | 'linGraduation' | 'richard' | 'david' | 'claire' | 'maya';
type AvatarKey = 'original' | 'sleek' | 'bob' | 'pony';

type Choice = { id: string; en: string; zh: string; preset?: boolean };
type ChoiceSet = { id: string; items: Choice[]; fame: number; pressure: number; resultEn: string; resultZh: string };
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
  linDragonBack: { src: '/characters/lin-dragon-back.png', name: 'Lin — Night Orchid look, rear pose' },
  linTraining: { src: '/characters/lin-training.png', name: 'Lin — Night Orchid fight training' },
  linPorcelain: { src: '/characters/lin-porcelain.png', name: 'Lin — Porcelain Light look' },
  linGraduation: { src: '/characters/lin-graduation.png', name: 'Lin at graduation' },
  richard: { src: '/characters/richard.png', name: 'Richard Cole' },
  david: { src: '/characters/david.png', name: 'David Miller' },
  claire: { src: '/characters/claire.png', name: 'Claire Bennett' },
  maya: { src: '/characters/maya.png', name: 'Maya Park' },
};

const avatarOptions: Record<AvatarKey, { src: string; hairEn: string; hairZh: string; faceEn: string; faceZh: string }> = {
  original: { src: '/avatars/lin-original.png', hairEn: 'LONG WAVES', hairZh: '长卷发', faceEn: 'SOFT', faceZh: '柔和' },
  sleek: { src: '/avatars/lin-sleek.png', hairEn: 'SLEEK', hairZh: '长直发', faceEn: 'SHARP', faceZh: '利落' },
  bob: { src: '/avatars/lin-bob.png', hairEn: 'BOB', hairZh: '短波波头', faceEn: 'GENTLE', faceZh: '温和' },
  pony: { src: '/avatars/lin-pony.png', hairEn: 'PONYTAIL', hairZh: '高马尾', faceEn: 'FOCUSED', faceZh: '坚定' },
};

const choice01: ChoiceSet = {
  id: 'choice-01', fame: -1, pressure: 2, resultEn: 'AUDITION RESULT: NOT ALIGNED · FAME -1 · PRESSURE +2', resultZh: '试镜结果：不匹配 · FAME -1 · PRESSURE +2',
  items: [
    { id: 'a', en: 'Remove the hesitation and play her as certain.', zh: '删掉迟疑，把她演得绝对确定。' },
    { id: 'b', en: 'She is not a pitch. She is a person.', zh: '她不是一个卖点，她是一个人。', preset: true },
    { id: 'c', en: 'Ask for another read and keep one final second of doubt.', zh: '请求再读一次，保留最后一秒的迟疑。' },
  ],
};

const choice02: ChoiceSet = {
  id: 'choice-02', fame: 2, pressure: 2, resultEn: 'AGENT SIGNED: CLAIRE BENNETT · FAME +2 · PRESSURE +2', resultZh: '签约完成：CLAIRE BENNETT · FAME +2 · PRESSURE +2',
  items: [
    { id: 'a', en: 'Choose David: move slower and protect role width.', zh: '选择 David：慢一些，保留角色宽度。' },
    { id: 'b', en: 'Choose Claire: enter mainstream projects faster.', zh: '选择 Claire：更快进入主流项目。', preset: true },
  ],
};

const choice04: ChoiceSet = {
  id: 'choice-04', fame: 0, pressure: 1, resultEn: 'DIRECTOR FAVOR +1 · PRESSURE +1', resultZh: '导演好感 +1 · PRESSURE +1',
  items: [
    { id: 'a', en: 'Order seasonal noodles and hot tea as usual.', zh: '按自己的习惯点时蔬面与热茶。' },
    { id: 'b', en: 'Match Richard: steak, arugula salad, and pinot noir.', zh: '跟随 Richard：牛排、芝麻菜沙拉与黑皮诺。', preset: true },
    { id: 'c', en: 'Choose the same entrée, but replace the wine with sparkling water.', zh: '选择相同主菜，但把酒换成气泡水。' },
  ],
};

const choice05: ChoiceSet = {
  id: 'choice-05', fame: 3, pressure: 2, resultEn: 'COVER RESPONSE ×2.4 · MOVIE OFFER UNLOCKED', resultZh: '封面反馈 ×2.4 · 电影邀约已解锁',
  items: [
    { id: 'a', en: 'Keep the modern Chinese look and change only the expression.', zh: '保留中式典雅造型，只调整表情。' },
    { id: 'b', en: 'Request a third look without a cultural tag.', zh: '要求尝试第三套不带文化标签的造型。' },
    { id: 'c', en: 'Accept the high-recognition red-and-black look.', zh: '接受红黑高领的高识别度造型。', preset: true },
  ],
};

const choice06: ChoiceSet = {
  id: 'choice-06', fame: 2, pressure: 1, resultEn: 'SCRIPT LOCKED: NIGHT ORCHID · DRAGON LADY', resultZh: '剧本锁定：《夜兰》· DRAGON LADY',
  items: [
    { id: 'a', en: 'Night Orchid: Dragon Lady commercial action film.', zh: '《夜兰》：Dragon Lady 商业动作片。', preset: true },
    { id: 'b', en: 'White Season: White Lotus commercial romance.', zh: '《白色花季》：White Lotus 商业爱情片。' },
    { id: 'c', en: 'Small Weather: original independent drama.', zh: '《小城天气》：独立小剧组原创剧情片。' },
  ],
};

const prologue: Beat[] = [
  { speakerEn: 'ACTING SCHOOL', speakerZh: '表演学校', en: 'She spent four years learning how to understand different people.', zh: '她用四年学习如何理解不同的人。', center: 'linNatural', tag: 'PANEL 01 / ACTING SCHOOL' },
  { speakerEn: 'GRADUATION', speakerZh: '毕业', en: 'She believed the work would eventually speak for itself.', zh: '她相信，演技最终会说话。', center: 'linGraduation', tag: 'PANEL 02 / CLASS OF 2026' },
  { speakerEn: 'HOLLYWOOD', speakerZh: '好莱坞', en: 'New roles are created here every day—and familiar faces are searched for again and again.', zh: '这里每天都产生新角色，也反复寻找熟悉的面孔。', center: 'linNatural', tag: 'PANEL 03 / LOS ANGELES' },
  { speakerEn: 'FIRST CALL', speakerZh: '第一次机会', en: 'She thought the first step into the industry was proving she could play a complete person.', zh: '她以为进入行业的第一步，是证明自己能演一个完整的人。', center: 'linNatural', tag: '“I WANT TO PLAY A PERSON, NOT A CATEGORY.”' },
];

const firstRead: Beat[] = [
  { speakerEn: 'RICHARD', speakerZh: '理查德', en: "Page three. Don't give me her past yet. Give me the first impression.", zh: '第三页。先不要给我她的过去，只给我第一印象。', left: 'linNatural', right: 'richard' },
  { speakerEn: 'LIN', speakerZh: '林', en: 'Her mentor betrayed her. She is angry, but part of her still doubts herself.', zh: '她被导师背叛了。她很愤怒，但仍有一部分在怀疑自己。', left: 'linNatural', right: 'richard' },
  { speakerEn: 'RICHARD', speakerZh: '理查德', en: 'Doubt slows the read. I need calm, dangerous, no explanation.', zh: '怀疑会拖慢理解。我需要冷静、危险，不解释。', left: 'linNatural', right: 'richard' },
  { speakerEn: 'LIN', speakerZh: '林', en: 'Then why do you need the scene?', zh: '那你为什么还需要这场戏？', left: 'linNatural', right: 'richard' },
  { speakerEn: 'RICHARD', speakerZh: '理查德', en: 'Because the audience decides what she is before they know her.', zh: '因为观众在了解她以前，就会先决定她是什么。', left: 'linNatural', right: 'richard' },
  { speakerEn: 'CHOICE 01', speakerZh: '选择 01', en: 'Respond to the direction.', zh: '回应导演的调整。', left: 'linNatural', right: 'richard', choice: choice01 },
  { speakerEn: 'LIN', speakerZh: '林', en: 'If I remove the contradiction, she becomes a pose.', zh: '如果删掉她的矛盾，她就只剩一个姿势。', left: 'linNatural', right: 'richard' },
  { speakerEn: 'RICHARD', speakerZh: '理查德', en: "Understood. Then we're not looking for the same kind of collaboration.", zh: '我明白。那我们寻找的不是同一种合作。', left: 'linNatural', right: 'richard' },
  { speakerEn: 'REJECTION 01', speakerZh: '落选 01', en: '“Strong work, unclear positioning.”', zh: '“表演扎实，但定位不清晰。”', center: 'linNatural', tag: 'REJECTION STACK · RENT DUE' },
  { speakerEn: 'REJECTION 02', speakerZh: '落选 02', en: '“Missing an instantly recognizable edge.”', zh: '“缺少立即可识别的锋利感。”', center: 'linNatural', tag: 'REJECTION STACK · RENT DUE' },
  { speakerEn: 'REJECTION 03', speakerZh: '落选 03', en: '“Moving forward with an actor closer to the project’s direction.”', zh: '“决定采用更符合项目方向的演员。”', center: 'linNatural', tag: 'REJECTION STACK · RENT DUE' },
  { speakerEn: 'LIN', speakerZh: '林', en: 'Every message says the work was good.', zh: '每封信都说我演得不错。', center: 'linNatural', tag: 'FAME -1 · PRESSURE 2' },
  { speakerEn: 'LIN · AFTER A PAUSE', speakerZh: '林 · 停顿', en: 'None of them needs me.', zh: '没有一封信需要我。', center: 'linNatural', tag: 'CHOICE WIDTH · HIDDEN' },
];

const lookTest: Beat[] = [
  { speakerEn: 'DAVID', speakerZh: '大卫', en: "I reviewed your training. You don't lack ability. You lack a room willing to see it slowly.", zh: '我看了你的训练资料。你不缺能力，你缺的是允许能力被慢慢看见的空间。', left: 'linNatural', right: 'david', tag: 'AGENT PROFILE · DAVID CHEN' },
  { speakerEn: 'LIN', speakerZh: '林', en: 'Can you find that room?', zh: '你能找到那种房间吗？', left: 'linNatural', right: 'david' },
  { speakerEn: 'DAVID', speakerZh: '大卫', en: 'Yes, but not quickly. I would protect your role range first, then build the opportunities.', zh: '能，但不会快。我会先保住你的角色范围，再一点点扩大机会。', left: 'linNatural', right: 'david', tag: 'CULTURAL UNDERSTANDING: HIGH · MARKET SPEED: STEADY' },
  { speakerEn: 'CLAIRE', speakerZh: '克莱尔', en: "You don't have an acting problem. You have a recognition problem.", zh: '你没有表演问题。你有识别问题。', left: 'linNatural', right: 'claire', tag: 'AGENT PROFILE · CLAIRE BENNETT' },
  { speakerEn: 'LIN', speakerZh: '林', en: 'How would you solve it?', zh: '你准备怎么解决？', left: 'linNatural', right: 'claire' },
  { speakerEn: 'CLAIRE', speakerZh: '克莱尔', en: 'Shorten the time it takes to understand you. Three seconds can decide a photo; ten can decide a meeting.', zh: '缩短别人理解你的时间。三秒足够决定一张照片，十秒足够决定一次会面。', left: 'linNatural', right: 'claire', tag: 'MARKET ACCESS: STRONG · REVISION RATE: HIGH' },
  { speakerEn: 'LIN', speakerZh: '林', en: 'And after the three seconds?', zh: '那三秒以后呢？', left: 'linNatural', right: 'claire' },
  { speakerEn: 'CLAIRE', speakerZh: '克莱尔', en: 'First make them stay. Then we can discuss what comes after.', zh: '先让他们留下来，之后再谈以后。', left: 'linNatural', right: 'claire' },
  { speakerEn: 'CHOICE 02', speakerZh: '选择 02', en: 'Sign with an agent.', zh: '签约经纪人。', left: 'linNatural', right: 'claire', choice: choice02 },
  { speakerEn: 'LIN', speakerZh: '林', en: "I've been moving slowly long enough.", zh: '我已经慢得够久了。', left: 'linNatural', right: 'claire' },
  { speakerEn: 'CLAIRE', speakerZh: '克莱尔', en: 'Good. Tomorrow we reorganize what people see first.', zh: '很好。明天开始，我们重新整理别人第一眼看到的东西。', left: 'linNatural', right: 'claire' },
];

const callback: Beat[] = [
  { speakerEn: 'CLAIRE · BEFORE DINNER', speakerZh: '克莱尔 · 饭局前', en: "Tonight isn't an audition. Let him feel that you can stay in the same room for a long time.", zh: '今晚不谈试镜。先让他觉得你适合长时间待在同一个房间里。', left: 'linNatural', right: 'claire', tag: 'CHAPTER 2 · DINNER' },
  { speakerEn: 'LIN', speakerZh: '林', en: 'That still sounds like an audition.', zh: '这听起来还是试镜。', left: 'linNatural', right: 'claire' },
  { speakerEn: 'CLAIRE', speakerZh: '克莱尔', en: 'A lot of auditions in this industry have no lines.', zh: '行业里很多试镜没有台词。', left: 'linNatural', right: 'claire' },
  { speakerEn: 'RICHARD', speakerZh: '理查德', en: "Claire says you're adapting quickly.", zh: 'Claire 说你适应得很快。', left: 'linNatural', right: 'richard' },
  { speakerEn: 'LIN', speakerZh: '林', en: 'I used to think adapting to the role was enough.', zh: '我以前以为适应角色就够了。', left: 'linNatural', right: 'richard' },
  { speakerEn: 'RICHARD', speakerZh: '理查德', en: 'Projects are long. People also notice whether you make the work easy.', zh: '项目很长。大家也会看你是否让工作变得简单。', left: 'linNatural', right: 'richard' },
  { speakerEn: 'SERVER', speakerZh: '服务员', en: 'May I take your order?', zh: '现在为您点单吗？', left: 'linNatural', right: 'richard' },
  { speakerEn: 'CHOICE 04', speakerZh: '选择 04', en: 'Choose the order and social rhythm.', zh: '选择点单与社交节奏。', left: 'linNatural', right: 'richard', choice: choice04 },
  { speakerEn: 'LIN', speakerZh: '林', en: "I'll have what Richard is having. Medium rare.", zh: '跟 Richard 一样。牛排五分熟。', left: 'linNatural', right: 'richard' },
  { speakerEn: 'RICHARD', speakerZh: '理查德', en: "Good. You're learning faster than last time.", zh: '很好。你学得比上次快。', left: 'linNatural', right: 'richard' },
  { speakerEn: 'LIN', speakerZh: '林', en: 'Do you mean the acting?', zh: '你说的是表演吗？', left: 'linNatural', right: 'richard' },
  { speakerEn: 'RICHARD', speakerZh: '理查德', en: 'I mean collaboration.', zh: '我说的是合作。', left: 'linNatural', right: 'richard', tag: 'DIRECTOR FAVOR +1' },
  { speakerEn: 'RICHARD', speakerZh: '理查德', en: 'A magazine needs a new face next week. Claire will send the details.', zh: '下周有一本杂志需要新面孔。Claire 会把资料发给你。', left: 'linNatural', right: 'richard' },
  { speakerEn: 'LIN', speakerZh: '林', en: 'Because of tonight?', zh: '因为今晚？', left: 'linNatural', right: 'richard' },
  { speakerEn: 'RICHARD', speakerZh: '理查德', en: "Because you made me believe tomorrow won't be harder.", zh: '因为你让我相信明天不会更难。', left: 'linNatural', right: 'richard' },
  { speakerEn: 'MAYA', speakerZh: '玛雅', en: 'First cover?', zh: '第一次拍封面？', left: 'linNatural', right: 'maya', tag: 'CHAPTER 3 · REFRAME' },
  { speakerEn: 'LIN', speakerZh: '林', en: 'First time someone asked me here by name.', zh: '第一次有人因为我的名字让我来。', left: 'linNatural', right: 'maya' },
  { speakerEn: 'MAYA', speakerZh: '玛雅', en: 'Then remember what you looked like when you walked in.', zh: '那就记住你进门时穿的样子。', left: 'linNatural', right: 'maya' },
  { speakerEn: 'LIN', speakerZh: '林', en: 'Why?', zh: '为什么？', left: 'linNatural', right: 'maya' },
  { speakerEn: 'MAYA', speakerZh: '玛雅', en: 'You usually look different when you leave.', zh: '离开时通常不一样。', left: 'linNatural', right: 'maya' },
  { speakerEn: 'RICHARD', speakerZh: '理查德', en: "It's elegant, and it's safe. We need something sexier.", zh: '很体面，也很安全。我们需要更性感一点。', left: 'linNatural', right: 'richard', tag: 'ELEGANT · CREDIBLE · LOW IMMEDIATE HEAT' },
  { speakerEn: 'LIN', speakerZh: '林', en: 'The interview is about my work.', zh: '采访谈的是我的工作。', left: 'linNatural', right: 'richard' },
  { speakerEn: 'CLAIRE', speakerZh: '克莱尔', en: 'The cover decides whether they ever reach the interview.', zh: '封面决定他们会不会读到采访。', left: 'linNatural', right: 'claire' },
  { speakerEn: 'LIN', speakerZh: '林', en: 'What do you want to replace?', zh: '你想换掉什么？', left: 'linNatural', right: 'richard' },
  { speakerEn: 'RICHARD', speakerZh: '理查德', en: "Don't replace the culture. Turn it into a promise.", zh: '不要换掉文化。把它变成承诺。', left: 'linNatural', right: 'richard' },
  { speakerEn: 'CHOICE 05', speakerZh: '选择 05', en: 'Respond to the magazine reframe.', zh: '回应杂志改造要求。', left: 'linNatural', right: 'richard', choice: choice05 },
  { speakerEn: 'RICHARD', speakerZh: '理查德', en: 'Yes. Now the cover knows what to promise.', zh: '对。现在封面知道该承诺什么。', left: 'linDragon', right: 'richard', tag: 'PROJECTED ENGAGEMENT ×2.4' },
  { speakerEn: 'CLAIRE', speakerZh: '克莱尔', en: "Hold this state. Don't remove it before the next set.", zh: '保持这个状态。不要在下一组之前卸掉。', left: 'linDragon', right: 'claire' },
  { speakerEn: 'MAYA', speakerZh: '玛雅', en: 'The first time, they ask if you can do it.', zh: '第一次，他们会问你能不能做到。', left: 'linDragon', right: 'maya' },
  { speakerEn: 'MAYA', speakerZh: '玛雅', en: 'Later, the look is ready before you arrive.', zh: '后来，造型会在你到之前准备好。', left: 'linDragon', right: 'maya' },
  { speakerEn: 'LIN', speakerZh: '林', en: 'Did it work for you?', zh: '这对你有用吗？', left: 'linDragon', right: 'maya' },
  { speakerEn: 'MAYA', speakerZh: '玛雅', en: "I'm still working.", zh: '我还在工作。', left: 'linDragon', right: 'maya' },
  { speakerEn: 'LIN', speakerZh: '林', en: "That wasn't my question.", zh: '我问的不是这个。', left: 'linDragon', right: 'maya' },
  { speakerEn: 'MAYA', speakerZh: '玛雅', en: 'I know.', zh: '我知道。', left: 'linDragonBack', right: 'maya', tag: 'NEW MESSAGE · THREE SCRIPTS AWAIT SELECTION' },
];

const locked: Beat[] = [
  { speakerEn: 'CLAIRE', speakerZh: '克莱尔', en: 'The magazine has been live for six hours. We now have three formal offers.', zh: '杂志上线六小时。现在有三个正式邀约。', left: 'linDragon', right: 'claire', showProjects: true },
  { speakerEn: 'LIN', speakerZh: '林', en: 'That quickly?', zh: '这么快？', left: 'linDragon', right: 'claire', showProjects: true },
  { speakerEn: 'CLAIRE', speakerZh: '克莱尔', en: "They didn't suddenly discover you can act. They finally know where to place you.", zh: '他们不是突然发现你会演戏。他们终于知道该把你放在哪里。', left: 'linDragon', right: 'claire', showProjects: true },
  { speakerEn: 'LIN', speakerZh: '林', en: 'The third role is the most complete.', zh: '第三个角色最完整。', left: 'linDragon', right: 'claire', showProjects: true },
  { speakerEn: 'CLAIRE', speakerZh: '克莱尔', en: "It's also the only project without a global distribution commitment.", zh: '也是唯一没有全球发行承诺的项目。', left: 'linDragon', right: 'claire', showProjects: true },
  { speakerEn: 'LIN', speakerZh: '林', en: "Then these aren't the same kind of opportunity.", zh: '所以这三个不是同一种机会。', left: 'linDragon', right: 'claire', showProjects: true },
  { speakerEn: 'CLAIRE', speakerZh: '克莱尔', en: "They're all jobs. Some jobs simply change the size of the next one.", zh: '它们都是工作。只是有些工作会改变下一份工作的大小。', left: 'linDragon', right: 'claire', showProjects: true },
  { speakerEn: 'CHOICE 06', speakerZh: '选择 06', en: 'Choose a film script.', zh: '选择电影剧本。', left: 'linDragon', right: 'claire', choice: choice06, showProjects: true },
  { speakerEn: 'LIN', speakerZh: '林', en: 'Night Orchid.', zh: '选《夜兰》。', left: 'linDragon', right: 'claire', showProjects: true },
  { speakerEn: 'CLAIRE', speakerZh: '克莱尔', en: "Good. Keep the red-and-black look; they've already placed the magazine image in the pitch.", zh: '好。红黑造型保留，他们已经把杂志图放进提案。', left: 'linDragon', right: 'claire', showProjects: true },
  { speakerEn: 'LIN', speakerZh: '林', en: "They haven't seen my audition.", zh: '他们还没看我的试镜。', left: 'linDragon', right: 'claire', showProjects: true },
  { speakerEn: 'CLAIRE', speakerZh: '克莱尔', en: "They've seen the market response.", zh: '他们看过市场反应。', left: 'linDragon', right: 'claire', showProjects: true, tag: 'SCRIPT LOCKED · NIGHT ORCHID' },
];

const redCarpet: Beat[] = [
  { speakerEn: 'PROCESS CARD 01', speakerZh: '过程图 01', en: 'The fight test: precise, controlled, internationally legible.', zh: '动作测试：精准、冷静、可国际发行。', center: 'linDragon', tag: 'NIGHT ORCHID · FIGHT TEST' },
  { speakerEn: 'PROCESS CARD 02', speakerZh: '过程图 02', en: "The global poster keeps Lin's raised chin, blade silhouette, and the English title.", zh: '全球版海报只保留林抬起的下巴、短刃轮廓与英文片名。', center: 'linDragon', tag: 'GLOBAL POSTER · NIGHT ORCHID' },
  { speakerEn: 'PROCESS CARD 03', speakerZh: '过程图 03', en: 'Opening weekend exceeds forecasts. Reviews repeat: icy, dangerous, mysterious.', zh: '首周末票房超过预测；评论高频词是：冰冷、危险、神秘。', center: 'linDragon', tag: 'OPENING WEEKEND · ABOVE FORECAST' },
  { speakerEn: 'CLAIRE', speakerZh: '克莱尔', en: 'Opening weekend doubled the forecast. A sequel and two brand offers are already in discussion.', zh: '首周末超过预测一倍。续集和两个品牌邀约都在谈。', center: 'linDragon', right: 'claire' },
  { speakerEn: 'LIN', speakerZh: '林', en: 'Did any review mention Anna?', zh: '评论里有人提到 Anna 吗？', center: 'linDragon', right: 'claire' },
  { speakerEn: 'CLAIRE', speakerZh: '克莱尔', en: 'They mentioned you.', zh: '他们提到了你。', center: 'linDragon', right: 'claire' },
  { speakerEn: 'RICHARD · VOICE MESSAGE', speakerZh: '理查德 · 语音消息', en: 'Now everyone knows how to pitch you.', zh: '现在所有人都知道该怎么介绍你。', center: 'linDragon', right: 'richard', tag: 'FILM SUCCESS · FAME +5 · NEXT OFFERS 4' },
  { speakerEn: 'REPORTER 1', speakerZh: '记者 1', en: 'Lin, over here! Give us the Night Orchid eyes!', zh: '林，看这里！给我们《夜兰》里的眼神！', center: 'linDragon', right: 'maya', flash: true },
  { speakerEn: 'REPORTER 2', speakerZh: '记者 2', en: 'Chin a little higher—yes, the magazine-cover one!', zh: '下巴再高一点——对，就是杂志封面那个！', center: 'linDragon', right: 'maya', flash: true },
  { speakerEn: 'REPORTER 3', speakerZh: '记者 3', en: 'Is the next one another international action film?', zh: '下一部还是国际动作片吗？', center: 'linDragon', right: 'maya', flash: true },
  { speakerEn: 'REPORTER 1', speakerZh: '记者 1', en: 'What kind of woman do you most want to play?', zh: '你最想演什么样的女人？', center: 'linDragon', right: 'maya', flash: true },
  { speakerEn: 'LIN', speakerZh: '林', en: 'I want to play someone who—', zh: '我想演一个——', center: 'linDragon', right: 'maya' },
  { speakerEn: 'REPORTER 2', speakerZh: '记者 2', en: "Don't move! Hold that!", zh: '别动！就保持这个！', center: 'linDragon', right: 'maya', flash: true },
];

const sequences: Partial<Record<Screen, Beat[]>> = { prologue, firstRead, lookTest, callback, locked, redCarpet };
const screenNext: Partial<Record<Screen, Screen>> = { prologue: 'profile', firstRead: 'lookTest', lookTest: 'creator', callback: 'locked', locked: 'training', redCarpet: 'ending' };

function getSceneBackground(screen: Screen, beatIndex: number) {
  if (screen === 'prologue') return beatIndex < 3 ? '/backgrounds/university-campus.png' : '/backgrounds/audition-room.png';
  if (screen === 'firstRead') return beatIndex < 8 ? '/backgrounds/audition-room.png' : '/backgrounds/night-apartment.png';
  if (screen === 'lookTest') return '/backgrounds/night-apartment.png';
  if (screen === 'callback') return beatIndex < 15 ? '/backgrounds/western-restaurant.png' : '/backgrounds/magazine-studio.png';
  if (screen === 'locked') return '/backgrounds/agency-meeting-room.png';
  if (screen === 'redCarpet') return '/backgrounds/premiere-media-wall.png';
  return undefined;
}

const stageInfo: Record<Screen, { index: string; label: string }> = {
  title: { index: '00', label: 'CASTING ME' }, creator: { index: '02B', label: 'FACE EDITOR' }, prologue: { index: '00', label: 'PROLOGUE' }, profile: { index: '00', label: 'PROFILE SETUP' },
  firstRead: { index: '01', label: 'DOWNFALL' }, lookTest: { index: '02A', label: 'CHOOSE AN AGENT' }, training: { index: '04B', label: 'TRAINING TRADE-OFF' },
  callback: { index: '02C–03', label: 'DINNER / REFRAME' }, locked: { index: '04A', label: 'THREE SCRIPTS' }, redCarpet: { index: '04C–D', label: 'SUCCESS / RED CARPET' }, ending: { index: 'END', label: 'SUCCESS REGISTERED' },
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
  const [avatar, setAvatar] = useState<AvatarKey>('original');

  const beats = sequences[screen];
  const beat = beats?.[beatIndex];
  const sceneBackground = getSceneBackground(screen, beatIndex);

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

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('casting-me-avatar');
      if (saved && saved in avatarOptions) setAvatar(saved as AvatarKey);
    } catch {
      // Storage can be unavailable in strict private browsing; the in-session choice still works.
    }
  }, []);

  const progress = useMemo(() => {
    const order: Screen[] = ['prologue', 'profile', 'firstRead', 'lookTest', 'creator', 'callback', 'locked', 'training', 'redCarpet', 'ending'];
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
    setChoiceNotice(language === 'en' ? set.resultEn : set.resultZh);
    window.setTimeout(() => {
      if (beats && beatIndex < beats.length - 1) setBeatIndex((value) => value + 1);
      else if (screenNext[screen]) moveTo(screenNext[screen]!);
    }, 480);
  };

  const restart = () => {
    setScreen('title'); setBeatIndex(0); setFame(0); setPressure(0); setResolved([]); setTrainingDone([]); setChoiceNotice('');
  };

  const confirmAvatar = () => {
    try { window.localStorage.setItem('casting-me-avatar', avatar); } catch { /* Keep the in-session selection. */ }
    if (!resolved.includes('face-preset')) {
      setFame((value) => value + 2);
      setPressure((value) => value + 2);
      setResolved((value) => [...value, 'face-preset']);
      setHudPulse(true);
      window.setTimeout(() => setHudPulse(false), 650);
    }
    moveTo('callback');
  };

  const completeTraining = () => {
    if (!resolved.includes('film-success')) {
      setFame((value) => value + 5);
      setResolved((value) => [...value, 'film-success']);
      setHudPulse(true);
      window.setTimeout(() => setHudPulse(false), 650);
    }
    moveTo('redCarpet');
  };

  return (
    <main className={`vn-app scene-${screen}`}>
      <GameTopbar screen={screen} progress={progress} language={language} setLanguage={setLanguage} fame={fame} pressure={pressure} soundOn={soundOn} setSoundOn={setSoundOn} hudPulse={hudPulse} />

      {screen === 'title' && <TitleScreen language={language} avatar={avatar} onStart={() => moveTo('prologue')} />}
      {screen === 'creator' && <AvatarCreator language={language} avatar={avatar} setAvatar={setAvatar} soundOn={soundOn} onConfirm={confirmAvatar} />}
      {screen === 'profile' && <ProfileScreen language={language} avatar={avatar} fame={fame} pressure={pressure} onConfirm={() => moveTo('firstRead')} />}
      {screen === 'training' && <TrainingScreen language={language} avatar={avatar} done={trainingDone} setDone={setTrainingDone} soundOn={soundOn} onContinue={completeTraining} />}
      {screen === 'ending' && <EndingScreen language={language} avatar={avatar} fame={fame} pressure={pressure} onRestart={restart} />}
      {beat && <DialogueScene beat={beat} language={language} avatar={avatar} index={beatIndex} total={beats?.length ?? 1} background={sceneBackground} choiceReady={choiceReady} choiceNotice={choiceNotice} onAdvance={advance} onChoice={selectChoice} />}
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

function TitleScreen({ language, avatar, onStart }: { language: Language; avatar: AvatarKey; onStart: () => void }) {
  return (
    <section className="title-screen">
      <div className="title-rays" aria-hidden="true" />
      <Sprite sprite="richard" avatar={avatar} position="left title-left" />
      <Sprite sprite="linNatural" avatar={avatar} position="center title-center" />
      <Sprite sprite="maya" avatar={avatar} position="right title-right" />
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

function AvatarCreator({ language, avatar, setAvatar, soundOn, onConfirm }: { language: Language; avatar: AvatarKey; setAvatar: (value: AvatarKey) => void; soundOn: boolean; onConfirm: () => void }) {
  const current = avatarOptions[avatar];
  return (
    <section className="creator-screen stage-screen">
      <div className="creator-card">
        <div className="creator-preview">
          <span>PLAYER MODEL · LIVE PREVIEW</span>
          <AvatarArt avatar={avatar} className="creator-avatar" />
          <div className="creator-readout">
            <b>{language === 'en' ? current.hairEn : current.hairZh}</b>
            <i>{language === 'en' ? current.faceEn : current.faceZh}</i>
          </div>
        </div>
        <div className="creator-controls">
          <p>CHOICE 03 · COSMETIC PRESET</p>
          <h2>{language === 'en' ? 'REORGANIZE THE FIRST LOOK' : '重新整理第一眼'}</h2>
          <div className="creator-rule"><span>{language === 'en' ? 'LOCKED' : '固定'}</span><b>{language === 'en' ? 'LIGHT SKIN · BLACK DRESS · BODY' : '浅肤色 · 黑色礼服 · 身体'}</b></div>
          <h3>{language === 'en' ? 'HAIR + FACIAL FEATURES' : '头发 + 面部特征'}</h3>
          <div className="avatar-options">
            {(Object.keys(avatarOptions) as AvatarKey[]).map((key, index) => {
              const option = avatarOptions[key];
              return (
                <button key={key} className={avatar === key ? 'selected' : ''} onClick={() => { ping(soundOn, 560 + index * 55); setAvatar(key); }} aria-pressed={avatar === key}>
                  <AvatarArt avatar={key} className="avatar-thumb" />
                  <span><b>{language === 'en' ? option.hairEn : option.hairZh}</b><small>{language === 'en' ? option.faceEn : option.faceZh}</small></span>
                </button>
              );
            })}
          </div>
          <p className="creator-note">{language === 'en' ? '“It still looks like me.” — “Exactly. Just easier to file.” Your selection stays with Lin throughout the game.' : '“看起来还是我。”——“对。只是更容易被归档。”确认后，该形象会贯穿整段游戏。'}</p>
          <Button className="confirm-avatar-button" onClick={onConfirm}>{language === 'en' ? 'SAVE MARKET-READY LOOK · +2 / +2' : '保存市场化形象 · +2 / +2'} <ChevronRight /></Button>
        </div>
      </div>
    </section>
  );
}

function ProfileScreen({ language, avatar, fame, pressure, onConfirm }: { language: Language; avatar: AvatarKey; fame: number; pressure: number; onConfirm: () => void }) {
  return (
    <section className="profile-screen stage-screen">
      <div className="screen-card profile-card">
        <div className="card-label">PLAYER PROFILE · 001</div>
        <div className="profile-layout">
          <div className="profile-portrait"><AvatarArt avatar={avatar} className="profile-natural" /></div>
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

function DialogueScene({ beat, language, avatar, index, total, background, choiceReady, choiceNotice, onAdvance, onChoice }: { beat: Beat; language: Language; avatar: AvatarKey; index: number; total: number; background?: string; choiceReady: boolean; choiceNotice: string; onAdvance: () => void; onChoice: (choice: Choice, set: ChoiceSet) => void }) {
  const sceneClass = beat.showProjects ? 'with-projects' : beat.showRoleCard ? 'with-role-card' : '';
  return (
    <section className={`dialogue-scene ${background ? 'has-background' : ''} ${sceneClass}`} style={background ? { backgroundImage: `url(${background})` } : undefined}>
      <div className="set-dressing"><span>{beat.tag || stageInfoFromBeat(beat)}</span><i>{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</i></div>
      {beat.left && <Sprite sprite={beat.left} avatar={avatar} position="left" />}
      {beat.center && <Sprite sprite={beat.center} avatar={avatar} position="center" />}
      {beat.right && <Sprite sprite={beat.right} avatar={avatar} position="right" />}
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
      <div className="choice-title"><span>{language === 'en' ? 'CAREER RESPONSE' : '职业回应'}</span><small>{language === 'en' ? 'Choose a response' : '选择回应'}</small></div>
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

function TrainingScreen({ language, avatar, done, setDone, soundOn, onContinue }: { language: Language; avatar: AvatarKey; done: string[]; setDone: (value: string[]) => void; soundOn: boolean; onContinue: () => void }) {
  const tokens = [
    { id: 'acting', label: 'SCENE STUDY', zh: '场景分析', result: 'FIGHT TEST READINESS: LOW', detailEn: 'ACTING +1 · fight-test readiness low', detailZh: 'ACTING +1 · 动作测试准备不足' },
    { id: 'martial', label: 'MARTIAL ARTS', zh: '武打训练', result: 'MARTIAL ARTS +1 · ACTING -1', detailEn: 'Preset route · one training slot', detailZh: '预设路线 · 唯一训练时段' },
    { id: 'recovery', label: 'RECOVERY', zh: '休息恢复', result: 'PROJECT READINESS: DOWN', detailEn: 'PRESSURE -1 · project readiness reduced', detailZh: 'PRESSURE -1 · 项目准备度下降' },
  ];
  const click = (id: string) => {
    if (id !== 'martial' || done.includes(id)) { ping(soundOn, 280); return; }
    ping(soundOn, 680); setDone([id]);
  };
  return (
    <section className="training-screen stage-screen">
      <div className="training-copy"><span>CHOICE 07 · SINGLE TRAINING SLOT</span><h2>{language === 'en' ? 'The fight test moved to Friday.' : '动作测试提前到了周五。'}</h2><p>{language === 'en' ? '“This film won’t delay because you understand the character better.” Training changes skills, not Fame or Pressure.' : '“这部电影不会因为你更理解角色而延期。”训练改变技能，不改变 Fame 或 Pressure。'}</p></div>
      <div className="training-tokens">
        {tokens.map((token, index) => <button key={token.id} onClick={() => click(token.id)} className={done.includes(token.id) ? 'done' : ''}><span>0{index + 1}</span><b>{language === 'en' ? token.label : token.zh}</b><small>{done.includes(token.id) ? token.result : language === 'en' ? token.detailEn : token.detailZh}</small>{token.id === 'martial' && <em>PRESET</em>}</button>)}
      </div>
      <Sprite sprite="linTraining" avatar={avatar} position="training-character" />
      <Button className="continue-button" disabled={!done.includes('martial')} onClick={onContinue}>{language === 'en' ? 'CONTINUE TO FILM RELEASE' : '进入电影上映'} <ChevronRight /></Button>
    </section>
  );
}

function EndingScreen({ language, avatar, fame, pressure, onRestart }: { language: Language; avatar: AvatarKey; fame: number; pressure: number; onRestart: () => void }) {
  return (
    <section className="ending-screen">
      <div className="ending-flash" />
      <Sprite sprite="linDragon" avatar={avatar} position="center ending-lin" />
      <Sprite sprite="maya" avatar={avatar} position="right ending-maya" />
      <div className="ending-echo">“Now everyone knows how to pitch you.”</div>
      <div className="ending-card">
        <span>SUCCESS REGISTERED</span><h2>NIGHT ORCHID</h2><p>LOOK PRESET: DRAGON LADY · NEXT CASTING NOTE: SAME ENERGY</p>
        <div><b>FAME {fame}</b><b>PRESSURE {pressure}</b></div>
        <div><b>ORIENTALIZATION 82%</b><b>CHOICE WIDTH 1/3</b></div>
        <blockquote>{language === 'en' ? 'She is seen. Her sentence is not finished.' : '她被看见了。她的话没有说完。'}</blockquote>
        <Button className="restart-button" onClick={onRestart}><RotateCcw /> {language === 'en' ? 'PLAY AGAIN' : '重新开始'}</Button>
      </div>
    </section>
  );
}

function Sprite({ sprite, avatar, position }: { sprite: SpriteKey; avatar: AvatarKey; position: string }) {
  const data = sprites[sprite];
  const useScenePose = avatar === 'original' && ['linGraduation', 'linDragon', 'linDragonBack', 'linTraining'].includes(sprite);
  if (sprite.startsWith('lin') && !useScenePose) return <AvatarArt avatar={avatar} className={`character-sprite ${position}`} />;
  return <img className={`character-sprite ${position}`} src={data.src} alt={data.name} />;
}

function AvatarArt({ avatar, className }: { avatar: AvatarKey; className: string }) {
  const option = avatarOptions[avatar];
  return <img className={className} src={option.src} alt={`Lin · ${option.hairEn} · ${option.faceEn}`} />;
}

function ProjectCards() {
  return <div className="project-cards"><article className="hot"><span>01 · WIDE RELEASE</span><b>NIGHT ORCHID</b><small>ANNA WU · DRAGON LADY · +2 / +1</small></article><article><span>02 · WIDE RELEASE</span><b>WHITE SEASON</b><small>LILY · WHITE LOTUS · +2 / +1</small></article><article className="hold"><span>03 · LIMITED</span><b>SMALL WEATHER</b><small>MEI · NO MARKET TAG · +0 / +0</small></article></div>;
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
