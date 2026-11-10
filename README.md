# Polli Magic Cards

An open-source Pollinations **Code Agent** that makes animated, transparent promo cards and stickers from a still-image **sprite sheet**. The first working mode uses **GPT Image 2.6 Sunburst through Pollinations**, followed by **FFmpeg compositing**. No direct OpenAI API key, private endpoint or owner credentials are needed.

**Made with [Pollinations](https://pollinations.ai/).**

## Status and limitations

- **Local compositor:** operational. Processes 2×2, 2×3 and 3×3 transparent sprite sheets into GIF, animated WebP, and APNG, adding one typography layer consistently across all frames.
- **Pollinations-hosted agent:** `agent.ts` orchestrates Pollinations `generateImage` and hosted FFmpeg MCP `runFfmpeg`, returning a GIF URL via the agent's text/Responses interface. A complete live hosted GIF was validated on November 10, 2026: [view the 6-frame transparent test](https://media.pollinations.ai/a0216ba8-9989-4c6f-9019-4fcefc893e54). GIF outputs are *not* direct native Sunburst GIFs; the agent constructs them from one generated sheet.
- The upstream images are still billed by **the caller's own Pollen**, and FFmpeg MCP may incur a small separate billed tool cost. This is **not a free Sunburst model**.
- Transparent alpha and sprite-sheet coherence depend on model output; some iterations may need image edits or review. The hosted agent makes **one image call and one FFmpeg call, with no automatic retry**.
- A managed Pollinations Code Agent registers as a **text model with media links**, not as an image-generation endpoint. Applications such as Story Animator should call its Responses/Chat Completions API or use the Python compositor.
- `complexity` here is **workflow complexity** (4/6/9 poses), not OpenAI's native `complexity` parameter, which the current Pollinations image gateway may not expose.

## Current deployment and public access

The GitHub source is public and the managed Code Agent is **deployed and working under the owner account** as `community/fkom13/polli-magic-cards`. Pollinations currently keeps this model registration **private**, pending approval of [publisher access request #19471](https://github.com/pollinations/pollinations/issues/19471). Do not describe it as publicly callable until the account receives that permission and visibility is changed to public.

Hosted FFmpeg's Alpine image does not have standard fonts installed. The agent therefore loads the open-licensed Noto Serif font from Google Fonts via the public FFmpeg MCP as `input1`, without bundling a font file. The hosted agent requires access to that public resource.

A live `medium` quality test via the owner key returned a 6-frame 512×632 transparent GIF; the image portion was billed $0.0442 Pollen and FFmpeg usage was rounded to $0.0000 in the usage view. These are historical observed costs, not a fixed quote. A separate local free-first Pruna experiment lives in the owner's private workspace and is **not** published in this repository.

## Community invocation (once publisher approval is granted)

Send a user message containing JSON:

```json
{
  "prompt": "A luminous sapphire-winged fairy blinking, magical blue halo and tiny stars, premium illustrated advertisement",
  "headline": "Black Friday",
  "subheadline": "fée à louer -50%",
  "quality": "high",
  "complexity": "medium"
}
```

Call the registered model (`community/fkom13/polli-magic-cards`) with your own Pollinations API key (until publication, only the owner's key can call it):

```bash
curl https://gen.pollinations.ai/v1/responses \
  -H "Authorization: Bearer $POLLINATIONS_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"model":"community/fkom13/polli-magic-cards","input":"{\"prompt\":\"A magical blue fairy blinking\",\"headline\":\"Black Friday\",\"subheadline\":\"fée à louer -50%\",\"complexity\":\"medium\"}","store":false}'
```

The model's text reply contains a machine-readable JSON string with `gif_url`, `spritesheet_url`, `frames`, `fps`, requested quality and provenance. A local failure still includes the successful spritesheet URL when available.

### Recompose without another image generation

For typography or FFmpeg effects iteration, use an **existing** `spritesheet_url` returned by a previous successful call, and the same `complexity` (grid size):

```json
{"prompt":"Fairy blue aura","headline":"Black Friday","subheadline":"fée à louer -50%","quality":"high","complexity":"high","spritesheet_url":"https://media.pollinations.ai/<media-id>"}
```

This invokes **only the hosted FFmpeg MCP**, not `generateImage` again. The sheet URL must point directly to `media.pollinations.ai`, preventing arbitrary network fetches. The agent uses `drawbox:replace=1` to ensure the dark caption plaque is opaque instead of accidentally transparent. This is especially useful when high-quality 3×3 image sheets are expensive; high workflow complexity yields 16 ping-pong GIF frames but **does not** forward a native `complexity` setting to GPT Image 2.6 (unsupported in the current Pollinations image route).


For JavaScript integrations (including Story Animator), see [`examples/story-animator-adapter.mjs`](examples/story-animator-adapter.mjs), which validates returned asset URLs, parses the Responses payload, and returns a timeline-friendly asset descriptor.

## Local compositor

```bash
python3 -m pip install -r requirements.txt
python3 magic_cards.py path/to/transparent-sheet.png --out ./out \
  --columns 2 --rows 3 --title 'Black Friday' \
  --subtitle 'fée à louer -50%' --frame-ms 180
```

`out/` contains `card.gif`, `card.webp`, `card.apng` and `manifest.json`.

### Getting a compatible transparent sheet through Pollinations

For an authenticated [Polli CLI](https://github.com/pollinations/pollinations/tree/main/packages/polli-cli):

```bash
polli gen image --model openai/gpt-image-2.6-sunburst --transparent \
  --width 1024 --height 1536 --output sheet.png \
  'Exactly 2 columns x 3 rows of the same subject in six subtle animation poses, no borders, no text, same framing, true transparent background'
python3 magic_cards.py sheet.png --out ./out --columns 2 --rows 3
```

The CLI currently has no `--quality` flag. The hosted `agent.ts` sends the `quality` option through the Pollinations MCP image tool, which supports `low`, `medium` and `high`.

## How it works

1. Produce one transparent animation sheet with consistent character identity.
2. Crop cells and apply a forward/backward motion sequence for a loop.
3. Composite a **separate fixed typography plaque** and optional repeatable procedural sparkles.
4. Export GIF with binary transparency and WebP/APNG with full alpha; produce a machine-readable manifest.

The public workflow makes no request to EA MCP Media, Pruna reverse proxies or private cost-routing code. All secrets stay in **caller environment**, never in GitHub or the prompt. Full local image provenance and tests use user-owned files kept out of the repo by `.gitignore`.

## Integration and security

The Pollinations-managed agent receives the caller's own account permissions through the platform. It never asks users to paste an API key into a chat and never attempts to access private network endpoints. Inputs are bounded and title characters are validated for safe FFmpeg filter construction. The local compositor does no network calls.

API costs are not pre-authorized or capped by `max_pollen` in this V0: use a **budget-limited caller key** and avoid running it on unrestricted accounts. No retry loop is included.

## Roadmap

- Better cross-frame identity checking and alpha-stability metrics
- Optional image edits with low-cost models and automated review
- Transparency spill detection, face stability and loop seam QA
- Optional owner-controlled private rendering plugin **outside this repository**
- Separate free/cheap prototype (P-Image, P-Image-Edit, Qwen/Flux, motion layers, ImgTools/RMBG and Remotion)

## License

MIT. See [LICENSE](LICENSE).
