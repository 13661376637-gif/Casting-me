# V3 · Audition failed artwork

Built-in imagegen, not CLI. Reference: the leftmost natural-look character in the current Canvas model QA sheet `work/character-verification/reference-body-render.png`.

Final: `public/characters/lin-audition-failed-v3.png`, 1024 × 1536 RGBA. Whole figure in one asset; no composited face. Transparent fraction 73.3358%; no nontransparent edge pixels. Used only before the face editor, in the new audition-failure interlude. Original face editor and action sprites remain unchanged.

## Generation prompt

Use case: identity-preserve.
Asset type: one complete full-body transparent PNG character sprite for the existing CASTING ME visual novel.
Input image: reference-body-render.png is the current game's character model sheet. Use ONLY THE LEFTMOST WOMAN in the black asymmetric evening dress as the exact identity, costume, drawing style and body-proportion reference. Do not combine the other outfits.
Primary request: draw that SAME Lin immediately after an unsuccessful audition, quietly dejected. Head inclines slightly downward, gaze lowered but eyes visible; inner eyebrows raised slightly, mouth closed and subtly downturned, shoulders gently dropped; one hand lightly holds her opposite wrist low in front of her waist. Restrained disappointment, no tears, no smile, no dramatic collapse.
Preserve her recognizable face, narrow almond brown eyes, swept-back black hair crown with long straight hair behind shoulders, dangling silver earrings, warm light peach skin, long black asymmetric one-shoulder dress with the same triangular cutout, ruching and side slit, ankle-strap black heels. Preserve the reference's tall slender proportions, shoulder width, natural neck length and approximately eight-head fashion figure, without enlarging the head or shortening the legs. Exactly two arms, anatomically clear natural fingers.
Style: MATCH the supplied game's precise dark hand-drawn outlines, restrained cel-shaded cloth folds and warm skin planes, mature semi-realistic Western visual-novel/fashion illustration. Not painterly, not photoreal, not chibi, no new style.
Composition: SINGLE coherent full-body drawing, entire hair top, hands, dress hem, both shoes fully visible with clear margin on every side. Front-facing body with subtle bowed head; continuous anatomically joined neck and shoulders, no pasted face or compositing seams. Center figure on a portrait canvas.
Background: genuinely transparent RGBA alpha, no background, no checkerboard texture, no ground plane or cast shadow. High resolution crisp lines. No UI, no text, no watermark. Generate just one woman, not a contact sheet.

## Transparency extraction prompt

Use case: background-extraction. Edit target: this complete full-body dejected Lin character illustration. Remove the entire gray/white checkerboard background and export a genuinely transparent RGBA PNG with alpha zero outside the figure. Preserve the exact entire character without redesign: facial expression, facial identity, swept-back hair, earrings, joined neck, skin color, hands and fingers, black asymmetric gown, slit, shoes, linework, cel-shading, pixel dimensions 1024x1536 and proportions. Do not draw a checkerboard; actual transparency is mandatory. No background, no drop shadow, no glow or halos, no crop. Do not regenerate or repaint the person; just cleanly extract this already finished character, including empty space between body and arms.

## Source provenance

- Initial generated file: `exec-daff2c0d-2c60-4114-aec9-ada17a211a09.png` (RGB, rejected for runtime because of baked checkerboard).
- Final generated file: `exec-70016978-c2ef-4464-97ed-4d385c9650ae.png` (RGBA, copied unchanged to the project).
- Both originals remain under `C:/Users/shang/.codex/generated_images/01a0bd89-aa2d-7ed0-9ff3-f58c9a00d0e2/`.
- Visual check: same swept-back hair, silver earrings, warm skin, asymmetric black dress/cutout, long figure and fine cel-shaded linework; lowered eyes, sloping eyebrows and hands holding the wrist supply the sadness. Intentional pose/expression change, not a pixel-identical redraw.
