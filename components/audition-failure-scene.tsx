'use client';

import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { AUDITION_FAILURE_ASSETS, preloadAuditionFailure } from '@/lib/audition-failure';

export function AuditionFailureScene({ beat, index, total, onAdvance }: {
  beat: { speakerEn: string; en: string };
  index: number;
  total: number;
  onAdvance: () => void;
}) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void preloadAuditionFailure().then(
      () => { if (active) setStatus('ready'); },
      () => { if (active) setStatus('error'); },
    );
    return () => { active = false; };
  }, [attempt]);
  const retry = () => { setStatus('loading'); setAttempt(value => value + 1); };

  return (
    <section className={`dialogue-scene audition-failure-scene ${status === 'ready' ? 'has-background' : ''}`}
      style={status === 'ready' ? { backgroundImage: `url(${AUDITION_FAILURE_ASSETS.background})` } : undefined}>
      <div className="audition-failure-composition">
        <article className="audition-result">
          <p className="audition-kicker">01B · BEFORE REPRESENTATION</p>
          <h1>AUDITION<br />FAILED</h1>
          <p className="audition-verdict">No role. No callback.</p>
          <div className="audition-result-note">
            <span>CASTING FEEDBACK</span>
            <p>“Strong work.<br />Unclear positioning.”</p>
          </div>
          <p className="audition-cost">She kept her interpretation.<br />The opportunity went to someone else.</p>
          <span className="audition-page">{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
        </article>
        <div className="audition-portrait-slot">
          {status === 'ready' && <img src={AUDITION_FAILURE_ASSETS.portrait} width={1024} height={1536}
            className="audition-failure-portrait" alt="Lin after the rejected audition, eyes lowered and shoulders dropped, holding her wrist in her original black dress"
            draggable={false} decoding="async" />}
        </div>
      </div>
      <div className="dialogue-shell">
        <span className="speaker-tag">{beat.speakerEn}</span>
        <button className="dialogue-box" disabled={status === 'loading'} onClick={status === 'error' ? retry : onAdvance}
          aria-label={status === 'error' ? 'Retry audition artwork loading' : index === total - 1 ? 'Continue to meet the agents' : 'Continue dialogue'}>
          <span className="dialogue-text" aria-live="polite">{status === 'error'
            ? 'The scene could not load. Click to retry—your progress is safe.'
            : status === 'loading' ? 'Preparing the scene…' : beat.en}</span>
          <span className="dialogue-next"><ChevronRight /></span>
        </button>
      </div>
    </section>
  );
}
