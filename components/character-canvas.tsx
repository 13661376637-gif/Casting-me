'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { buildCharacterDrawing, paintCharacter } from '@/lib/avatar-drawing';
import { DEFAULT_FACE, featureAmount, LOOK_HAIR } from '@/lib/avatar-model';
import type { AvatarHair, AvatarLook, FaceFeature, FaceSelections } from '@/lib/avatar-model';

type Props = {
  look?: AvatarLook;
  hair?: AvatarHair;
  face?: FaceSelections | null;
  className?: string;
  label?: string;
  portrait?: boolean;
  decorative?: boolean;
  graduation?: boolean;
  activeTool?: FaceFeature;
  onAdjust?: (feature: FaceFeature, value: number) => void;
};

function FaceToolCursor({ feature }: { feature: FaceFeature }) {
  if (feature === 'cheekbones' || feature === 'skin') {
    const broad = feature === 'skin';
    return (
      <svg viewBox="0 0 72 88" aria-hidden="true">
        <path className="tool-shadow" d="M17 75 45 25l10 6-28 50z" />
        <path className="tool-handle" d="M17 75 45 25l10 6-28 50z" />
        <path className="tool-grip-lines" d="m25 60 10 6m-7-12 10 6" />
        <path className="tool-ferrule" d="m42 29 8-14 14 8-9 13z" />
        <path className="tool-bristles" d={broad ? 'M49 16Q53 2 70 4q2 14-8 22z' : 'M49 16Q54 3 69 2q0 15-7 24z'} />
        <path className="tool-ink" d="M54 13q7-7 14-8" />
      </svg>
    );
  }

  if (feature === 'nose') {
    return (
      <svg viewBox="0 0 72 88" aria-hidden="true">
        <path className="tool-shadow" d="m17 76 33-51 9 6-32 52z" />
        <path className="tool-handle" d="m17 76 33-51 9 6-32 52z" />
        <path className="tool-grip-lines" d="m27 61 10 7m-7-12 10 7" />
        <path className="tool-ferrule" d="m47 28 8-15 12 8-9 15z" />
        <path className="tool-silicone" d="M55 14 64 1l7 5-5 16z" />
        <path className="tool-detail" d="m56 13 10 7" />
      </svg>
    );
  }

  const jaw = feature === 'jaw';
  return (
    <svg viewBox="0 0 72 88" aria-hidden="true">
      <path className="tool-shadow" d="m17 78 34-57 10 6-34 58z" />
      <path className="tool-handle" d="m17 78 34-57 10 6-34 58z" />
      <path className="tool-grip-lines" d="m27 62 10 6m-7-12 10 6" />
      <path className="tool-ferrule" d="m48 26 8-14 11 7-8 14z" />
      <path className={jaw ? 'tool-sculpt-tip' : 'tool-pencil-tip'} d={jaw ? 'm56 13 8-12 7 4-5 15z' : 'm56 13 7-12 6 4-3 15z'} />
      <path className="tool-detail" d="m56 13 10 6" />
    </svg>
  );
}

