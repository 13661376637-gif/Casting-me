'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ChevronsRight,
  Clapperboard,
  Eye,
  Flower2,
  FolderOpen,
  MoveHorizontal,
  RotateCcw,
  ScanFace,
  Scissors,
  Shirt,
  Smile,
  Sword,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CharacterCanvas } from '@/components/character-canvas';
import { SUPPORTING_CAST, formatSpeakerLabel } from '@/lib/cast';
import { preloadActionDrawings } from '@/lib/avatar-drawing';
import { DEFAULT_FACE, adjustFace, applyFaceOption, lockAppearance } from '@/lib/avatar-model';
import type { AvatarHair as AvatarKey, AvatarLook as LookKey, FaceFeature as FeatureKey, FaceSelections, CharacterAppearance } from '@/lib/avatar-model';

type Screen = 'title' | 'creator' | 'prologue' | 'profile' | 'firstRead' | 'lookTest' | 'training' | 'callback' | 'locked' | 'filming' | 'redCarpet' | 'ending';
type SpriteKey = 'linNatural' | 'linDragon' | 'linDragonBack' | 'linTraining' | 'linPorcelain' | 'richard' | 'david' | 'claire' | 'maya';

type FaceOption = {
  id: string;
  en: string;
  noteEn: string;
  fame: number;
  pressure: number;
  coded?: boolean;
};

type Choice = { id: string; en: string; preset?: boolean };
type ChoiceSet = { id: string; items: Choice[]; fame: number; pressure: number; resultEn: string; };
type Beat = {
  speakerEn: string;
  en: string;
  left?: SpriteKey;
  right?: SpriteKey;
  center?: SpriteKey;
  choice?: ChoiceSet;
  flash?: boolean;
  showProjects?: boolean;
  showRoleCard?: boolean;
  tag?: string;
  actionPose?: 'crossed' | 'guard';
  filmSuccess?: boolean;
  graduationPortrait?: boolean;
};

// The user approved this complete supplied portrait for the pre-customization
// graduation through the rest of the prologue, before initial-look confirmation.
const GRADUATION_PORTRAIT_SRC = '/characters/lin-graduation-reference-v41.png';
const BACKGROUND_ASSETS = [
  '/backgrounds/university-campus.png',
  '/backgrounds/audition-room.png',
  '/backgrounds/night-apartment.png',
  '/backgrounds/western-restaurant.png',
  '/backgrounds/magazine-studio.png',
  '/backgrounds/agency-meeting-room.png',
  '/backgrounds/premiere-media-wall.png',
  '/backgrounds/snow-courtyard-set-v40.png',
] as const;
const PRELOAD_ASSETS = [...BACKGROUND_ASSETS, GRADUATION_PORTRAIT_SRC];

function useBackgroundPreload() {
  const [readyBackgrounds, setReadyBackgrounds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;
    const images = PRELOAD_ASSETS.map((src, index) => {
      const image = new Image();
      image.decoding = 'async';
      image.fetchPriority = index < 2 || src === GRADUATION_PORTRAIT_SRC ? 'high' : 'auto';

      const markReady = () => {
        if (cancelled) return;
        setReadyBackgrounds((current) => {
          if (current.has(src)) return current;
          const next = new Set(current);
          next.add(src);
          return next;
        });
      };

      image.onload = () => {
        if (typeof image.decode === 'function') image.decode().then(markReady, markReady);
        else markReady();
      };
      image.onerror = markReady;
      image.src = src;
      return image;
    });

    return () => {
      cancelled = true;
      images.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, []);

  return readyBackgrounds;
}

function useFullscreenUiScale(baseWidth: number, baseHeight: number) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (window.innerWidth <= 640) {
        setScale(1);
        return;
      }

      const edgeGap = 16;
      const topBarHeight = 72;
      // Keep full-screen cards inside the same 16:10 stage as the game, not
      // inside the browser's potentially wider or taller outer viewport.
      const stageWidth = Math.min(window.innerWidth, window.innerHeight * 1.6);
      const stageHeight = Math.min(window.innerHeight, window.innerWidth * .625);
      const availableWidth = Math.max(320, stageWidth - edgeGap * 2);
      const availableHeight = Math.max(320, stageHeight - topBarHeight - edgeGap * 2);
      setScale(Math.min(availableWidth / baseWidth, availableHeight / baseHeight));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [baseHeight, baseWidth]);

  return { '--ui-scale': scale } as CSSProperties;
}

const sprites: Record<SpriteKey, { src: string; name: string; frontCrop?: boolean }> = {
  linNatural: { src: '', name: 'Lin' },
  linDragon: { src: '', name: 'Lin — Night Orchid look' },
  linDragonBack: { src: '', name: 'Lin — Night Orchid look, rear pose' },
  linTraining: { src: '', name: 'Lin — Night Orchid fight training' },
  linPorcelain: { src: '', name: 'Lin — Porcelain Light look' },
  richard: { src: '/characters/richard.png', name: formatSpeakerLabel('RICHARD') },
  david: { src: '/characters/david.png', name: formatSpeakerLabel('DAVID') },
  claire: { src: '/characters/claire.png', name: formatSpeakerLabel('CLAIRE') },
  maya: { src: '/characters/maya.png', name: formatSpeakerLabel('MAYA') },
};

const avatarOptions: Record<AvatarKey, { hairEn: string; faceEn: string; }> = {
  original: { hairEn: 'LONG WAVES', faceEn: 'SOFT' },
  sleek: { hairEn: 'SLEEK', faceEn: 'SHARP' },
  bob: { hairEn: 'BOB', faceEn: 'GENTLE' },
  pony: { hairEn: 'PONYTAIL', faceEn: 'FOCUSED' },
};

const defaultFaceSelections = DEFAULT_FACE;

const faceFeatureOptions: Record<FeatureKey, { en: string; options: FaceOption[] }> = {
  eyes: {
    en: 'EYE SHAPE', options: [
      { id: 'natural', en: 'NATURAL ALMOND', noteEn: 'Keep Lin’s original eye line', fame: 0, pressure: 0 },
      { id: 'coded', en: 'TYPECAST · NARROW + UPTURNED', noteEn: 'Higher industry readability', fame: 2, pressure: 1, coded: true },
    ],
  },
  cheekbones: {
    en: 'CHEEKBONES', options: [
      { id: 'soft', en: 'SOFT CONTOUR', noteEn: 'Original facial structure', fame: 0, pressure: 0 },
      { id: 'high', en: 'TYPECAST · HIGH', noteEn: 'Sharper market silhouette', fame: 1, pressure: 1, coded: true },
    ],
  },
  nose: {
    en: 'NOSE FORM', options: [
      { id: 'defined', en: 'DEFINED BRIDGE', noteEn: 'Keep the original bridge', fame: 0, pressure: 0 },
      { id: 'rounded', en: 'TYPECAST · LOW + ROUNDED', noteEn: 'Matches the casting shorthand', fame: 1, pressure: 1, coded: true },
    ],
  },
  skin: {
    en: 'SKIN TONE', options: [
      { id: 'original', en: 'ORIGINAL TONE', noteEn: 'No color grading', fame: 0, pressure: 0 },
      { id: 'porcelain', en: 'TYPECAST · PORCELAIN', noteEn: 'Pale studio grading', fame: 2, pressure: 2, coded: true },
      { id: 'deep', en: 'TYPECAST · MUTED WARM', noteEn: 'Warm muted grading from image 130', fame: 1, pressure: 2, coded: true },
    ],
  },
  jaw: {
    en: 'FACE SHAPE', options: [
      { id: 'oval', en: 'ORIGINAL OVAL', noteEn: 'Keep the softer jaw', fame: 0, pressure: 0 },
      { id: 'long-square', en: 'TYPECAST · LONG + SQUARE', noteEn: 'Avoids the rounded profile note', fame: 1, pressure: 1, coded: true },
    ],
  },
};

