# Agent brief: install Qwen-Image-2.1 GGUF for the user's hardware

Work with the `qwen-image-2.1-gguf` directory from
https://github.com/alesha-pro/tools, or the files supplied by the
user. Keep the repository layout, including `../qwen-image-2.1/LOW-VRAM.md`.
Read that English guide, `docs/validation.md`, `install/models.json`, and
`install/versions.json` before changing the machine.

## Objective

Set up Qwen-Image-2.1 using the **Q4_K_M** diffusion file from
`abenzerps/Qwen-Image-2.1-Uncensored-GGUF` in ComfyUI on **one GPU**. Deliver a
working UI, the supplied workflows, and a real generated PNG that you have opened
and inspected. Adapt memory settings to the actual machine. Report compatibility for the hardware you test. Account for the encoder and
inference buffers in addition to the 4.60 GB diffusion file.

## Inspect before installing

Inspect the existing ComfyUI installation and its software environment. Record
the OS and CPU, available RAM and disk space, GPU model/VRAM, and driver. On NVIDIA, inspect `nvidia-smi` processes as well as
utilization. An idle GPU with another user's model loaded is not automatically
free to take over. Select one available GPU and a free port.

The automated installer is an NVIDIA CUDA recipe. On AMD, Intel, Apple Silicon,
or older NVIDIA hardware, establish a compatible ComfyUI/PyTorch backend first.
Check support for the native Qwen 2.1 nodes AND the INT8 ConvRot text encoder.
Do not run the CUDA installer on those platforms or claim support from the GGUF
extension alone. Explain a concrete blocker if no working route is available.

Plan for 14.63 GB of model files and roughly 45 GB free disk for the setup.
32 GB RAM is a planning target, with 64 GB preferred for headroom. These are not
verified minimum hardware requirements. CPU encoding and offloading can use
considerably more RAM than the size of the stored encoder.

## Authorized scope

The installation request authorizes a separate checkout/venv, the requested
model downloads, copying workflows, and a few validation generations. Proceed
without asking for repeated approval for these actions unless the user sets
additional constraints.

Preserve uncommitted files and working environments. Do not stop unrelated
processes, use broad kill commands, change power limits, replace drivers, reboot,
modify system Python, or touch unrelated containers. Do not use paid APIs or
publish anything. If GPUs are occupied, finish independent setup work and report
the resource blocker. A delay does not grant permission to take an occupied GPU.

## Installation

Prefer adding models and workflows to an existing compatible ComfyUI when safe.
Inspect its real Python executable, node versions, and queue first. Do not
install two GGUF forks registering the same nodes, blindly upgrade dependencies,
or overwrite an existing GGUF fork. If compatibility is uncertain, use a new
isolated installation with the pinned version of `leejet/ComfyUI-GGUF`.

From `tools/qwen-image-2.1-gguf` on Linux/WSL2:

```bash
python3 install/setup.py check
python3 install/setup.py install --dir "$HOME/ComfyUI-Qwen21-GGUF"
"$HOME/ComfyUI-Qwen21-GGUF/.venv/bin/python" install/download_models.py --models-dir "$HOME/ComfyUI-Qwen21-GGUF/models"
python3 install/setup.py launch --comfy "$HOME/ComfyUI-Qwen21-GGUF" --gpu 0 --port 8188 --lowvram
```

Use the available GPU index and port, not these example values blindly. Python
3.10–3.13 is supported by the installer; 3.12 is recommended. Install missing
Git/Python/venv tools through the OS package manager with the user's permissions.
Do not redefine `$HOME` or `$CODEX_HOME`.

On Windows PowerShell:

```powershell
py -3.12 install/setup.py check
py -3.12 install/setup.py install --dir "$HOME/ComfyUI-Qwen21-GGUF"
& "$HOME/ComfyUI-Qwen21-GGUF/.venv/Scripts/python.exe" install/download_models.py --models-dir "$HOME/ComfyUI-Qwen21-GGUF/models"
py -3.12 install/setup.py launch --comfy "$HOME/ComfyUI-Qwen21-GGUF" --gpu 0 --port 8188 --lowvram
```