export function CharacterCanvas({ look = 'natural', hair, face = null, className = '', label = 'Lin', portrait = false, decorative = false, graduation = false, activeTool, onAdjust }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toolCursorRef = useRef<HTMLSpanElement>(null);
  const dragRef = useRef<{ id: number; x: number; value: number; lastValue: number; width: number; feature: FaceFeature } | null>(null);
  const drawingRef = useRef<ReturnType<typeof buildCharacterDrawing> | null>(null);
  const portraitRef = useRef(portrait);
  const redrawRef = useRef<(() => void) | null>(null);
  const onAdjustRef = useRef(onAdjust);
  const adjustFrameRef = useRef<number | null>(null);
  const queuedAdjustRef = useRef<{ feature: FaceFeature; value: number } | null>(null);
  const selection = face ?? DEFAULT_FACE;
  const drawing = useMemo(() => buildCharacterDrawing({ face: selection, hair: hair ?? LOOK_HAIR[look], look, graduation }), [selection, hair, look, graduation]);
  drawingRef.current = drawing;
  portraitRef.current = portrait;
  onAdjustRef.current = onAdjust;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const redraw = () => {
      const nextDrawing = drawingRef.current;
      if (!nextDrawing) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(rect.width * ratio);
      const pixelHeight = Math.round(rect.height * ratio);
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      paintCharacter(context, nextDrawing, rect.width, rect.height, portraitRef.current);
    };
    redrawRef.current = redraw;
    redraw();
    const observer = new ResizeObserver(redraw);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      redrawRef.current = null;
    };
  }, []);

  useEffect(() => {
    redrawRef.current?.();
  }, [drawing, portrait]);

  useEffect(() => () => {
    if (adjustFrameRef.current !== null) cancelAnimationFrame(adjustFrameRef.current);
  }, []);

  const editable = Boolean(activeTool && onAdjust);
  const currentValue = activeTool ? featureAmount(selection, activeTool) : 0;
  const flushAdjustment = () => {
    if (adjustFrameRef.current !== null) {
      cancelAnimationFrame(adjustFrameRef.current);
      adjustFrameRef.current = null;
    }
    const queued = queuedAdjustRef.current;
    queuedAdjustRef.current = null;
    if (queued) onAdjustRef.current?.(queued.feature, queued.value);
  };
  const queueAdjustment = (feature: FaceFeature, value: number) => {
    queuedAdjustRef.current = { feature, value };
    if (adjustFrameRef.current !== null) return;
    adjustFrameRef.current = requestAnimationFrame(() => {
      adjustFrameRef.current = null;
      const queued = queuedAdjustRef.current;
      queuedAdjustRef.current = null;
      if (queued) onAdjustRef.current?.(queued.feature, queued.value);
    });
  };
  const moveToolCursor = (event: ReactPointerEvent<HTMLCanvasElement>, pressed?: boolean) => {
    const cursor = toolCursorRef.current;
    if (!cursor || event.pointerType === 'touch') return;
    const rect = event.currentTarget.getBoundingClientRect();
    cursor.style.setProperty('--tool-x', `${event.clientX - rect.left}px`);
    cursor.style.setProperty('--tool-y', `${event.clientY - rect.top}px`);
    cursor.classList.add('visible');
    cursor.classList.toggle('pressed', Boolean(pressed));
  };
  const hideToolCursor = () => {
    const cursor = toolCursorRef.current;
    if (!cursor) return;
    cursor.classList.remove('visible', 'pressed');
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`character-canvas ${portrait ? 'portrait-canvas' : 'full-character-canvas'} ${editable ? 'editable-character-canvas' : ''} ${className}`}
        data-face-tool={editable ? activeTool : undefined}
        width={portrait ? 530 : 512}
        height={portrait ? 620 : 1280}
        role={editable ? 'slider' : decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : label}
        aria-hidden={decorative || undefined}
        aria-valuemin={editable ? 0 : undefined}
        aria-valuemax={editable ? 100 : undefined}
        aria-valuenow={editable ? Math.round(currentValue * 100) : undefined}
        tabIndex={editable ? 0 : undefined}
        onPointerEnter={event => moveToolCursor(event)}
        onPointerDown={event => {
          if (!activeTool || !onAdjust || (event.pointerType === 'mouse' && event.button !== 0)) return;
          event.preventDefault();
          moveToolCursor(event, true);
          const width = event.currentTarget.getBoundingClientRect().width;
          dragRef.current = { id: event.pointerId, x: event.clientX, value: currentValue, lastValue: currentValue, width, feature: activeTool };
          event.currentTarget.setPointerCapture(event.pointerId);
          onAdjustRef.current?.(activeTool, currentValue);
        }}
        onPointerMove={event => {
          const drag = dragRef.current;
          moveToolCursor(event, Boolean(drag));
          if (!drag || drag.id !== event.pointerId) return;
          event.preventDefault();
          const value = Math.max(0, Math.min(1, drag.value + (event.clientX - drag.x) / Math.max(100, drag.width * 0.5)));
          if (Math.abs(value - drag.lastValue) < 0.002) return;
          drag.lastValue = value;
          queueAdjustment(drag.feature, value);
        }}
        onPointerLeave={() => { if (!dragRef.current) hideToolCursor(); }}
        onPointerUp={event => {
          if (dragRef.current?.id !== event.pointerId) return;
          flushAdjustment();
          dragRef.current = null;
          moveToolCursor(event);
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => { flushAdjustment(); dragRef.current = null; hideToolCursor(); }}
        onLostPointerCapture={() => {
          if (!dragRef.current) return;
          flushAdjustment();
          dragRef.current = null;
          hideToolCursor();
        }}
        onKeyDown={event => {
          if (!activeTool || !onAdjust) return;
          const direction = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 0;
          if (!direction && event.key !== 'Home' && event.key !== 'End') return;
          event.preventDefault();
          onAdjust(activeTool, event.key === 'Home' ? 0 : event.key === 'End' ? 1 : Math.max(0, Math.min(1, currentValue + direction * 0.05)));
        }}
      />
      {editable && activeTool && (
        <>
          <span className="face-tool-ready" aria-hidden="true">
            <small>ACTIVE TOOL</small>
            <span className={`face-tool-cursor face-tool-preview face-tool-cursor-${activeTool}`}>
              <FaceToolCursor feature={activeTool} />
            </span>
            <b>{activeTool.toUpperCase()}</b>
          </span>
          <span ref={toolCursorRef} className={`face-tool-cursor face-tool-cursor-${activeTool}`} aria-hidden="true">
            <FaceToolCursor feature={activeTool} />
          </span>
        </>
      )}
    </>
  );
}