const lookOptions: Record<LookKey, { en: string; hairEn: string; outfitEn: string; fame: number; pressure: number }> = {
  natural: { en: 'ORIGINAL', hairEn: 'LONG WAVES', outfitEn: 'BLACK EVENING DRESS', fame: 0, pressure: 0 },
  editorial: { en: 'EDITORIAL', hairEn: 'CHIN-LENGTH BOB', outfitEn: 'BURGUNDY SUIT', fame: 1, pressure: 1 },
  premiere: { en: 'PREMIERE', hairEn: 'HIGH PONYTAIL', outfitEn: 'ASYMMETRIC GOWN', fame: 2, pressure: 1 },
  qipao: { en: 'NIGHT ORCHID', hairEn: 'SCULPTED WAVES', outfitEn: 'BLACK QIPAO · RED TRIM', fame: 4, pressure: 3 },
};

const choice01: ChoiceSet = {
  id: 'choice-01', fame: -1, pressure: 2, resultEn: 'AUDITION RESULT: NOT ALIGNED · FAME -1 · PRESSURE +2', items: [
    { id: 'a', en: 'Remove the hesitation and play her as certain.' },
    { id: 'b', en: 'She is not a pitch. She is a person.', preset: true },
    { id: 'c', en: 'Ask for another read and keep one final second of doubt.' },
  ],
};

const choice02: ChoiceSet = {
  id: 'choice-02', fame: 2, pressure: 2, resultEn: 'AGENT SIGNED: CLAIRE BENNETT · FAME +2 · PRESSURE +2', items: [
    { id: 'a', en: 'Choose David: move slower and protect role width.' },
    { id: 'b', en: 'Choose Claire: enter mainstream projects faster.', preset: true },
  ],
};

const choice04: ChoiceSet = {
  id: 'choice-04', fame: 0, pressure: 1, resultEn: 'DIRECTOR FAVOR +1 · PRESSURE +1', items: [
    { id: 'a', en: 'Order seasonal noodles and hot tea as usual.' },
    { id: 'b', en: 'Match Richard: steak, arugula salad, and pinot noir.', preset: true },
    { id: 'c', en: 'Choose the same entrée, but replace the wine with sparkling water.' },
  ],
};

const choice05: ChoiceSet = {
  id: 'choice-05', fame: 3, pressure: 2, resultEn: 'COVER RESPONSE ×2.4 · MOVIE OFFER UNLOCKED', items: [
    { id: 'a', en: 'Keep the modern Chinese look and change only the expression.' },
    { id: 'b', en: 'Request a third look without a cultural tag.' },
    { id: 'c', en: 'Accept the high-recognition red-and-black look.', preset: true },
  ],
};

const choice06: ChoiceSet = {
  id: 'choice-06', fame: 2, pressure: 1, resultEn: 'SCRIPT LOCKED: NIGHT ORCHID · DRAGON LADY', items: [
    { id: 'a', en: 'Night Orchid: Dragon Lady commercial action film.', preset: true },
    { id: 'b', en: 'White Season: White Lotus commercial romance.' },
    { id: 'c', en: 'Small Weather: original independent drama.' },
  ],
};

const prologue: Beat[] = [
  { speakerEn: 'ACTING SCHOOL', en: 'She spent four years learning how to understand different people.', center: 'linNatural', tag: 'PANEL 01 / ACTING SCHOOL' },
  { speakerEn: 'GRADUATION', en: 'She believed the work would eventually speak for itself.', graduationPortrait: true, tag: 'PANEL 02 / CLASS OF 2026' },
  { speakerEn: 'HOLLYWOOD', en: 'New roles are created here every day—and familiar faces are searched for again and again.', center: 'linNatural', tag: 'PANEL 03 / LOS ANGELES' },
  { speakerEn: 'FIRST CALL', en: 'She thought the first step into the industry was proving she could play a complete person.', center: 'linNatural', tag: '“I WANT TO PLAY A PERSON, NOT A CATEGORY.”' },
];

const firstRead: Beat[] = [
  { speakerEn: 'RICHARD', en: "Page three. Don't give me her past yet. Give me the first impression.", left: 'linNatural', right: 'richard' },
  { speakerEn: 'LIN', en: 'Her mentor betrayed her. She is angry, but part of her still doubts herself.', left: 'linNatural', right: 'richard' },
  { speakerEn: 'RICHARD', en: 'Doubt slows the read. I need calm, dangerous, no explanation.', left: 'linNatural', right: 'richard' },
  { speakerEn: 'LIN', en: 'Then why do you need the scene?', left: 'linNatural', right: 'richard' },
  { speakerEn: 'RICHARD', en: 'Because the audience decides what she is before they know her.', left: 'linNatural', right: 'richard' },
  { speakerEn: 'CHOICE 01', en: 'Respond to the direction.', left: 'linNatural', right: 'richard', choice: choice01 },
  { speakerEn: 'LIN', en: 'If I remove the contradiction, she becomes a pose.', left: 'linNatural', right: 'richard' },
  { speakerEn: 'RICHARD', en: "Understood. Then we're not looking for the same kind of collaboration.", left: 'linNatural', right: 'richard' },
  { speakerEn: 'REJECTION 01', en: '“Strong work, unclear positioning.”', center: 'linNatural', tag: 'REJECTION STACK · RENT DUE' },
  { speakerEn: 'REJECTION 02', en: '“Missing an instantly recognizable edge.”', center: 'linNatural', tag: 'REJECTION STACK · RENT DUE' },
  { speakerEn: 'REJECTION 03', en: '“Moving forward with an actor closer to the project’s direction.”', center: 'linNatural', tag: 'REJECTION STACK · RENT DUE' },
  { speakerEn: 'LIN', en: 'Every message says the work was good.', center: 'linNatural', tag: 'FAME -1 · PRESSURE 2' },
  { speakerEn: 'LIN · AFTER A PAUSE', en: 'None of them needs me.', center: 'linNatural', tag: 'CHOICE WIDTH · HIDDEN' },
];

