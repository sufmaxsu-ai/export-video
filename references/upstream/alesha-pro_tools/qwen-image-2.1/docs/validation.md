# Validation record: 2026-09-21

The installer was exercised in a **new ComfyUI checkout and new virtual
environment**, separate from the existing working server. It used Python
3.10.12 on Linux x86_64 and `uv` as the package installer. Five supplied API
workflows completed on **one physical RTX 3090 24 GB** exposed to the process.
The host has 128 GB RAM. Observed GPU power limit was 290 W; driver 610.43.02.
No power settings or drivers were changed for this test.

## Versions

| Component | Actual version |
|---|---|
| ComfyUI | `0f74f7fb9f83a78bf46188fd4fd53e6bc44c1ae8` |
| Python | 3.10.12 |
| Torch | 2.11.0+cu130 |
| torchvision | 0.26.0+cu130 |
| torchaudio | 2.11.0+cu130 |
| transformers | 5.17.0 |
| Frontend | 1.53.6 |
| comfy-kitchen | 0.2.35 |
| comfy-aimdo | 0.5.5 |
| Pillow | 12.3.0 |
| huggingface-hub | 1.32.0 |

The official INT8 ConvRot diffusion model and text encoder and BF16 VAE were
reused through `extra_model_paths.yaml`. All three were read and SHA-256 checked
against the pinned [manifest](../install/models.json). This test did **not**
redownload a second complete copy of the 17.28 GB weights. Fresh model downloads,
network failure recovery and every Windows dependency are not claimed as
independently tested by these five image runs.

## Completed jobs

All use Euler, simple, CFG 1, denoise 1 and batch 1. Times below are differences
between ComfyUI's execution_start and execution_success timestamps, including
encoding, sampling, decoding and saving. They are not sampling-only measurements.

| Mode | Resolution | Steps | Seed | Server seconds |
|---|---|---:|---:|---:|
| Text to image | 1024 × 1024 | 40 | 9183701 | 37.581 |
| Text to image, wide 2K | 2048 × 1152 | 50 | 9183702 | 84.295 |
| One-reference edit | 1024 × 1024 | 40 | 9183703 | 37.106 |
| RGBA | 1024 × 1024 | 40 | 9183704 | 21.823 |
| Two-reference edit | 1024 × 1024 | 40 | 9183705 | 44.554 |

Machine-readable results with image hashes are in
[validation-results.json](validation-results.json). Runs were sequential in this
order; model/cache warmth differs, so the table is an acceptance record, not a
controlled comparison of modes or Torch versions.

Checks performed:

- Installation from a separate fresh checkout and venv using the supplied script.
- CUDA available and exactly one GPU exposed in `/system_stats`.
- All three existing weight files matched their SHA-256 and size.
- All five API graphs returned success; saved PNGs decoded and had expected sizes.
- Generated T2I, edits and RGBA examples visually inspected. The single edit
  changed the teapot to dark blue; the two-reference edit used the blue swatch
  while retaining the scene. This is a visual check, not pixel identity proof.
- RGBA alpha range was 0–255; compositing on white showed the isolated teapot.
  The untouched model output can contain small residual alpha values near the
  background; it was not manually cut out or cleaned.
- UI workflows were listed in the clean ComfyUI sidebar. T2I and two-reference
  graphs opened on the canvas without a missing-node dialog. T2I seed, randomize,
  steps and dimensions were visible. Generation tests used the API, not a claim
  that every graph was separately submitted through the Run button.
- `check_workflows.py` passed for all five UI/API pairs: node IDs, socket links,
  widget values, output sizes and edit latent routing.

## Limits and a caught installation issue

An initial candidate omitted torchaudio while pinning a newer Torch version.
A startup test failed because ComfyUI imports audio VAE code even in an image
session. That candidate was discarded. The final installer uses the matching
Torch/torchvision/torchaudio trio listed above and was installed into another new
checkout/venv before these successful tests.

Native Windows, WSL2, 16 GB GPUs, 32 GB host RAM, Apple/AMD/Intel backends and
alternative CUDA indexes have not been validated here. They must not be inferred
from the Linux RTX 3090 result. The pip fallback follows the same version pins
but the clean test used uv. Other unpinned dependencies may change in a future
installation; rerun the image acceptance tests rather than assuming compatibility.
