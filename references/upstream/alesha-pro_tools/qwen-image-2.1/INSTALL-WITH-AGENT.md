# Agent brief: install Qwen-Image-2.1 on one GPU

Give this entire file to your agent. It should work with the `qwen-image-2.1`
folder from https://github.com/alesha-pro/tools or an attached copy of that folder.
The accompanying README files, scripts, install files, and workflows are part of
this package.

## Task and deliverables

Install local Qwen-Image-2.1 in ComfyUI on **one GPU**. Set up text-to-image
generation, image editing, transparent PNG output, and the supplied workflows.
Complete the task with a real generated image, not just an installed environment.

Read `README.md`, `install/versions.json`, and `install/models.json`, then inspect
the actual machine. If the user already has a working ComfyUI installation,
first try adding the models and workflows to it. Do not blindly update its Python
dependencies. A separate new installation is the second option.

When finished, report the working URL, launch commands, workflow and output paths,
selected GPU, versions, measured test time, and validation limitations. Open the
resulting PNG and check that it matches the prompt. Leave the server running
unless the user asks you to stop it.

## Authorized actions

The request to install this model authorizes creating a separate checkout/venv,
downloading the three official weight files totaling 17.28 GB, copying workflows,
and running a few validation generations. Do not ask for repeated permission for
these routine actions unless the user has set other constraints.

Do not publish anything externally or use paid APIs. Do not automatically change
power limits, drivers, system Python, or other people's containers. Do not stop
other people's GPU processes. Do not run `pkill python`, `killall`, or reboot the
machine. If every GPU is occupied by other work, prepare the installation without
generating images and explain the specific blocker. Elapsed time does not grant
permission to use an occupied GPU.

## 1. Inspect the machine

Identify the OS, CPU architecture, Python, Git, free disk space, RAM, GPUs, and
driver. On NVIDIA, run `nvidia-smi` and inspect processes and allocated memory as
well as utilization. Select one GPU. Check whether port 8188 is already in use.

The validated configuration is an NVIDIA RTX 3090 with 24 GB VRAM on Linux.
Recommended resources are 64 GB RAM and 45 GB free disk space. Offloading may work
with 16 GB VRAM, but that configuration has not been validated here; start at
1 MP and do not promise 2K until tested. Do not run this CUDA installer on
AMD, Intel, or Mac hardware. Use the official instructions for that platform and
verify model support separately. If no suitable installation path exists, say so.

The repository may contain other people's uncommitted changes. Do not reset or
overwrite them. If `qwen-image-2.1` is not yet present in the public checkout,
use the folder supplied by the user; do not substitute a similarly named
third-party package.

## 2. Install

Run the commands below from `tools/qwen-image-2.1`.

### Linux / WSL2

On Ubuntu/Debian, install `git`, `python3`, and `python3-venv` if missing. Use the
normal system package manager and respect the user's permissions. Python
3.10–3.13 is required; 3.12 is recommended.

```bash
python3 install/setup.py check
python3 install/setup.py install --dir "$HOME/ComfyUI-Qwen21"
"$HOME/ComfyUI-Qwen21/.venv/bin/python" install/download_models.py --models-dir "$HOME/ComfyUI-Qwen21/models"
python3 install/setup.py launch --comfy "$HOME/ComfyUI-Qwen21" --gpu 0 --port 8188
```

Do not change `$HOME` or `$CODEX_HOME`. You may choose a different new installation
directory. The installer uses `uv` when available, otherwise venv/pip. The server
runs in the foreground. For a background launch, use the environment's normal
process manager and save the log and exact PID or name of the service you create.

### Windows PowerShell

```powershell
py -3.12 install/setup.py check
py -3.12 install/setup.py install --dir "$HOME/ComfyUI-Qwen21"
& "$HOME/ComfyUI-Qwen21/.venv/Scripts/python.exe" install/download_models.py --models-dir "$HOME/ComfyUI-Qwen21/models"
py -3.12 install/setup.py launch --comfy "$HOME/ComfyUI-Qwen21" --gpu 0 --port 8188
```

These Windows commands are provided, but have not been validated on Windows.
Do not install unsigned drivers or change the system PowerShell execution policy.
Running Python by its full path does not require an activation script.

### Existing ComfyUI installation

Find its actual Python executable and `main.py`. Check for `TextEncodeQwenImage21`
through `GET /object_info` or the source code. If an update is necessary, use that
installation's normal update mechanism and account for active jobs. Copy the
workflows with:

```bash
python3 install/setup.py workflows --comfy /actual/path/to/ComfyUI
```

Replace the example path with the actual path. The dependency installer is not
needed here. Download models into `models/`, or connect them through
`extra_model_paths.yaml` if they already exist in central storage. Verify the
SHA-256 checksums in `install/models.json`. Do not create another 17 GB copy
unnecessarily.

## 3. Use the correct weights and one GPU

All three files come from `Comfy-Org/Qwen-Image-2.1`:

- `models/diffusion_models/qwen_image_2.1_int8_convrot.safetensors`
- `models/text_encoders/qwen3vl_8b_int8_convrot.safetensors`
- `models/vae/qwen_image_2.1_vae_bf16.safetensors`

`CLIPLoader`: type `qwen_image`, device `default`.
`UNETLoader`: weight_dtype `default`.

`setup.py launch --gpu N` sets `CUDA_VISIBLE_DEVICES=N`, so the process uses one
physical GPU. Do not launch multiple GPU workers for this guide. Inside the
ComfyUI process, the selected GPU is called `cuda:0`.

Listen on `127.0.0.1` by default. For a remote machine, use an SSH tunnel.
Do not expose ComfyUI to the public internet. Example tunnel from the local
computer:

```bash
ssh -N -L 8188:127.0.0.1:8188 user@server
```

Substitute the SSH address supplied by the user. If local port 8188 is occupied,
use `-L 8189:127.0.0.1:8188` and open `http://127.0.0.1:8189`.

## 4. Validate the installation

First check `GET /system_stats`, `GET /object_info`, and `GET /queue`.
The required nodes and model names must be present. Before testing, make sure the
queue has no active jobs belonging to others. Do not interrupt those jobs.

Use Python from the environment you created. Linux example:

```bash
"$HOME/ComfyUI-Qwen21/.venv/bin/python" scripts/generate.py --mode t2i --seed 42 --out outputs
"$HOME/ComfyUI-Qwen21/.venv/bin/python" scripts/generate.py --mode rgba --seed 43 --out outputs
```

Pass `--url http://127.0.0.1:PORT` if you selected a different port.
After T2I, locate the PNG that was actually saved and pass it to edit mode:

```bash
"$HOME/ComfyUI-Qwen21/.venv/bin/python" scripts/generate.py --mode edit --image /actual/path/to/generated.png --seed 44 --out outputs
```

The path is an example; replace it with the actual output path. Once 1 MP works,
try `--mode 2k` with a new seed. For two references, use
`--mode references --image ... --reference ...`.

For every test:

1. Wait for `status_str=success` in `/history/{prompt_id}`.
2. Check the actual file, its dimensions, and successful PNG decoding.
3. Open the image and assess whether it matches the request.
4. For RGBA, verify a real alpha channel, not a painted checkerboard background.
5. Save the seed, API graph, versions, timings, and limitations.

The script saves the graph, submission, history, and result in a separate run
folder. A server job may keep running after a client timeout: check its prompt_id
before submitting a duplicate. An identical graph may be served from cache, so
use a new seed when measuring generation time.

Do not call the installation fully validated based only on HTTP 200 or valid
JSON. If 2K does not fit, leave a working 1 MP workflow and report the limit
explicitly. Do not present an upscale as native 2K generation.

## 5. Deliver the workflows and explain the controls

Provide the five UI JSON files from `workflows/`; do not confuse them with the
files in `workflows/api/`. Explain where to change the prompt, width/height,
seed, and steps. KSampler has `control_after_generate=randomize`; select `fixed`
to repeat a seed.

Starting settings: Euler/simple, CFG 1, denoise 1, batch 1, and 40 steps at 1 MP.
The wide 2K workflow uses 2048 × 1152 and 50 steps. That is 2.36 MP, compared with
4.19 MP for 2048 × 2048. Do not describe them as the same workload.

For editing, load an image and specify what to change and what to preserve.
The output latent comes from TextEncodeQwenImage21; resolution sets the image
area while preserving the first reference's aspect ratio. Address two images
with `<image1>` and `<image2>`.

A prompt enhancer is optional and is not included in this installation. Do not
present PE-I2I as PE-T2I. Do not add another LLM to the same GPU before the basic
validation succeeds.

## 6. Common problems

- Missing `TextEncodeQwenImage21`: outdated ComfyUI or an import error. Inspect
  the log instead of installing arbitrary custom nodes.
- OOM: use batch 1, 1024 square, fewer references, CLIPLoader device `cpu`, and
  `--lowvram` if needed. Validate each change with a separate run.
- Model not listed: check the folder, filename, and extra_model_paths; restart
  after configuration changes. Verify the checksum.
- CUDA unavailable: check the selected Python, PyTorch CUDA build, and driver.
- torchaudio: ComfyUI needs it at startup. Use the matching set of Torch 2.11.0,
  torchvision 0.26.0, and torchaudio 2.11.0; do not mix versions.
- Library missing after pip install: the package may have been installed into a
  different Python environment.

Official sources:
https://docs.comfy.org/tutorials/image/qwen/qwen-image-2-1
https://huggingface.co/Comfy-Org/Qwen-Image-2.1
https://github.com/QwenLM/Qwen-Image-2.1
https://pytorch.org/get-started/locally/

If recommendations have changed, check them against the current code and record
any departure from the validated configuration. Do not present a compatibility
assumption as a completed test.