const lookTest: Beat[] = [
  { speakerEn: 'DAVID', en: "I reviewed your training. You don't lack ability. You lack a room willing to see it slowly.", left: 'linNatural', right: 'david', tag: 'AGENT PROFILE · DAVID CHEN' },
  { speakerEn: 'LIN', en: 'Can you find that room?', left: 'linNatural', right: 'david' },
  { speakerEn: 'DAVID', en: 'Yes, but not quickly. I would protect your role range first, then build the opportunities.', left: 'linNatural', right: 'david', tag: 'CULTURAL UNDERSTANDING: HIGH · MARKET SPEED: STEADY' },
  { speakerEn: 'CLAIRE', en: "You don't have an acting problem. You have a recognition problem.", left: 'linNatural', right: 'claire', tag: 'AGENT PROFILE · CLAIRE BENNETT' },
  { speakerEn: 'LIN', en: 'How would you solve it?', left: 'linNatural', right: 'claire' },
  { speakerEn: 'CLAIRE', en: 'Shorten the time it takes to understand you. Three seconds can decide a photo; ten can decide a meeting.', left: 'linNatural', right: 'claire', tag: 'MARKET ACCESS: STRONG · REVISION RATE: HIGH' },
  { speakerEn: 'LIN', en: 'And after the three seconds?', left: 'linNatural', right: 'claire' },
  { speakerEn: 'CLAIRE', en: 'First make them stay. Then we can discuss what comes after.', left: 'linNatural', right: 'claire' },
  { speakerEn: 'CHOICE 02', en: 'Sign with an agent.', left: 'linNatural', right: 'claire', choice: choice02 },
  { speakerEn: 'LIN', en: "I've been moving slowly long enough.", left: 'linNatural', right: 'claire' },
  { speakerEn: 'CLAIRE', en: 'Good. Tomorrow we reorganize what people see first.', left: 'linNatural', right: 'claire' },
];

const callback: Beat[] = [
  { speakerEn: 'CLAIRE · BEFORE DINNER', en: "Tonight isn't an audition. Let him feel that you can stay in the same room for a long time.", left: 'linNatural', right: 'claire', tag: 'CHAPTER 2 · DINNER' },
  { speakerEn: 'LIN', en: 'That still sounds like an audition.', left: 'linNatural', right: 'claire' },
  { speakerEn: 'CLAIRE', en: 'A lot of auditions in this industry have no lines.', left: 'linNatural', right: 'claire' },
  { speakerEn: 'RICHARD', en: "Claire says you're adapting quickly.", left: 'linNatural', right: 'richard' },
  { speakerEn: 'LIN', en: 'I used to think adapting to the role was enough.', left: 'linNatural', right: 'richard' },
  { speakerEn: 'RICHARD', en: 'Projects are long. People also notice whether you make the work easy.', left: 'linNatural', right: 'richard' },
  { speakerEn: 'SERVER', en: 'May I take your order?', left: 'linNatural', right: 'richard' },
  { speakerEn: 'CHOICE 04', en: 'Choose the order and social rhythm.', left: 'linNatural', right: 'richard', choice: choice04 },
  { speakerEn: 'LIN', en: "I'll have what Richard is having. Medium rare.", left: 'linNatural', right: 'richard' },
  { speakerEn: 'RICHARD', en: "Good. You're learning faster than last time.", left: 'linNatural', right: 'richard' },
  { speakerEn: 'LIN', en: 'Do you mean the acting?', left: 'linNatural', right: 'richard' },
  { speakerEn: 'RICHARD', en: 'I mean collaboration.', left: 'linNatural', right: 'richard', tag: 'DIRECTOR FAVOR +1' },
  { speakerEn: 'RICHARD', en: 'A magazine needs a new face next week. Claire will send the details.', left: 'linNatural', right: 'richard' },
  { speakerEn: 'LIN', en: 'Because of tonight?', left: 'linNatural', right: 'richard' },
  { speakerEn: 'RICHARD', en: "Because you made me believe tomorrow won't be harder.", left: 'linNatural', right: 'richard' },
  { speakerEn: 'MAYA', en: 'First cover?', left: 'linNatural', right: 'maya', tag: 'CHAPTER 3 · REFRAME' },
  { speakerEn: 'LIN', en: 'First time someone asked me here by name.', left: 'linNatural', right: 'maya' },
  { speakerEn: 'MAYA', en: 'Then remember what you looked like when you walked in.', left: 'linNatural', right: 'maya' },
  { speakerEn: 'LIN', en: 'Why?', left: 'linNatural', right: 'maya' },
  { speakerEn: 'MAYA', en: 'You usually look different when you leave.', left: 'linNatural', right: 'maya' },
  { speakerEn: 'RICHARD', en: "It's elegant, and it's safe. We need something sexier.", left: 'linNatural', right: 'richard', tag: 'ELEGANT · CREDIBLE · LOW IMMEDIATE HEAT' },
  { speakerEn: 'LIN', en: 'The interview is about my work.', left: 'linNatural', right: 'richard' },
  { speakerEn: 'CLAIRE', en: 'The cover decides whether they ever reach the interview.', left: 'linNatural', right: 'claire' },
  { speakerEn: 'LIN', en: 'What do you want to replace?', left: 'linNatural', right: 'richard' },
  { speakerEn: 'RICHARD', en: "Don't replace the culture. Turn it into a promise.", left: 'linNatural', right: 'richard' },
  { speakerEn: 'CHOICE 05', en: 'Respond to the magazine reframe.', left: 'linNatural', right: 'richard', choice: choice05 },
  { speakerEn: 'RICHARD', en: 'Yes. Now the cover knows what to promise.', left: 'linDragon', right: 'richard', tag: 'PROJECTED ENGAGEMENT ×2.4' },
  { speakerEn: 'CLAIRE', en: "Hold this state. Don't remove it before the next set.", left: 'linDragon', right: 'claire' },
  { speakerEn: 'MAYA', en: 'The first time, they ask if you can do it.', left: 'linDragon', right: 'maya' },
  { speakerEn: 'MAYA', en: 'Later, the look is ready before you arrive.', left: 'linDragon', right: 'maya' },
  { speakerEn: 'LIN', en: 'Did it work for you?', left: 'linDragon', right: 'maya' },
  { speakerEn: 'MAYA', en: "I'm still working.", left: 'linDragon', right: 'maya' },
  { speakerEn: 'LIN', en: "That wasn't my question.", left: 'linDragon', right: 'maya' },
  { speakerEn: 'MAYA', en: 'I know.', left: 'linDragonBack', right: 'maya', tag: 'NEW MESSAGE · THREE SCRIPTS AWAIT SELECTION' },
];

const locked: Beat[] = [
  { speakerEn: 'CLAIRE', en: 'The magazine has been live for six hours. We now have three formal offers.', left: 'linDragon', right: 'claire', showProjects: true },
  { speakerEn: 'LIN', en: 'That quickly?', left: 'linDragon', right: 'claire', showProjects: true },
  { speakerEn: 'CLAIRE', en: "They didn't suddenly discover you can act. They finally know where to place you.", left: 'linDragon', right: 'claire', showProjects: true },
  { speakerEn: 'LIN', en: 'The third role is the most complete.', left: 'linDragon', right: 'claire', showProjects: true },
  { speakerEn: 'CLAIRE', en: "It's also the only project without a global distribution commitment.", left: 'linDragon', right: 'claire', showProjects: true },
  { speakerEn: 'LIN', en: "Then these aren't the same kind of opportunity.", left: 'linDragon', right: 'claire', showProjects: true },
  { speakerEn: 'CLAIRE', en: "They're all jobs. Some jobs simply change the size of the next one.", left: 'linDragon', right: 'claire', showProjects: true },
  { speakerEn: 'CHOICE 06', en: 'Choose a film script.', left: 'linDragon', right: 'claire', choice: choice06, showProjects: true },
  { speakerEn: 'LIN', en: 'Night Orchid.', left: 'linDragon', right: 'claire', showProjects: true },
  { speakerEn: 'CLAIRE', en: "Good. Keep the red-and-black look; they've already placed the magazine image in the pitch.", left: 'linDragon', right: 'claire', showProjects: true },
  { speakerEn: 'LIN', en: "They haven't seen my audition.", left: 'linDragon', right: 'claire', showProjects: true },
  { speakerEn: 'CLAIRE', en: "They've seen the market response.", left: 'linDragon', right: 'claire', showProjects: true, tag: 'SCRIPT LOCKED · NIGHT ORCHID' },
];

