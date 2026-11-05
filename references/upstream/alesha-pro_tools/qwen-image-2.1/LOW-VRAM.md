# Qwen-Image-2.1 on low-VRAM GPUs

This is the low-VRAM companion to the [main installation guide](README.md).
Supporting files live in [`../qwen-image-2.1-gguf/`](../qwen-image-2.1-gguf/).
All commands and inline file paths below are relative to `tools/qwen-image-2.1-gguf`,
unless a command explicitly changes directories.
Run the **Q4_K_M diffusion model** from
[abenzerps/Qwen-Image-2.1-Uncensored-GGUF](https://huggingface.co/abenzerps/Qwen-Image-2.1-Uncensored-GGUF)
in ComfyUI. This package includes an isolated installer, pinned model downloads,
7 UI workflows with matching API graphs, and a generation script that saves and
checks the output PNG.

[Russian translation](../qwen-image-2.1-gguf/README.ru.md) · [Give this file to an agent](../qwen-image-2.1-gguf/INSTALL-WITH-AGENT.md) · [Memory and validation](../qwen-image-2.1-gguf/docs/validation.md)

The GGUF file is **4.60 GB**, but that is not the total VRAM requirement. The text
encoder, VAE, intermediate tensors, and CUDA runtime also need memory. Use the
CPU-encoder workflows when VRAM is limited. They trade GPU memory for system RAM
and longer prompt encoding.

This is a separate setup from the [native INT8 guide](README.md).
GGUF reduces diffusion-weight storage; it does not automatically improve speed
or preserve identical image quality.

Measured 1024 × 1024 generation used **6.14 GiB of process VRAM** with the CPU
encoder and tiled VAE. This was an offloading test on a larger GPU, not a test
of every 8 GB card. Details and timings are in the validation report.

## Files and memory

| Component | Filename | Download size |
|---|---|---:|
| Diffusion model | `qwen-image-2.1-Q4_K_M.gguf` | 4.60 GB |
| Text encoder | `qwen3vl_8b_int8_convrot.safetensors` | 9.35 GB |
| VAE | `qwen_image_2.1_vae_bf16.safetensors` | 0.68 GB |
| Total | All 3 files | 14.63 GB |

Sizes are decimal GB. The diffusion file is about 4.29 GiB. A file's size does
not include inference buffers or tell you the minimum GPU size.

Plan for **45 GB free disk** for weights, Python packages, caches, and initial
outputs. **32 GB system RAM is a planning target; 64 GB leaves more headroom**,
especially with CPU text encoding. These are capacity recommendations, not tests
on machines with those RAM limits. See the measured results and limitations in
[validation.md](../qwen-image-2.1-gguf/docs/validation.md).

Use this starting sequence for an unfamiliar GPU:

1. Try workflow `07-small-512` with a CPU text encoder and tiled VAE at 512 × 512.
2. If it completes, try `06-low-vram` at 1024 × 1024.
3. If memory is comfortable, try the normal workflows with encoder device `default`.
4. Try native 2048 × 1152 only after the smaller test succeeds.

### Starting profile by VRAM

These are starting recommendations inferred from the measured profiles. Small
physical cards have not been tested; available RAM and backend support matter.

| GPU VRAM | Start here |
|---|---|
| 4 GB | Experimental: workflow 07, CPU encoder and CPU VAE, `--lowvram` |
| 6 GB | Workflow 07; move VAE to CPU if tiled decoding still OOMs |
| 8–12 GB | Workflow 06 at 1024 square, CPU encoder and tiled VAE |
| 16 GB | Start with 06; try 01 if available VRAM allows GPU encoding |
| 24 GB | Normal workflows 01–05; 2K was validated at this capacity |

The tightest tested offloading profile produced 512 × 512 at **3.05 GiB VRAM**
and **15.21 GiB process RAM**, taking 195 seconds. It used a 24 GiB GPU with a
4 GiB placement budget, so this is evidence for trying a 4 GB setup, not a promise
for every 4 GB card. A 16 GB host would have little room left for the OS in this
profile; use the RAM planning guidance above.

For the aggressive profile, launch with:

```bash
python3 install/setup.py launch --comfy "$HOME/ComfyUI-Qwen21-GGUF" --gpu 0 --port 8188 --lowvram --cpu-vae --fp32-text-enc --cpu-threads 16
```

Use workflow 07. Adjust CPU threads to your processor. **Do not copy the test's
16/20 GiB reserve flags onto a small card.** They only simulated a smaller budget
on the 24 GiB test GPU. The launcher normally reserves 1 GiB.

The installer below targets NVIDIA CUDA on Linux/WSL2 or Windows. Older NVIDIA
architectures, AMD, Intel, Apple Silicon, and CPU-only execution need a compatible
ComfyUI/PyTorch installation of their own. GGUF support alone does not establish
support for the INT8 ConvRot text encoder on those backends. This package does
not promise that every card will work.

## Model provenance

The publisher describes this as a quantization of the original upstream base
weights. We have not verified a separate fine-tune or an independently modified
safety mechanism. Treat “Uncensored” as the repository name, not a measured
capability of this guide. The model carries the Qwen Research License; check the
[model repository](https://huggingface.co/abenzerps/Qwen-Image-2.1-Uncensored-GGUF)
for its terms.

## New installation

Install Git and Python 3.10–3.13; Python 3.12 is recommended. On Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y git python3 python3-venv
```

Install a compatible NVIDIA driver using your OS instructions. Check `nvidia-smi`
before proceeding. Do not replace a working driver just to follow this guide.

```bash
git clone https://github.com/alesha-pro/tools.git
cd tools/qwen-image-2.1-gguf
python3 install/setup.py check
python3 install/setup.py install --dir "$HOME/ComfyUI-Qwen21-GGUF"
"$HOME/ComfyUI-Qwen21-GGUF/.venv/bin/python" install/download_models.py --models-dir "$HOME/ComfyUI-Qwen21-GGUF/models"
python3 install/setup.py launch --comfy "$HOME/ComfyUI-Qwen21-GGUF" --gpu 0 --port 8188 --lowvram
```

Open **http://127.0.0.1:8188**. Keep the launch terminal open. The last command
runs in the foreground. Choose the physical GPU index shown by `nvidia-smi`.
The launcher exposes exactly that GPU to the process.

The installer pins ComfyUI, the [leejet GGUF node](https://github.com/leejet/ComfyUI-GGUF),
and key Python packages in [versions.json](../qwen-image-2.1-gguf/install/versions.json). It creates a
separate venv and refuses to modify an unrelated existing checkout. `uv` is used
when available; otherwise it uses pip. It does not download weights until you
run `download_models.py`.

### Windows PowerShell

Install Git, Python 3.12, and a compatible NVIDIA driver, then:

```powershell
git clone https://github.com/alesha-pro/tools.git
cd tools/qwen-image-2.1-gguf
py -3.12 install/setup.py check
py -3.12 install/setup.py install --dir "$HOME/ComfyUI-Qwen21-GGUF"
& "$HOME/ComfyUI-Qwen21-GGUF/.venv/Scripts/python.exe" install/download_models.py --models-dir "$HOME/ComfyUI-Qwen21-GGUF/models"
py -3.12 install/setup.py launch --comfy "$HOME/ComfyUI-Qwen21-GGUF" --gpu 0 --port 8188 --lowvram
```

Windows/WSL commands are provided but were not validated on those platforms.
Do not run the Linux CUDA installer directly on macOS.

### Existing ComfyUI or Windows portable

Check for `TextEncodeQwenImage21` and `UnetLoaderGGUF` in `/object_info` before
changing anything. Keep a working GGUF fork if it supports this exact model;
do not install two forks registering the same nodes. The validated fork and
commit are listed in `install/versions.json`.

For an installation with no GGUF node yet, run these commands from its root.
Use its actual Python environment:

```bash
git clone https://github.com/leejet/ComfyUI-GGUF.git custom_nodes/ComfyUI-GGUF
git -C custom_nodes/ComfyUI-GGUF checkout f912d5e5c25921e41eae2c0131eeb4d350e7c165
.venv/bin/python -m pip install gguf==0.18.0 sentencepiece protobuf
```

If the venv was created by uv and has no pip, use
`uv pip install --python .venv/bin/python gguf==0.18.0 sentencepiece protobuf`.
For Windows portable, run package installation from the portable root with:

```powershell
.\python_embeded\python.exe -s -m pip install gguf==0.18.0 sentencepiece protobuf
```

The node belongs in `ComfyUI/custom_nodes/ComfyUI-GGUF` inside the portable root.
Do not update all ComfyUI dependencies blindly. Add models in the directories
below, then restart when the queue is idle. From `tools/qwen-image-2.1-gguf`, copy UI
workflows with:

```bash
python3 install/setup.py workflows --comfy /actual/path/to/ComfyUI
```

If an older installation lacks the native Qwen 2.1 node, update it through its
normal mechanism or use the isolated installation instead.

## Model placement

```text
ComfyUI/
  models/
    diffusion_models/qwen-image-2.1-Q4_K_M.gguf
    text_encoders/qwen3vl_8b_int8_convrot.safetensors
    vae/qwen_image_2.1_vae_bf16.safetensors
```

The downloader verifies file sizes and SHA-256 hashes from
[models.json](../qwen-image-2.1-gguf/install/models.json). It resumes downloads through Hugging Face
and refuses to overwrite an existing file with a different checksum.

The encoder and VAE have the same hashes as the official files used in the INT8
guide. Reuse them if you have them. `extra_model_paths.yaml` can point to an
existing model directory without copying large files:

```yaml
qwen21_shared:
  base_path: /your/model/storage
  diffusion_models: diffusion_models
  text_encoders: text_encoders
  vae: vae
```

Restart after changing model path configuration. Never replace the text encoder
with a diffusion GGUF file; they perform different jobs. The standard CLIPLoader
still loads the INT8 safetensors encoder.

## Workflows and controls

Open the workflow sidebar, then `qwen-image-2.1-gguf`, or drag a UI JSON from
`workflows/` into the canvas. Files under `workflows/api/` are for API submission.

| Workflow | Purpose |
|---|---|
| `01-text-to-image` | 1024 × 1024, 40 steps, automatic encoder placement |
| `02-text-to-image-2k` | Native 2048 × 1152, 50 steps |
| `03-image-edit` | Edit one uploaded image |
| `04-transparent-rgba` | Generate a PNG with alpha |
| `05-two-reference-edit` | Edit using 2 reference images |
| `06-low-vram` | 1024 × 1024, CPU encoder, tiled VAE |
| `07-small-512` | 512 × 512 compatibility test, CPU encoder, tiled VAE |

Change the text in `TextEncodeQwenImage21`. For T2I, set width and height in
`EmptyLatentImage`. KSampler defaults to Euler/simple, CFG 1, denoise 1, batch 1.
Its seed behavior is `randomize`; select `fixed` to reproduce a seed. An identical
cached graph is not a fresh timed generation.

For editing, upload your image and describe what should change and what should
stay. The latent output of `TextEncodeQwenImage21` goes to KSampler; its resolution
sets the reference pixel budget while preserving the first image's aspect ratio.
Use `<image1>` and `<image2>` to identify references. Editing consumes additional
memory; first establish that plain T2I works on your hardware.

In the low-memory presets, the text encoder stays on CPU and the VAE decodes in
256-pixel tiles. If you still run out of VRAM, use `--lowvram`, reduce resolution,
or add `--cpu-vae` to the launch command. CPU work can be much slower. Reducing
steps mainly saves time; it does not solve a large per-step memory allocation.

## Generate through the API

From `tools/qwen-image-2.1-gguf`, using the installed environment:

```bash
"$HOME/ComfyUI-Qwen21-GGUF/.venv/bin/python" scripts/generate.py --mode small --seed 42 --out outputs
"$HOME/ComfyUI-Qwen21-GGUF/.venv/bin/python" scripts/generate.py --mode lowvram --seed 43 --out outputs
```

For a GPU with more headroom:

```bash
"$HOME/ComfyUI-Qwen21-GGUF/.venv/bin/python" scripts/generate.py --mode t2i --seed 44 --out outputs
"$HOME/ComfyUI-Qwen21-GGUF/.venv/bin/python" scripts/generate.py --mode 2k --seed 45 --out outputs
```

Use `--prompt-file prompt.txt` for your own prompt, `--url` for another server,
and `--timeout 3600` when CPU encoding takes longer. Edit mode requires
`--image /actual/path/image.png`; `references` also requires `--reference`.
The script checks an idle queue, submits `/prompt`, polls `/history/{prompt_id}`,
downloads through `/view`, and verifies PNG decoding and dimensions. It saves
the submitted graph, seed, history, timings, and image together. Open the PNG
and inspect it yourself; HTTP success cannot judge image quality.

## Troubleshooting

- **Unknown architecture:** check the GGUF fork and commit. Editing `tools/convert.py`
  alone is not a reliable runtime repair. Use the tested node version.
- **Missing model:** check paths and filenames, restart after configuration changes,
  and verify SHA-256. The GGUF loader must replace `UNETLoader`.
- **OOM during prompt encoding:** select CLIPLoader device `cpu`; watch system RAM.
- **OOM during sampling:** reduce resolution/batch and use `--lowvram`.
- **OOM during decoding:** use tiled VAE or `--cpu-vae`.
- **CUDA/driver error:** check the selected Python and compatible Torch wheel.
  Do not assume every NVIDIA generation supports the pinned CUDA build.
- **Q8_0:** the publisher currently reports a scale/tensor-shape issue. This guide
  validates Q4_K_M only; other files are not interchangeable test results.
- **Client timeout:** inspect the existing prompt ID before retrying. The server
  may still be working; do not submit duplicate jobs or kill unrelated processes.

For remote access, keep the server on loopback and use an SSH tunnel:

```bash
ssh -N -L 8188:127.0.0.1:8188 user@server
```

If the local port is occupied, change the first port and open that local URL.
Do not expose an unauthenticated ComfyUI instance to the public internet.

## Example outputs

[Original validation PNGs](../qwen-image-2.1-gguf/examples/README.md) include the red teapot, edits,
and transparent output.

![Q4_K_M text-to-image result](../qwen-image-2.1-gguf/examples/qwen21-example.png)

## Sources and scope

- [Requested GGUF repository](https://huggingface.co/abenzerps/Qwen-Image-2.1-Uncensored-GGUF)
- [Validated GGUF loader source](https://github.com/leejet/ComfyUI-GGUF/tree/f912d5e5c25921e41eae2c0131eeb4d350e7c165)
- [ComfyUI Qwen 2.1 documentation](https://docs.comfy.org/tutorials/image/qwen/qwen-image-2-1)
- [Original INT8 installation](README.md)

Model, loader, and runtime revisions are pinned so this recipe can be reproduced.
Measured compatibility applies to the configuration in the validation report.
