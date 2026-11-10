# Polli Magic Cards — model matrix and reproducible evidence (11 November 2026)

Four supported image models can be selected by `image_model` in the code agent while maintaining the *same* public sprite-sheet → hosted FFmpeg GIF pipeline; there is **no native GIF model call** through the current Pollinations image MCP.

The owner key was used for one live `quality=medium`, `complexity=low` (2×2 sprite sheet), 6-frame transparent GIF test on each of the following variants. The same descriptive prompt was reused, not an identical image reference or deterministic seed. Figures are measured historical charges from `polli usage --history`; FFmpeg is rounded to $0.0000 on these records.

| Model | Model image charge (USD) | End-to-end time | Output | Fully transparent pixels, frame 1 | Live GIF |
|---|---:|---:|---|---:|---|
| GPT Image 2.5 Flare | $0.0106 | 30.54 s | 512×632, 6 frames | 31.16% | [view](https://media.pollinations.ai/80ea79d4-7200-491c-8f0e-97844dce9341) |
| GPT Image 2.5 Sunburst | $0.0106 | 31.61 s | 512×632, 6 frames | 26.51% | [view](https://media.pollinations.ai/0308be5f-90b2-4271-a125-87dbba108711) |
| GPT Image 2.6 Flare | $0.0444 | 19.22 s | 512×632, 6 frames | 28.80% | [view](https://media.pollinations.ai/a807a8c2-b4fd-4c06-b436-88ea7389a09b) |
| GPT Image 2.6 Sunburst | $0.0769 | 84.27 s | 512×632, 16 frames | 21.74% after fix | [view](https://media.pollinations.ai/1b84b800-212a-4156-b2c7-94cdffeaf3d5) |

The 2.6 Sunburst row is **not like-for-like**: it used quality high, a 3×3 sheet, 16 assembled GIF frames, a different detailed portrait prompt, and $0.0004 total recorded FFmpeg for the first and corrected renders. It is included as the original quality reference, not as a direct model benchmark.

Three like-for-like first frames are available in a [contact sheet](https://media.pollinations.ai/8177e11e-290a-40bb-aace-a7648140fb9d).

## Provider feature boundaries

- Official **OpenAI GPT Image 2.6 Flare and Sunburst** support `complexity=low|medium|high`, SVG output, and direct GIF generation via the Images API. The native GIF has `frame_count` 2–16 and `frame_duration_ms` controls. Native GIF+transparent background was tested on this owner's OpenAI API, but generic documentation sometimes only guarantees transparency for PNG/WebP.
- Official GPT Image 2.5 versions expose high-fidelity image generation and editing, transparency, and quality `xhigh/max`. OpenAI's release documentation introduces GIF and SVG as *2.6 additions*; we have not validated native GIF/SVG functionality on 2.5.
- Pollinations currently lists all four models for **image generation and editing**, with up to 16 reference images. Public MCP `generateImage` accepts `quality` only through `high`, and `transparent`, but not `complexity`, `frame_count`, `frame_duration_ms`, or native `output_format=gif|svg`. All four 2.5/2.6 tests above generated GIFs through our **external FFmpeg assembly**, not the image models directly.
- Official APIs support more quality settings than this image MCP: the agent deliberately rejects unsupported `quality=xhigh|max` rather than pretending they are applied.

## Usage from Story Animator or other callers

```json
{
  "prompt": "An elegant luminous fairy blinking with sapphire wings",
  "headline": "Black Friday",
  "subheadline": "fée à louer -50%",
  "image_model": "openai/gpt-image-2.5-flare",
  "quality": "medium",
  "complexity": "low"
}
```

This JSON is the *user input of the hosted code agent*, not an OpenAI Images API request. `complexity` only controls the 2×2 / 2×3 / 3×3 sprite-sheet workflow, with forward-and-backward animated playback. The agent returns **text containing media links**, not a byte-serialized image-model response. Current public publication is gated by account-level approval ([issue #19471](https://github.com/pollinations/pollinations/issues/19471)).

Prices are historical and can change. Model rates in Pollinations registry were respectively $22.50/M image output tokens for 2.5 and $30/M for 2.6; token counts, rendered detail and quality settings drive final per-call cost. The high-quality tests require proper typography, alpha and motion review, not just successful API responses.