const filming: Beat[] = [
  { speakerEn: 'DIRECTOR', en: 'Night Orchid. Snow courtyard, take one. Hold the crossed guard… action!', actionPose:'crossed', tag:'NIGHT ORCHID · ON SET / TAKE 01' },
  { speakerEn: 'ACTION DIRECTOR', en: 'Open the guard. Settle your weight, keep the blade steady. Let the camera see the decision.', actionPose:'guard', tag:'NIGHT ORCHID · ON SET / TAKE 02' },
  { speakerEn: 'DIRECTOR', en: 'Cut. We have it. That is our final shot.', actionPose:'guard', tag:'NIGHT ORCHID · PICTURE WRAPPED' },
  { speakerEn: 'OPENING WEEKEND', en: 'Night Orchid is a hit. Opening weekend doubles the forecast; sequel talks begin. Lin’s performance is now seen around the world.', actionPose:'crossed', filmSuccess:true, tag:'FILM SUCCESS · FAME +5' },
];

const redCarpet: Beat[] = [
  { speakerEn: 'CLAIRE', en: 'Opening weekend doubled the forecast. A sequel and two brand offers are already in discussion.', center: 'linDragon', right: 'claire' },
  { speakerEn: 'LIN', en: 'Did any review mention Anna?', center: 'linDragon', right: 'claire' },
  { speakerEn: 'CLAIRE', en: 'They mentioned you.', center: 'linDragon', right: 'claire' },
  { speakerEn: 'RICHARD · VOICE MESSAGE', en: 'Now everyone knows how to pitch you.', center: 'linDragon', right: 'richard', tag: 'FILM SUCCESS · FAME +5 · NEXT OFFERS 4' },
  { speakerEn: 'REPORTER 1', en: 'Lin, over here! Give us the Night Orchid eyes!', center: 'linDragon', right: 'maya', flash: true },
  { speakerEn: 'REPORTER 2', en: 'Chin a little higher—yes, the magazine-cover one!', center: 'linDragon', right: 'maya', flash: true },
  { speakerEn: 'REPORTER 3', en: 'Is the next one another international action film?', center: 'linDragon', right: 'maya', flash: true },
  { speakerEn: 'REPORTER 1', en: 'What kind of woman do you most want to play?', center: 'linDragon', right: 'maya', flash: true },
  { speakerEn: 'LIN', en: 'I want to play someone who—', center: 'linDragon', right: 'maya' },
  { speakerEn: 'REPORTER 2', en: "Don't move! Hold that!", center: 'linDragon', right: 'maya', flash: true },
];

const sequences: Partial<Record<Screen, Beat[]>> = { prologue, firstRead, lookTest, callback, locked, filming, redCarpet };
const screenNext: Partial<Record<Screen, Screen>> = { prologue: 'profile', firstRead: 'lookTest', lookTest: 'creator', callback: 'locked', locked: 'training', filming:'redCarpet', redCarpet: 'ending' };

function getSceneBackground(screen: Screen, beatIndex: number) {
  if (screen === 'prologue') return beatIndex < 3 ? '/backgrounds/university-campus.png' : '/backgrounds/audition-room.png';
  if (screen === 'firstRead') return beatIndex < 8 ? '/backgrounds/audition-room.png' : '/backgrounds/night-apartment.png';
  if (screen === 'lookTest') return '/backgrounds/night-apartment.png';
  if (screen === 'callback') return beatIndex < 15 ? '/backgrounds/western-restaurant.png' : '/backgrounds/magazine-studio.png';
  if (screen === 'locked') return '/backgrounds/agency-meeting-room.png';
  if (screen === 'filming') return '/backgrounds/snow-courtyard-set-v40.png';
  if (screen === 'redCarpet') return '/backgrounds/premiere-media-wall.png';
  return undefined;
}