Windows instructions are not evidence of a Windows validation run. Do not install
unsigned drivers or change PowerShell policy. Use the actual Python executable
for portable installations; see `../qwen-image-2.1/LOW-VRAM.md`.

If reusing a compatible ComfyUI, copy only the workflows with:

```bash
python3 install/setup.py workflows --comfy /actual/path/to/ComfyUI
```

Reuse existing matching encoder/VAE files through `extra_model_paths.yaml` or
links rather than downloading duplicates. Verify size and SHA-256 against
`install/models.json`. The diffusion GGUF goes in `models/diffusion_models`,
the INT8 encoder in `models/text_encoders`, and the VAE in `models/vae`.

The launch command runs in the foreground. For background operation, use the
machine's normal process manager and record the exact service name or PID and
log path. Leave the completed setup running unless told otherwise. Use loopback
and an SSH tunnel for remote access, or the user's explicitly intended trusted
LAN address. Do not expose an unauthenticated server to the public internet.

## Memory settings and validation

Check `/system_stats`, `/object_info`, and `/queue`. Required nodes include
`UnetLoaderGGUF` and `TextEncodeQwenImage21`. Check that all three model filenames
appear in their dropdowns. Wait for other users' jobs; do not interrupt them.

On unknown or small hardware, start with workflow `07-small-512`:

```bash
"$HOME/ComfyUI-Qwen21-GGUF/.venv/bin/python" scripts/generate.py --mode small --seed 42 --timeout 3600 --out outputs
```

Use `--url http://127.0.0.1:PORT` for the chosen port. This workflow uses a CPU
text encoder, tiled VAE, batch 1, and 512 × 512. After success, run `--mode lowvram`
with a new seed at 1024 × 1024. On a GPU with headroom, test normal `--mode t2i`
with automatic encoder placement and then `--mode 2k` at 2048 × 1152.

If OOM occurs during prompt encoding, confirm CLIPLoader device `cpu` and check
system RAM. During sampling, reduce resolution and use `--lowvram`. During VAE
decoding, use the tiled node or relaunch your own server with `--cpu-vae`.
Reducing steps alone does not reduce the main per-step memory requirement.
Change one setting at a time and verify the result.

For each run, save:

- Model/runtime revisions and the exact launch command, with GPU/CPU details.
- The output PNG together with its prompt and seed, dimensions and step count.
- `/history/{prompt_id}` with `status_str=success` and elapsed time.
- Observed GPU memory and process RAM, including how they were measured.

Open the saved PNG, decode it, verify dimensions, and assess the requested scene.
For RGBA, check real varying alpha. For edits, verify that the requested change
happened and preserved details remain. Edit mode requires `--image`; 2-reference
mode also requires `--reference`. Do not advertise a workflow as validated until
it has actually generated a valid result.

The generator saves request/history/result files. After a timeout, inspect the
existing prompt ID before resubmitting. Identical graphs may be cached; change
the seed for a fresh timed run.

Artificial `--reserve-vram` tests on a large GPU can help evaluate offloading,
but are not equivalent to testing a smaller physical GPU. Report actual measured
usage and do not turn a successful 24 GB run into an unsupported 6 GB claim.

## Deliver to the user

Provide the working URL, launch/restart instructions, exact GPU and service,
model paths, all seven UI workflows, output paths, measured timing and memory,
and any modes/platforms not tested. Explain prompt, dimensions, steps, and
KSampler seed controls (`randomize` versus `fixed`). Keep the API JSONs separate
from the UI import files.

Describe GGUF as weight quantization with memory/quality/speed tradeoffs.
Do not claim this repository is a distinct uncensored fine-tune; the publisher
identifies it as a quantization of the original base weights. This task does not
include installing a prompt-enhancer LLM or additional adapters.
