# Operations and troubleshooting

## Central model storage

Copy this structure into `extra_model_paths.yaml` in the ComfyUI root, changing
`/path/to/qwen-models` to the actual directory. Do not overwrite other entries.
Restart your own ComfyUI process after configuration changes when its queue is idle.

```yaml
qwen21:
  base_path: /path/to/qwen-models
  diffusion_models: diffusion_models
  text_encoders: text_encoders
  vae: vae
```

This directory must contain the same three subdirectories as `ComfyUI/models`.
Verify without downloading:

```bash
python3 install/download_models.py --verify-only --models-dir /path/to/qwen-models
```

The verification-only path uses the Python standard library, not Torch or
huggingface_hub. It reads every byte, so allow time for slow disks.

## Remote server

The launcher binds loopback by default. Forward a remote server to your laptop:

```bash
ssh -N -L 8188:127.0.0.1:8188 user@server
```

Replace the SSH address. Open `http://127.0.0.1:8188` locally. A different local
port is allowed: `-L 8189:127.0.0.1:8188`. If intentionally serving a trusted LAN,
`setup.py launch --listen 0.0.0.0` exposes the service on its interfaces. Do not
port-forward an unauthenticated ComfyUI directly to the public internet.

A browser on your laptop cannot use a server's loopback address without a tunnel.
The API script's `--url` must point to the reachable address, including the
actual port. Starting a second server does not repair the first server's queue.

## Common failures

| Symptom | Check / action |
|---|---|
| Red or missing TextEncodeQwenImage21 node | Update native ComfyUI with its own updater; inspect import errors. These workflows need no third-party Qwen node pack. |
| Models absent from dropdown | Exact filenames, correct model subdirectories, complete download, extra_model_paths; refresh/restart when safe. |
| Installer rejects Python 3.14+ | Use Python 3.12 explicitly (`python3.12 install/setup.py ...`), or `uv run --no-project --python 3.12 install/setup.py ...` if uv is installed. |
| CUDA unavailable | Run the CUDA check using the actual environment Python. A CPU-only wheel or incompatible driver needs correction. |
| OOM on generation | Reduce to 1024 square and batch 1. Check other owners. Try CLIPLoader device `cpu` and launch `--lowvram`; it trades speed and RAM for VRAM. |
| OOM while editing | One reference first, resolution 1024 or lower. Cache device `cpu`. Avoid resolution 0 on large originals. |
| OS kills Python | Inspect available RAM and system logs. VRAM can be fine while host RAM runs out. Do not diagnose every exit as CUDA OOM. |
| Port in use | Find its owner; use a free port. Do not kill unrelated servers. |
| Download file is HTML or truncated | SHA-256 verification will fail. Check access/network and retry the download after moving the bad file aside. |
| `aimdo.so` missing / native import error | Inspect platform, installed wheel and startup log. Use a platform wheel for the actual Python/OS; do not copy a binary from another host. |
| torchaudio import failure | ComfyUI needs it at startup. Use matching Torch/torchvision/torchaudio builds in the same Python environment. |
| UI does not match API JSON | `workflows/*.json` are UI graphs; `workflows/api/*.json` are API graphs. Use the right format. |
| Same image on every Run | KSampler control_after_generate → randomize. Fixed seed is useful for comparing edits. |
| Transparent output looks black | Check real alpha. Some viewers composite onto black. Save PNG, not JPEG. |
| Generation timeout | The job may still run. Inspect the saved prompt_id via `/history/{id}` before retrying. |

## API and evidence

```bash
curl http://127.0.0.1:8188/system_stats
curl http://127.0.0.1:8188/queue
curl http://127.0.0.1:8188/object_info
```

Submission: `POST /prompt` with `{"prompt": API_GRAPH, "client_id": "your-id"}`.
Completion: `GET /history/{prompt_id}`. Images are listed under the SaveImage
node's outputs. `GET /view` downloads by filename, subfolder and type.
Our [generate.py](../scripts/generate.py) implements this path, uploads references
with unique names and preserves the exact workflow in PNG metadata.

The API client refuses a busy queue by default. It never calls `/interrupt`,
clears history or deletes another job. A server's idle queue does not mean its
GPU memory is unloaded. Do not call `/free` on a shared server without deciding
whether it is appropriate for that service.

## Updating

The fresh installer is pinned for reproducibility. Re-running it reuses its own
checkout and environment, but refuses a changed Git revision or edited tracked
files. It does not perform `git reset --hard`. Keep your main installation
separate when testing a new ComfyUI/Torch combination.

For deliberate updates, use a second directory, review upstream requirements,
then repeat T2I, edit, alpha and 2K tests. Record actual versions, not only the
version selected in a UI. Keep the old installation until the new one is checked.