const stageInfo: Record<Screen, { index: string; label: string }> = {
  title: { index: '00', label: 'CASTING ME' }, creator: { index: '02B', label: 'FACE EDITOR' }, prologue: { index: '00', label: 'PROLOGUE' }, profile: { index: '00', label: 'PROFILE SETUP' },
  firstRead: { index: '01', label: 'DOWNFALL' }, lookTest: { index: '02A', label: 'CHOOSE AN AGENT' }, training: { index: '04B', label: 'TRAINING TRADE-OFF' },
  filming: { index:'04C', label:'NIGHT ORCHID / ON SET' },
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
  const [fame, setFame] = useState(0);
  const [pressure, setPressure] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [choiceReady, setChoiceReady] = useState(false);
  const [choiceNotice, setChoiceNotice] = useState('');
  const [resolved, setResolved] = useState<string[]>([]);
  const [trainingDone, setTrainingDone] = useState<string[]>([]);
  const [hudPulse, setHudPulse] = useState(false);
  const [appearance, setAppearance] = useState<CharacterAppearance | null>(null);
  const filmRewarded = useRef(false);
  const readyBackgrounds = useBackgroundPreload();
  const avatar: AvatarKey = appearance?.hair ?? 'original';
  const lockedLook = appearance?.look ?? null;
  const lockedFace = appearance?.face ?? null;

  const beats = sequences[screen];
  const sourceBeat = beats?.[beatIndex];
  const beat = sourceBeat ? {...sourceBeat} : undefined;
  if(beat && screen==='prologue' && beatIndex>=1){
    beat.center=undefined;
    beat.graduationPortrait=true;
  }
  const sceneBackground = getSceneBackground(screen, beatIndex);
  const activeBackground = sceneBackground
    ?? (screen === 'profile' ? '/backgrounds/university-campus.png' : undefined)
    ?? (screen === 'ending' ? '/backgrounds/premiere-media-wall.png' : undefined);
  const backgroundReady = (!activeBackground || readyBackgrounds.has(activeBackground))
    && (!beat?.graduationPortrait || readyBackgrounds.has(GRADUATION_PORTRAIT_SRC));
  useEffect(()=>{
    if(screen==='locked'||screen==='training')void preloadActionDrawings().catch(()=>{});
  },[screen]);

  useEffect(() => {
    if (screen !== 'filming' || !beat?.filmSuccess || filmRewarded.current) return;
    filmRewarded.current = true;
    setFame(value => value + 5);
    setResolved(value => [...value, 'film-success']);
    setHudPulse(true);
    const timer = window.setTimeout(() => setHudPulse(false), 650);
    return () => window.clearTimeout(timer);
  }, [screen, beat?.filmSuccess]);

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
    const order: Screen[] = ['prologue', 'profile', 'firstRead', 'lookTest', 'creator', 'callback', 'locked', 'training', 'filming', 'redCarpet', 'ending'];
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
      setChoiceNotice('This two-minute demo follows the preset route.');
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
    setChoiceNotice(set.resultEn);
    window.setTimeout(() => {
      if (beats && beatIndex < beats.length - 1) setBeatIndex((value) => value + 1);
      else if (screenNext[screen]) moveTo(screenNext[screen]!);
    }, 480);
  };

  const restart = () => {
    filmRewarded.current = false;
    setScreen('title'); setBeatIndex(0); setFame(0); setPressure(0); setResolved([]); setTrainingDone([]); setChoiceNotice(''); setAppearance(null);
    try { window.localStorage.removeItem('casting-me-character-v18'); } catch { /* The fresh in-session state is already reset. */ }
  };

  const confirmAvatar = (faceFame: number, facePressure: number, look: LookKey, face: FaceSelections) => {
    const character = lockAppearance(look, face);
    setAppearance(character);
    try {
      window.localStorage.setItem('casting-me-character-v18', JSON.stringify(character));
    } catch { /* Keep the in-session selection. */ }
    if (!resolved.includes('face-custom-v14')) {
      const lookScore = lookOptions[look];
      setFame((value) => value + faceFame + lookScore.fame);
      setPressure((value) => value + facePressure + lookScore.pressure);
      setResolved((value) => [...value, 'face-custom-v14']);
      setHudPulse(true);
      window.setTimeout(() => setHudPulse(false), 650);
    }
    moveTo('callback');
  };

  const completeTraining = () => {
    moveTo('filming');
  };

  return (
    <main className={`vn-app scene-${screen}`}>
      <GameTopbar screen={screen} progress={progress} fame={fame} pressure={pressure} soundOn={soundOn} setSoundOn={setSoundOn} hudPulse={hudPulse} />

      {screen === 'title' && <TitleScreen avatar={avatar} onStart={() => moveTo('prologue')} />}
      {screen === 'creator' && <AvatarCreator soundOn={soundOn} onConfirm={confirmAvatar} />}
      {screen === 'profile' && <ProfileScreen avatar={avatar} fame={fame} pressure={pressure} backgroundReady={backgroundReady} onConfirm={() => moveTo('firstRead')} />}
      {screen === 'training' && <TrainingScreen avatar={avatar} lockedLook={lockedLook} lockedFace={lockedFace} done={trainingDone} setDone={setTrainingDone} soundOn={soundOn} onContinue={completeTraining} />}
      {screen === 'ending' && <EndingScreen avatar={avatar} lockedLook={lockedLook} lockedFace={lockedFace} fame={fame} pressure={pressure} backgroundReady={backgroundReady} onRestart={restart} />}
      {beat && <DialogueScene beat={beat} avatar={avatar} lockedLook={lockedLook} lockedFace={lockedFace} index={beatIndex} total={beats?.length ?? 1} background={sceneBackground} backgroundReady={backgroundReady} choiceReady={choiceReady} choiceNotice={choiceNotice} onAdvance={advance} onChoice={selectChoice} />}
    </main>
  );
}

function GameTopbar({ screen, progress, fame, pressure, soundOn, setSoundOn, hudPulse }: { screen: Screen; progress: number; fame: number; pressure: number; soundOn: boolean; setSoundOn: (value: boolean) => void; hudPulse: boolean }) {
  return (
    <header className="vn-topbar">
      <button className="folder-button" aria-label="Open player folder"><FolderOpen /><span>LIN_001</span></button>
      <div className="chapter-status"><span>{stageInfo[screen].index}</span><b>{stageInfo[screen].label}</b><i><em style={{ width: `${progress}%` }} /></i></div>
      {screen !== 'title' && <div className={`hud ${hudPulse ? 'pulse' : ''}`}><span>FAME <b>{fame}</b></span><span>PRESSURE <b>{pressure}</b></span></div>}
      <div className="top-actions">
        <button onClick={() => { if (!soundOn) ping(true, 700); setSoundOn(!soundOn); }} aria-label={soundOn ? 'Mute sound' : 'Enable sound'}>{soundOn ? <Volume2 /> : <VolumeX />}</button>
        <ChevronsRight className="skip-icon" aria-hidden="true" />
      </div>
    </header>
  );
}

function TitleScreen({ avatar, onStart }: { avatar: AvatarKey; onStart: () => void }) {
  return (
    <section className="title-screen">
      <div className="title-rays" aria-hidden="true" />
      <CharacterCanvas hair={avatar} look="natural" className="title-protagonist" label={'Lin, the protagonist'} />
      <div className="title-copy">
        <p>2D SPRITE DIALOGUE · LIGHT CAREER SIM</p>
        <h1>CASTING<br /><span>ME</span></h1>
        <div className="title-premise">{'Hollywood rewards a recognizable type before it makes room for a complete person.'}</div>
        <Button className="play-button" size="lg" onClick={onStart}>{'START AUDITION'} <ChevronRight /></Button>
        <small>{'Approx. 2 minutes · single-path prototype'}</small>
      </div>
    </section>
  );
}


