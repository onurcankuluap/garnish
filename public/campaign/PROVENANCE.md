# Campaign imagery: provenance

Every file in this folder is **AI-generated campaign imagery**. None of it is a photograph of a Garnish event, venue, guest, drink served by Garnish, or the owner. On the site each image is labelled "Campaign image · AI-generated" in its caption and alt text, and it must never be presented as documentary photography.

| Files | Derived from | Notes |
|---|---|---|
| `hero-d-{828,1170,1600,2560}.{avif,webp}` | `hero-a2.png` (OpenArt, Nano Banana Pro, text-to-image) | Desktop hero and Plate I. One crop (x 0.30–1.0, full height, aspect 1.25417). |
| `hero-m-{828,1170}.{avif,webp}` | `hero-b-portrait.png` (OpenArt, Nano Banana Pro, image-to-image from hero-a2) | Mobile hero (x 0.08–0.92). |
| `plate-m-{828,1170}.{avif,webp}` | `hero-b-portrait.png` | Mobile Plate I, a tighter crop (rim, cube, peel). |
| `smoke-d-1600.*`, `smoke-m-828.*` | the two stills above | Smoke-only luminance mattes, cut locally (no generation), registered to the hero crops. |

- Generated 2026-10-10. Crops, mattes and encodes are produced locally by `docs/redesign-concepts/motion/tools/make-assets.cjs campaign` (sharp; no further generation or paid calls).
- **Full record** (models, prompts, job ids, credits and cost): `docs/redesign-concepts/generated/PROVENANCE.md` in the working copy (not committed on this branch).
- **Before launch:** confirm OpenArt's commercial-use terms for these outputs (owner action), or replace them with a real shoot. Real Garnish event photographs go in the "Evenings" section, which holds marked placeholders until the owner supplies them.
