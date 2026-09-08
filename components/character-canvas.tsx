'use client';

import { useEffect, useMemo, useRef } from 'react';
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

export function CharacterCanvas({ look = 'natural', hair, face = null, className = '', label = 'Lin', portrait = false, decorative = false, graduation = false, activeTool, onAdjust }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ id: number; x: number; value: number; width: number; feature: FaceFeature } | null>(null);
  const selection = face ?? DEFAULT_FACE;
  const drawing = useMemo(() => buildCharacterDrawing({ face: selection, hair: hair ?? LOOK_HAIR[look], look, graduation }), [selection, hair, look, graduation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const redraw = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      const context = canvas.getContext('2d');
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      paintCharacter(context, drawing, rect.width, rect.height, portrait);
    };
    redraw();
    const observer = new ResizeObserver(redraw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [drawing, portrait]);

  const editable = Boolean(activeTool && onAdjust);
  const currentValue = activeTool ? featureAmount(selection, activeTool) : 0;
  return (
    <canvas
      ref={canvasRef}
      className={`character-canvas ${portrait ? 'portrait-canvas' : 'full-character-canvas'} ${editable ? 'editable-character-canvas' : ''} ${className}`}
      width={portrait ? 530 : 512}
      height={portrait ? 620 : 1280}
      role={editable ? 'slider' : decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      aria-valuemin={editable ? 0 : undefined}
      aria-valuemax={editable ? 100 : undefined}
      aria-valuenow={editable ? Math.round(currentValue * 100) : undefined}
      tabIndex={editable ? 0 : undefined}
      onPointerDown={event => {
        if (!activeTool || !onAdjust || (event.pointerType === 'mouse' && event.button !== 0)) return;
        event.preventDefault();
        const width = event.currentTarget.getBoundingClientRect().width;
        dragRef.current = { id: event.pointerId, x: event.clientX, value: currentValue, width, feature: activeTool };
        event.currentTarget.setPointerCapture(event.pointerId);
        onAdjust(activeTool, currentValue);
      }}
      onPointerMove={event => {
        const drag = dragRef.current;
        if (!drag || drag.id !== event.pointerId || !onAdjust) return;
        const value = drag.value + (event.clientX - drag.x) / Math.max(100, drag.width * 0.5);
        onAdjust(drag.feature, Math.max(0, Math.min(1, value)));
      }}
      onPointerUp={event => {
        if (dragRef.current?.id !== event.pointerId) return;
        dragRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { dragRef.current = null; }}
      onLostPointerCapture={() => { dragRef.current = null; }}
      onKeyDown={event => {
        if (!activeTool || !onAdjust) return;
        const direction = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 0;
        if (!direction && event.key !== 'Home' && event.key !== 'End') return;
        event.preventDefault();
        onAdjust(activeTool, event.key === 'Home' ? 0 : event.key === 'End' ? 1 : Math.max(0, Math.min(1, currentValue + direction * 0.05)));
      }}
    />
  );
}
