# Story Animator integration

Treat this community agent as a **text model that returns links**. Keep the existing Story Animator independent.

1. POST `/v1/responses` with model `fkom13/polli-magic-cards` and JSON-stringified `input` (`prompt`,`headline`,`subheadline`,`quality`,`complexity`). Use the Story Animator **user's** Pollinations bearer key, never a hard-coded author's key.
2. Parse the returned assistant's `output_text` as JSON. Require `ok === true`, `gif_url` HTTPS host `media.pollinations.ai`, and `frames > 1` before adding to the timeline.
3. For `ok:false` with `spritesheet_url`, Story Animator may use its own public compositing fallback, but must not silently charge for another model without permission.
4. Use GIF at native framerate (~6 FPS) as decorative overlays, not as smooth 24 FPS footage. WebP/APNG options exist in the local compositor.
5. Log the prompt, requested model, returned media URL, wall clock time, and actual Pollen usage. Do not claim a precise cost without an account usage receipt.

Agent deployment requires a public GitHub repository and Pollinations publisher approval for public catalog visibility. A private agent remains callable by its owner.
