# Validation and memory use

Validation date: 2026-09-21. Tests used one physical RTX 3090 with 24 GiB VRAM
on Linux, an AMD EPYC 7642 CPU, and 125 GiB system RAM. The observed GPU power
limit was 290 W. Other services were left running on their own resources.

This is an installation/compatibility test, not a comparison between GPUs or a
quality benchmark. Each listed run generated a real PNG through the ComfyUI API.
Each request graph was saved with its history and seed, along with the timings. Images were decoded,
checked for dimensions, and opened for visual review.

## Results

See [validation-results.json](validation-results.json) for the exact settings
and software versions. It also records timings and hashes of the models and images.

| Test | Size | Steps | Server seconds | Peak process VRAM (GiB) | Peak process RSS (GiB) |
|---|---|---:|---:|---:|---:|
| t2i | 1024 × 1024 | 40 | 60.35 | 15.39 | 9.92 |
| 2k | 2048 × 1152 | 50 | 153.31 | 16.83 | 2.39 |
| edit | 1024 × 1024 | 40 | 66.17 | 17.15 | 2.39 |
| references | 1024 × 1024 | 40 | 79.03 | 15.52 | 6.47 |
| rgba | 1024 × 1024 | 40 | 54.75 | 15.46 | 2.44 |
| small | 512 × 512 | 40 | 111.75 | 5.55 | 11.73 |
| lowvram | 1024 × 1024 | 40 | 145.90 | 6.14 | 9.08 |
| budget4-small | 512 × 512 | 40 | 195.28 | 3.05 | 15.21 |

The first five tests use automatic text-encoder placement. They ran sequentially
in the same server, so loaded models and allocator caches carry over. Their
memory figures describe the observed process state, not the minimum required
for each mode. T2I was cold; the 2K test reused text encoding, while editing and
RGBA changed inputs/prompts.

The CPU-encoder tests ran after restarting the server. `small` was cold;
`lowvram` used a different prompt so CPU encoding ran again. CPU thread counts
were limited to 16 with `OMP_NUM_THREADS=16` and `MKL_NUM_THREADS=16`.

## Measurement method

VRAM is the server PID's allocation reported by `nvidia-smi`. RSS comes from
`/proc/PID/status`. Both were sampled approximately every 0.5–0.7 seconds, so brief
peaks can be missed. Figures include the server's CUDA context and allocator
cache. They exclude other processes, display memory, and the OS.

A 24 GiB GPU was used for every run. For `small` and `lowvram`, ComfyUI was started
with `--reserve-vram 16`, leaving roughly an 8 GiB scheduling budget. This flag
influences model placement; it is not a hard CUDA allocation limit. The measured
VRAM peak is therefore more informative than the requested reserve.

The `budget4-small` run used a fresh server with `--reserve-vram 20`,
`--cpu-vae`, and `--fp32-text-enc`. Logs showed about 2186 MiB of diffusion
weights loaded on GPU and 2301 MiB offloaded. Its observed 3.05 GiB process peak
was below 4 GiB, and the resulting 512 × 512 PNG passed inspection. It still
ran on a 24 GiB GPU, without a hard allocator cap.

This does **not** replace testing on an actual 8 GiB card. Architecture, drivers,
display usage, allocator behavior, and prompt/reference length can change the
result. Leave additional headroom. System RAM was not capped; the report does
not establish a 16 GB or 32 GB RAM minimum.

## Reproducing the profiles

From the package directory, substitute your actual ComfyUI path and GPU index.
Each command launches a separate profile; stop only your own idle server before
changing profiles. Do not run these commands together on the same port.

Standard profile used for the first five tests:

```bash
python3 install/setup.py launch --comfy /actual/ComfyUI --gpu 0 --port 8188
```

CPU encoder with tiled VAE:

```bash
python3 install/setup.py launch --comfy /actual/ComfyUI --gpu 0 --port 8188 --lowvram --cpu-threads 16
```

Use workflow 06 or 07, or API modes `lowvram` / `small`. For the artificial
8 GiB budget on a **24 GiB** card, the test also added `--reserve-vram 16`.
Do not copy that reserve onto an actual 8 GiB card. The default reserve is 1 GiB.

More aggressive CPU offloading:

```bash
python3 install/setup.py launch --comfy /actual/ComfyUI --gpu 0 --port 8188 --lowvram --cpu-vae --fp32-text-enc --cpu-threads 16
```

Use workflow 07 first. `--fp32-text-enc` changes the encoder compute dtype;
it does not download different weights. CPU performance depends on the processor,
thread count, and dtype, and may require tuning. This guide does not claim that
CPU text encoding has zero latency cost.

## Verified behavior

- A new checkout and venv created with the shipped installer, with the pinned
  ComfyUI and GGUF-node revisions.
- Q4_K_M downloaded from the pinned repository revision and verified by SHA-256.
  Existing matching encoder/VAE files were reused and hash-checked.
- T2I at 1024 square and native 2048 × 1152.
- One-image editing: red teapot changed to cobalt blue, composition retained.
- Two-reference editing: the blue swatch guided the teapot color.
- RGBA output with alpha spanning 0–255 (corner alpha 0, center alpha 254).
  Generated matte edges still need
  review before using the asset in a final design.
- CPU text encoding and tiled VAE through the low-memory workflows.
- Seven UI/API workflow pairs checked for widget/link parity and edit routing.
  The workflow sidebar displayed all seven, and the low-VRAM graph opened without
  a missing-node dialog. Runtime generations were submitted through the API.

## Limits

No physical 4/6/8/12/16 GiB GPU, RAM-constrained host, Windows/WSL installation,
AMD/Intel/Apple backend, or CPU-only setup was tested. Q4_0, Q5_K_M, Q6_K, and Q8_0
were not generated with. No LoRA or prompt-enhancer integration was tested.
There is no systematic quality comparison against BF16 or INT8, and no independent
claim about the repository's “Uncensored” label.

The tighter profile used the same 16-thread CPU settings. Its 195.28-second
server time includes CPU encoding, sampling with weight offloading, and CPU VAE
decoding. No claim of FP32 encoding being faster follows from this test.

The pip fallback and a fresh download of companion weights were not exercised:
installation used uv and existing verified companion files. All displayed timing
figures are server execution times, which may include model loading and reference
encoding; they are not sampling-only measurements or universal speed estimates.
