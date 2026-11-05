# GGUF workflows

Import the JSON files in this directory into the ComfyUI UI. The corresponding
`api/` files are prompt graphs for `POST /prompt`, not canvas files.

The only extra node package is the pinned `leejet/ComfyUI-GGUF`. Native ComfyUI
provides the Qwen 2.1 text/reference encoder, cache, sampler, VAE, and image nodes.
The diffusion loader is `UnetLoaderGGUF`; the text encoder uses `CLIPLoader`
with `type=qwen_image` and the INT8 ConvRot safetensors file.

| File | Default settings |
|---|---|
| `01-text-to-image.json` | 1024 square, 40 steps, encoder device default |
| `02-text-to-image-2k.json` | 2048 × 1152, 50 steps, encoder device default |
| `03-image-edit.json` | 1 reference, resolution 1024, 40 steps |
| `04-transparent-rgba.json` | 1024 square, 40 steps, transparency prompt |
| `05-two-reference-edit.json` | 2 references, resolution 1024, 40 steps |
| `06-low-vram.json` | 1024 square, 40 steps, CPU encoder, tiled VAE |
| `07-small-512.json` | 512 square, 40 steps, CPU encoder, tiled VAE |

Every preset uses Euler/simple, CFG 1, denoise 1, and batch 1. Seed control starts
at `randomize`; set it to `fixed` for repeatability. A seed does not guarantee
identical pixels across quantizations or different software/hardware.

For low VRAM, start with 07 and a `--lowvram` server. The text encoder consumes
system RAM and CPU time. Tiled decoding lowers VAE memory but does not reduce
the diffusion model's sampling buffers. If needed, add `--cpu-vae` at launch.
The normal 01–05 presets do not impose a low-memory policy automatically.

For image editing, the Qwen encoder's latent output connects to KSampler.
`resolution` controls area while retaining the first image's aspect ratio.
Upload your own reference images; `<image1>` and `<image2>` identify the inputs.
The packaged teapot and blue swatch are simple test inputs.

`build_workflows.py` generates both formats; `check_workflows.py` verifies
widget values, links, dimensions, and edit routing. Actual runtime validation is
recorded in [validation.md](../docs/validation.md).