function AvatarCreator({ soundOn, onConfirm }: { soundOn: boolean; onConfirm: (fame: number, pressure: number, look: LookKey, face: FaceSelections) => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [activeTool, setActiveTool] = useState<FeatureKey>('eyes');
  const [visitedTools, setVisitedTools] = useState<FeatureKey[]>([]);
  const [selections, setSelections] = useState<FaceSelections>(defaultFaceSelections);
  const [selectedLook, setSelectedLook] = useState<LookKey | null>(null);
  const toolRows: { id: FeatureKey; Icon: typeof Eye }[] = [
    { id: 'eyes', Icon: Eye },
    { id: 'cheekbones', Icon: Smile },
    { id: 'nose', Icon: MoveHorizontal },
    { id: 'skin', Icon: Flower2 },
    { id: 'jaw', Icon: ScanFace },
  ];
  const faceKeys = Object.keys(faceFeatureOptions) as FeatureKey[];
  const faceScore = faceKeys.reduce((score, key) => {
    const selected = faceFeatureOptions[key].options.find((option) => option.id === selections[key])!;
    return { fame: score.fame + selected.fame, pressure: score.pressure + selected.pressure };
  }, { fame: 0, pressure: 0 });
  const currentFeature = faceFeatureOptions[activeTool];
  const currentLook = lookOptions[selectedLook ?? 'natural'];
  const totalFame = faceScore.fame + (selectedLook ? currentLook.fame : 0);
  const totalPressure = faceScore.pressure + (selectedLook ? currentLook.pressure : 0);
  const faceReady = visitedTools.length === toolRows.length;

  const activateTool = (id: FeatureKey, index: number) => {
    ping(soundOn, 480 + index * 42);
    setActiveTool(id);
  };
  const selectFaceOption = (option: FaceOption) => {
    ping(soundOn, 620);
    setSelections((current) => applyFaceOption(current, activeTool, option.id));
    setVisitedTools((current) => current.includes(activeTool) ? current : [...current, activeTool]);
  };
  const adjustWithTool = (feature: FeatureKey, value: number) => {
    setSelections(current => adjustFace(current, feature, value));
    setVisitedTools(current => current.includes(feature) ? current : [...current, feature]);
  };
  const chooseLook = (look: LookKey) => {
    ping(soundOn, 690);
    setSelectedLook(look);
  };

  return (
    <section className="creator-screen stage-screen">
      <div className={`creator-card creator-step-${step}`}>
        <div className="creator-preview">
          <span>{step === 1 ? 'PLAYER MODEL · INTERACTIVE FACE TOOLS' : 'PLAYER MODEL · LOOK PREVIEW'}</span>
          {step === 1 ? (
            <div className="face-closeup">
              <CharacterCanvas portrait face={selections} activeTool={activeTool} onAdjust={adjustWithTool} label={`${currentFeature.en} · Drag left or right, or use arrow keys`} />
              <i className="face-guide face-guide-eyes" aria-hidden="true" />
              <i className="face-guide face-guide-nose" aria-hidden="true" />
              <i className="face-guide face-guide-mouth" aria-hidden="true" />
              <div className="face-tool-hotspots" aria-label={'Face editing tools'}>
                {toolRows.map(({ id, Icon }, index) => {
                  const feature = faceFeatureOptions[id];
                  const visited = visitedTools.includes(id);
                  return <button key={id} className={`face-hotspot hotspot-${id} ${activeTool === id ? 'active' : ''} ${visited ? 'visited' : ''}`} onClick={() => activateTool(id, index)} aria-pressed={activeTool === id}><Icon /><b>{feature.en}</b>{visited && <Check />}</button>;
                })}
              </div>
            </div>
          ) : <CharacterCanvas look={selectedLook ?? 'natural'} face={selections} className="creator-look" />}
          <div className="creator-readout">
            <b>{step === 1 ? (currentFeature.en) : (currentLook.en)}</b>
            <i>FAME +{totalFame} · PRESSURE +{totalPressure}</i>
          </div>
        </div>
        <div className="creator-controls">
          <p>CHOICE 03 · CASTING LAB · STEP {step} / 2</p>
          <h2>{step === 1 ? ('EDIT THE FACE') : ('CHOOSE THE LOOK')}</h2>
          <div className="creator-rule bias-rule"><span>{'SYSTEM BIAS'}</span><b>{'TYPECASTING RAISES VISIBILITY — AND PRESSURE'}</b></div>
          {step === 1 ? (
            <>
              <div className="face-tool-tabs">
                {toolRows.map(({ id, Icon }, index) => {
                  const feature = faceFeatureOptions[id];
                  return <button key={id} className={`${activeTool === id ? 'active' : ''} ${visitedTools.includes(id) ? 'visited' : ''}`} onClick={() => activateTool(id, index)}><Icon /><span>{feature.en}</span>{visitedTools.includes(id) && <Check />}</button>;
                })}
              </div>
              <div className="feature-panel">
                <div className="feature-panel-title"><b>{currentFeature.en}</b><span>{'APPLY WITH TOOL'}</span></div>
                <div className={`feature-options feature-options-${currentFeature.options.length}`}>
                  {currentFeature.options.map((option) => {
                    const selected = selections[activeTool] === option.id;
                    return (
                      <button key={option.id} className={selected ? 'selected' : ''} onClick={() => selectFaceOption(option)} aria-pressed={selected}>
                        <span>{option.coded ? ('CASTING NOTE') : ('ORIGINAL')}</span>
                        <b>{option.en}</b>
                        <small>{option.noteEn}</small>
                        <i>FAME +{option.fame} · PRESSURE +{option.pressure}</i>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="creator-score"><span>{'FACE SCORE'}</span><b>FAME +{faceScore.fame}</b><b>PRESSURE +{faceScore.pressure}</b><i>{visitedTools.length} / {toolRows.length} TOOLS</i></div>
              <p className="creator-note">{'The active instrument is shown on the face board. Move the cursor onto the face, press and drag left / right to adjust, or choose a preset. These are casting-system labels, not beauty standards.'}</p>
              <Button className="confirm-avatar-button" disabled={!faceReady} onClick={() => { ping(soundOn, 620); setStep(2); }}>{'NEXT · HAIR & WARDROBE'} <ChevronRight /></Button>
            </>
          ) : (
            <>
              <button className="creator-back" onClick={() => setStep(1)}><ArrowLeft /> {'FACE TOOLS'}</button>
              <div className="look-grid">
                {(Object.keys(lookOptions) as LookKey[]).map((key) => {
                  const look = lookOptions[key];
                  const selected = selectedLook === key;
                  return (
                    <button key={key} className={`look-card ${selected ? 'selected' : ''}`} onClick={() => chooseLook(key)} aria-pressed={selected}>
                      <span className="look-card-art"><CharacterCanvas look={key} face={selections} className="look-card-model" decorative /></span>
                      <span className="look-card-copy"><b>{look.en}</b><small><Scissors /> {look.hairEn}</small><small><Shirt /> {look.outfitEn}</small><i>FAME +{look.fame} · PRESSURE +{look.pressure}</i></span>
                      {selected && <Check className="look-check" />}
                    </button>
                  );
                })}
              </div>
              <div className="creator-score total"><span>{'TOTAL CHANGE'}</span><b>FAME +{totalFame}</b><b>PRESSURE +{totalPressure}</b></div>
              <p className="creator-note">{'The qipao has the strongest visibility boost and the highest pressure cost. Your chosen face, hair and wardrobe remain locked through the ending.'}</p>
              <Button className="confirm-avatar-button" disabled={!selectedLook} onClick={() => selectedLook && onConfirm(faceScore.fame, faceScore.pressure, selectedLook, selections)}>{`SAVE LOOK · +${totalFame} / +${totalPressure}`} <ChevronRight /></Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function ProfileScreen({ avatar, fame, pressure, backgroundReady, onConfirm }: { avatar: AvatarKey; fame: number; pressure: number; backgroundReady: boolean; onConfirm: () => void }) {
  const fullscreenCardStyle = useFullscreenUiScale(1020, 690);

  return (
    <section className="profile-screen stage-screen">
      <div className="screen-card profile-card fullscreen-ui-card" style={fullscreenCardStyle}>
        <div className="card-label">PLAYER PROFILE · 001</div>
        <div className="profile-layout">
          <div className="profile-portrait">{backgroundReady && <AvatarArt avatar={avatar} className="profile-natural" />}</div>
          <div className="profile-data">
            <p>LIN</p><h2>ACTOR</h2>
            <dl><div><dt>LOOK</dt><dd>NATURAL</dd></div><div><dt>TRAINING</dt><dd>FORMAL ACTING</dd></div><div><dt>STATUS</dt><dd>UNCAST</dd></div><div><dt>FAME / PRESSURE</dt><dd>{fame} / {pressure}</dd></div></dl>
            <blockquote>{'“I want to play a person, not a category.”'}</blockquote>
            <Button className="confirm-button" onClick={onConfirm}>{'CONFIRM INITIAL LOOK'} <ChevronRight /></Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function DialogueScene({ beat, avatar, lockedLook, lockedFace, index, total, background, backgroundReady, choiceReady, choiceNotice, onAdvance, onChoice }: { beat: Beat; avatar: AvatarKey; lockedLook: LookKey | null; lockedFace: FaceSelections | null; index: number; total: number; background?: string; backgroundReady: boolean; choiceReady: boolean; choiceNotice: string; onAdvance: () => void; onChoice: (choice: Choice, set: ChoiceSet) => void }) {
  const [actionReady,setActionReady]=useState(false);
  const [actionFailed,setActionFailed]=useState(false);
  const [actionAttempt,setActionAttempt]=useState(0);
  const retryAction=()=>{setActionReady(false);setActionFailed(false);setActionAttempt(attempt=>attempt+1);};
  const isScriptChoice = beat.choice?.id === 'choice-06';
  const isAgentChoice = beat.choice?.id === 'choice-02';
  const isFullScreenChoice = isScriptChoice || isAgentChoice;
  const isRedCarpetDialogue = background === '/backgrounds/premiere-media-wall.png';
  const sceneClass = isScriptChoice
    ? 'script-selection'
    : isAgentChoice
      ? 'agent-selection'
      : beat.showProjects
        ? 'with-projects'
        : beat.showRoleCard
          ? 'with-role-card'
          : isRedCarpetDialogue
            ? 'red-carpet-dialogue'
            : '';
  return (
    <section className={`dialogue-scene ${background ? 'has-background' : ''} ${sceneClass} ${beat.actionPose ? 'filming-scene' : ''}`} style={background ? { backgroundImage: `url(${background})` } : undefined}>
      <div className="set-dressing"><span>{beat.tag || stageInfoFromBeat(beat)}</span><i>{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</i></div>
      {backgroundReady && beat.graduationPortrait && <img className="graduation-portrait" src={GRADUATION_PORTRAIT_SRC} width={1386} height={2080} alt={'Lin in her graduation gown, holding her diploma'} draggable={false} decoding="async" />}
      {backgroundReady && beat.actionPose && <CharacterCanvas key={`${beat.actionPose}-${actionAttempt}`} face={lockedFace} hair={avatar} look="qipao" actionPose={beat.actionPose} onReady={setActionReady} onLoadError={setActionFailed} className="filming-character" label={'Lin performing Night Orchid'} />}
      {beat.filmSuccess && <aside className="film-success-card" role="status"><p>{'FILM SUCCESS'}</p><h2>NIGHT ORCHID</h2><strong>2×</strong><span>{'OPENING WEEKEND FORECAST'}</span><b>FAME +5</b><small>{'SEQUEL TALKS UNDERWAY'}</small></aside>}
      {backgroundReady && !isFullScreenChoice && beat.left && <Sprite sprite={beat.left} avatar={avatar} lockedLook={lockedLook} lockedFace={lockedFace} position="left" />}
      {backgroundReady && !isFullScreenChoice && beat.center && <Sprite sprite={beat.center} avatar={avatar} lockedLook={lockedLook} lockedFace={lockedFace} position="center" />}
      {backgroundReady && !isFullScreenChoice && beat.right && <Sprite sprite={beat.right} avatar={avatar} lockedLook={lockedLook} lockedFace={lockedFace} position="right" />}
      {beat.showProjects && !isFullScreenChoice && <ProjectCards />}
      {beat.showRoleCard && <RoleCard />}
      {beat.flash && <div className="camera-flash" key={`flash-${index}`} />}

      {beat.choice ? (
        isScriptChoice
          ? <ScriptChoicePanel set={beat.choice} ready={choiceReady} notice={choiceNotice} onChoice={onChoice} />
          : isAgentChoice
            ? <AgentChoicePanel set={beat.choice} ready={choiceReady} notice={choiceNotice} onChoice={onChoice} />
          : <ChoicePanel set={beat.choice} ready={choiceReady} notice={choiceNotice} onChoice={onChoice} />
      ) : (
        <div className="dialogue-shell">
          <span className="speaker-tag">{formatSpeakerLabel(beat.speakerEn)}</span>
          <button className="dialogue-box" onClick={beat.actionPose&&actionFailed?retryAction:onAdvance} disabled={Boolean(beat.actionPose)&&!actionFailed&&(!backgroundReady||!actionReady)} aria-label={beat.actionPose&&actionFailed?'Retry character loading':'Continue dialogue'}>
            <span className="dialogue-text" aria-live="polite">{beat.actionPose&&actionFailed?('Character could not load. Click to retry — your choices are safe.'):beat.actionPose&&(!backgroundReady||!actionReady)?('Preparing the set…'):(beat.en)}</span>
            <span className="dialogue-next"><ChevronRight /></span>
          </button>
        </div>
      )}
    </section>
  );
}

function ChoicePanel({ set, ready, notice, onChoice }: { set: ChoiceSet; ready: boolean; notice: string; onChoice: (choice: Choice, set: ChoiceSet) => void }) {
  return (
    <div className="choice-panel">
      <div className="choice-title"><span>{'CAREER RESPONSE'}</span><small>{'Choose a response'}</small></div>
      <div className="choice-list">
        {set.items.map((choice, index) => (
          <button key={choice.id} className={choice.preset && ready ? 'preset' : ''} onClick={() => onChoice(choice, set)}>
            <span>{String.fromCharCode(65 + index)}</span><b>{choice.en}</b>{choice.preset && ready && <em>PRESET</em>}
          </button>
        ))}
      </div>
      <p className="choice-notice">{notice || (ready ? ('Preset route available.') : ('Reading the room…'))}</p>
    </div>
  );
}

function AgentChoicePanel({ set, ready, notice, onChoice }: { set: ChoiceSet; ready: boolean; notice: string; onChoice: (choice: Choice, set: ChoiceSet) => void }) {
  const agents = [
    { id: 'a', tone: 'david', number: '01', src: sprites.david.src, ...SUPPORTING_CAST.DAVID, focusEn: 'ROLE RANGE', traitEn: 'CULTURAL UNDERSTANDING · HIGH', paceEn: 'MARKET SPEED · STEADY', fame: 0, pressure: 0 },
    { id: 'b', tone: 'claire', number: '02', src: sprites.claire.src, ...SUPPORTING_CAST.CLAIRE, focusEn: 'MARKET ACCESS', traitEn: 'MARKET ACCESS · STRONG', paceEn: 'REVISION RATE · HIGH', fame: 2, pressure: 2 },
  ];

  return (
    <div className="script-choice-panel agent-choice-panel">
      <header className="script-choice-heading">
        <span>{'SELECT AN AGENT'}</span>
      </header>
      <div className="agent-choice-grid">
        {agents.map((agent) => {
          const choice = set.items.find((item) => item.id === agent.id)!;
          const isPreset = Boolean(choice.preset && ready);
          return (
            <button
              key={agent.id}
              className={`script-folder agent-folder ${agent.tone} ${isPreset ? 'preset' : ''}`}
              onClick={() => onChoice(choice, set)}
              aria-label={choice.en}
            >
              <span className="agent-number">AGENT FILE {agent.number}</span>
              <span className="agent-name"><b>{agent.nameEn} <span className="cast-role">{`(${agent.roleEn})`}</span></b></span>
              <span className="agent-portrait"><img src={agent.src} alt={agent.nameEn} /></span>
              <span className="agent-focus">{agent.focusEn}</span>
              <span className="agent-traits"><b>{agent.traitEn}</b><b>{agent.paceEn}</b></span>
              <span className="agent-impact"><small>{'POSSIBLE CHANGE'}</small><b>FAME +{agent.fame}</b><b>PRESSURE +{agent.pressure}</b></span>
              {isPreset && <span className="script-preset">PRESET</span>}
            </button>
          );
        })}
      </div>
      <p className="script-choice-notice">{notice || (ready ? ('Preset route available. Choose an agent file.') : ('Reviewing representation offers…'))}</p>
    </div>
  );
}

function ScriptChoicePanel({ set, ready, notice, onChoice }: { set: ChoiceSet; ready: boolean; notice: string; onChoice: (choice: Choice, set: ChoiceSet) => void }) {
  const scripts = [
    { id: 'a', tone: 'dragon', Icon: Sword, number: '01', titleEn: 'DRAGON LADY', filmEn: 'NIGHT ORCHID', roleEn: 'ANNA WU', releaseEn: 'WIDE RELEASE', stats: 'FAME +2 · PRESSURE +1' },
    { id: 'b', tone: 'lotus', Icon: Flower2, number: '02', titleEn: 'WHITE LOTUS', filmEn: 'WHITE SEASON', roleEn: 'LILY', releaseEn: 'WIDE RELEASE', stats: 'FAME +2 · PRESSURE +1' },
    { id: 'c', tone: 'indie', Icon: Clapperboard, number: '03', titleEn: 'INDEPENDENT FILM', filmEn: 'SMALL WEATHER', roleEn: 'MEI', releaseEn: 'LIMITED RELEASE', stats: 'FAME +0 · PRESSURE +0' },
  ];

  return (
    <div className="script-choice-panel">
      <header className="script-choice-heading">
        <span>{'SELECT A SCRIPT'}</span>
      </header>
      <div className="script-choice-grid">
        {scripts.map((script) => {
          const choice = set.items.find((item) => item.id === script.id)!;
          const isPreset = Boolean(choice.preset && ready);
          const Icon = script.Icon;
          return (
            <button
              key={script.id}
              className={`script-folder ${script.tone} ${isPreset ? 'preset' : ''}`}
              onClick={() => onChoice(choice, set)}
              aria-label={choice.en}
            >
              <span className="script-number">SCRIPT {script.number}</span>
              <span className="script-titles">
                <b>{script.titleEn}</b>
              </span>
              <span className="script-emblem" aria-hidden="true"><Icon /></span>
              <span className="script-film">{script.filmEn}</span>
              <span className="script-meta">{script.roleEn} · {script.releaseEn}</span>
              <span className="script-stats">{script.stats}</span>
              {isPreset && <span className="script-preset">PRESET</span>}
            </button>
          );
        })}
      </div>
      <p className="script-choice-notice">{notice || (ready ? ('Preset route available. Choose a file.') : ('Reviewing the project slate…'))}</p>
    </div>
  );
}

function TrainingScreen({ avatar, lockedLook, lockedFace, done, setDone, soundOn, onContinue }: { avatar: AvatarKey; lockedLook: LookKey | null; lockedFace: FaceSelections | null; done: string[]; setDone: (value: string[]) => void; soundOn: boolean; onContinue: () => void }) {
  const tokens = [
    { id: 'acting', label: 'SCENE STUDY', result: 'FIGHT TEST READINESS: LOW', detailEn: 'ACTING +1 · fight-test readiness low' },
    { id: 'martial', label: 'MARTIAL ARTS', result: 'MARTIAL ARTS +1 · ACTING -1', detailEn: 'Preset route · one training slot' },
    { id: 'recovery', label: 'RECOVERY', result: 'PROJECT READINESS: DOWN', detailEn: 'PRESSURE -1 · project readiness reduced' },
  ];
  const click = (id: string) => {
    if (id !== 'martial' || done.includes(id)) { ping(soundOn, 280); return; }
    ping(soundOn, 680); setDone([id]);
  };
  return (
    <section className="training-screen stage-screen">
      <div className="training-panel">
      <div className="training-copy"><span>CHOICE 07 · SINGLE TRAINING SLOT</span><h2>{<><span className="training-heading-line">The fight test</span>{' '}<span className="training-heading-line">moved to Friday.</span></>}</h2><p>{'“This film won’t delay because you understand the character better.” Training changes skills, not Fame or Pressure.'}</p></div>
      <div className="training-tokens">
        {tokens.map((token, index) => <button key={token.id} onClick={() => click(token.id)} className={done.includes(token.id) ? 'done' : ''}><span>0{index + 1}</span><b>{token.label}</b><small>{done.includes(token.id) ? token.result : token.detailEn}</small>{token.id === 'martial' && <em>PRESET</em>}</button>)}
      </div>
      <Button className="continue-button" disabled={!done.includes('martial')} onClick={onContinue}>{'CONTINUE TO FILM RELEASE'} <ChevronRight /></Button>
      </div>
      <Sprite sprite="linTraining" avatar={avatar} lockedLook={lockedLook} lockedFace={lockedFace} position="training-character" />
    </section>
  );
}

function EndingScreen({ avatar, lockedLook, lockedFace, fame, pressure, backgroundReady, onRestart }: { avatar: AvatarKey; lockedLook: LookKey | null; lockedFace: FaceSelections | null; fame: number; pressure: number; backgroundReady: boolean; onRestart: () => void }) {
  return (
    <section className="ending-screen">
      <div className="ending-flash" />
      {backgroundReady && <Sprite sprite="linDragon" avatar={avatar} lockedLook={lockedLook} lockedFace={lockedFace} position="center ending-lin" />}
      <div className="ending-echo">“Now everyone knows how to pitch you.”</div>
      <div className="ending-card">
        <span>SUCCESS REGISTERED</span><h2>NIGHT ORCHID</h2><p>LOOK PRESET: DRAGON LADY · NEXT CASTING NOTE: SAME ENERGY</p>
        <div><b>FAME {fame}</b><b>PRESSURE {pressure}</b></div>
        <div><b>{lockedFace ? 'FACE PROFILE LOCKED' : 'FACE PROFILE ORIGINAL'}</b><b>{lockedLook ? `${lookOptions[lockedLook].en} LOCKED` : 'LOOK UNLOCKED'}</b></div>
        <blockquote>{'She is seen. Her sentence is not finished.'}</blockquote>
        <Button className="restart-button" onClick={onRestart}><RotateCcw /> {'PLAY AGAIN'}</Button>
      </div>
    </section>
  );
}

function Sprite({ sprite, avatar, lockedLook = null, lockedFace = null, position }: { sprite: SpriteKey; avatar: AvatarKey; lockedLook?: LookKey | null; lockedFace?: FaceSelections | null; position: string }) {
  const data = sprites[sprite];
  if (sprite.startsWith('lin')) {
    return <CharacterCanvas look={lockedLook ?? 'natural'} hair={avatar} face={lockedFace} className={`character-sprite ${position}`} label={data.name} />;
  }
  return <img className={`character-sprite ${position}`} src={data.src} alt={data.name} />;
}

function AvatarArt({ avatar, className }: { avatar: AvatarKey; className: string }) {
  const option = avatarOptions[avatar];
  return <CharacterCanvas hair={avatar} className={className} label={`Lin · ${option.hairEn} · ${option.faceEn}`} />;
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
  if (beat.speakerEn === 'GRADUATION') return 'CLASS OF 2026';
  return 'AUDITION IN PROGRESS';
}
