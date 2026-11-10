# Quality benchmark — Polli Magic Cards, November 10, 2026

## Reproducible live run

- **Model**: `openai/gpt-image-2.6-sunburst` via Pollinations hosted Code Agent and FFmpeg MCP
- **Request**: `quality=high`, `complexity=high` (workflow complexity; nine-pose sprite sheet 3×3), isolated adult fantasy fairy in a close-up sapphire portrait, independent `Black Friday` / `fée à louer -50%` captions
- **No direct OpenAI API call**; the image call was billed to the caller's Pollinations key
- **Generated sheet**: [3×3 Sunburst sheet](https://media.pollinations.ai/18ca4970d690fac22c4b81998265455a919d0b796a85838fbc0d78b3c9116647) (1536×1536, RGBA)
- **Initial hosted output**: [16-frame GIF](https://media.pollinations.ai/7ca8bbb8-a05e-4c7c-acf4-6b9e8f4a0317), with a bug making the caption plaque transparent
- **Corrected hosted output**: [16-frame transparent GIF with fixed caption plaque](https://media.pollinations.ai/1b84b800-212a-4156-b2c7-94cdffeaf3d5)

## Measured results

| Metric | Medium baseline | High 3×3 | Native OpenAI comparison |
|---|---:|---:|---:|
| Frames | 6 | 16 | 9 |
| Resolution | 512×632 | 512×632 | 512×512 |
| GIF duration | 1.00 s | 2.67 s | 1.62 s |
| Fully transparent, first frame | 48.92% | 21.74% after caption fix | 46.78% |
| Caption mean inter-frame RGB delta | 0.00 | 0.00 | 3.69 |
| Animated loop seam / mean step | 0.62 | 1.28 | 0.81 |
| Model generation recorded in usage | $0.0442 | $0.0769 | about $0.07662 calculated from native API tokens |
| First FFmpeg export | rounding to $0.0000 | $0.0001 | not needed |
| Caption-only recompose | not applicable | $0.0003 | not needed |

The original high GIF was 3,102,996 bytes. The corrected high GIF is 3,126,077 bytes. Its opaque navy caption is confirmed at pixel (40,540) = `(6,23,53,255)` in RGBA, and background outside the figure/banner remains transparent. All 16 frames contain fully transparent pixels; the corrected first-frame transparency is 21.74%. The caption layer is pixel-stable between frames.

The 16-frame high request completed in 84.27 seconds. Recomposition from the existing sheet required 44.97 seconds. Prompt compositions differ, so motion and loop metrics do not establish subjective image quality equivalence.

## Critical distinction: quality vs complexity

Pollinations MCP `generateImage` accepts and passes `quality` (`standard|hd|low|medium|high`) and `transparent`; it does **not** accept or forward native `complexity`. The underlying image gateway likewise does not expose native `complexity` today. Our `complexity=high` therefore selects 3×3 poses, while **native model complexity remains provider-controlled**. The upstream source is [`packages/mcp/src/services/imageService.js`](https://github.com/pollinations/pollinations/blob/main/packages/mcp/src/services/imageService.js). We do not pretend that unsupported controls take effect.

## Cost optimization and privacy

To avoid rebilling an image generation for typographic corrections, pass `spritesheet_url` from the first output back into the agent with the same complexity and new captions. This uses hosted FFmpeg only and validates the media URL before invoking the tool. The corrective `drawbox:replace=1` fixes a transparent caption alpha bug found during live testing. No owner-private Pruna / ImgTools infrastructure or secrets are present in this public pipeline.
