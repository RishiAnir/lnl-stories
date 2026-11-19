# Don't Miss Your Stop: style lock

## Look: SOFT style (assets/soft.js, assets/softsets.js), modelled on Rishi's "3:17 AM stories" reference
- Round heads with pale faces, two dot eyes, no nose, a mouth only when it matters ('meek', 'small', 'o'; the Conductor's 'wide').
- Soft gradient shading on every shape (`soft()`, `blob()`, `oval()`, `limb()`), never flat fills or outlines. Chunky soft limbs, mitten hands.
- Hair as a soft cap with fringe tufts and fine strands (`clumps()`, `strands()`).
- Sets are lived-in: tote bags, umbrellas, spilled coffee, newspapers. The background layer is drawn blurred (`blurred(ctx, px, draw)`) so the people in focus stand out.
- Post, in this order: `nightGrade` (deep night blue, multiply) → `lightPool` (the car's tube, a phone, the platform lamp) → `faceGlow` (only YOU and JUNE glow, from the train lighting; passengers barely; the Conductor never) → `glow(ctx, 0.5)` → `painterly()` → `grain()` → `vignette()`.
- The Conductor's eyes are always lost in his cap's shadow. Never show them.
- Framing like the reference: one or two people large in frame, close-ups, over-the-shoulder, POV hands. Avoid wide crowded shots except to establish the car.

## Cast (soft.js CAST): YOU (yellow headphones round the neck, olive backpack straps, messy brown hair), JUNE (silver bun with a pencil, camel coat over blue scrubs, red knitting, the long scarf trails across the floor), CONDUCTOR (very tall, cap, white gloves, ticket punch), RED (red tracksuit, gold chain), passenger(i) (each their own colours, hair and accessory).

## UI
- `timeChip()` (ui.js): top left, "● 2:14 AM" over "PART N · PLACE". On the first shot of every part and whenever time or place changes. The time is stuck at 2:14 for the whole story until the very end (2:15, Part 5).
- `titleTop()` for the story title on the first shot; captions as in Bulkway (continuous, orange keywords).
- The rules sheet is handwritten (Caveat); only quote the rule that matters right now.
