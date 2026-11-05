# Workflows

[English guide](../README.md) · [Русский гайд](../README.ru.md)

Files here are **UI workflows**: drag them into ComfyUI. Files in `api/` are
**API graphs** for `/prompt`; `scripts/generate.py` uses them automatically.
All five graphs use native nodes and the same three official model files.

| File | Default | Input |
|---|---|---|
| `01-text-to-image.json` | 1024 square, 40 steps | Text |
| `02-text-to-image-2k.json` | 2048 × 1152, 50 steps | Text |
| `03-image-edit.json` | About 1 MP, first reference aspect | One uploaded image |
| `04-transparent-rgba.json` | 1024 square, 40 steps | Text requesting RGBA |
| `05-two-reference-edit.json` | About 1 MP, first reference aspect | Two uploaded images |

## Ноды и настройки

- `UNETLoader`: diffusion model, INT8 ConvRot, weight_dtype=default.
- `CLIPLoader`: text encoder, INT8 ConvRot, type=qwen_image.
- `VAELoader`: BF16 VAE для кодирования/декодирования.
- `TextEncodeQwenImage21`: промпт, conditioning и референсы. Это нода 2.1.
- `EmptyLatentImage`: размеры результата T2I.
- `KSampler`: seed, control_after_generate, steps, CFG, sampler, scheduler.
- `VAEDecode` и `SaveImage`: декодирование и PNG в output/Qwen21.
- Edit: `LoadImage` и `QwenImage21Cache`; latent идёт из TextEncodeQwenImage21.

`randomize` уже включён в UI. Для повторения выставьте `fixed`.
Начните с CFG 1, Euler/simple, denoise 1 и batch 1.

## References

In the edit graphs, upload your own image(s) before Run. If you want the supplied
smoke examples, use the files in `../examples/`; the setup script also copies
those PNGs into a new installation's `input/` folder when present.

One-image example: change the red teapot to blue while preserving everything else.
Two-image example: use image 1 as the scene and image 2 as a color reference.
The sample reference is a deliberately plain blue swatch, not a second scene.

API examples, run from the package root using its environment Python:

```bash
python scripts/generate.py --mode edit --image examples/qwen21-example.png --seed 44
python scripts/generate.py --mode references --image examples/qwen21-example.png --reference examples/qwen21-reference.png --seed 45
python scripts/generate.py --mode rgba --seed 46
python scripts/generate.py --mode 2k --seed 47 --prompt "A ceramic teapot on a kitchen table in soft window light."
```

Replace `python` with the full venv Python path if the environment is not active.
For long prompts, use `--prompt-file path/to/prompt.txt` instead of shell quoting.
For portrait T2I, pass `--width 1152 --height 2048`. For edit size use
`--resolution 1024`; changing the T2I latent dimensions is not the edit route.

## Rebuilding and checking

`scripts/build_workflows.py` generates both representations. It requires only
Python's standard library. After changes run:

```bash
python scripts/build_workflows.py
python scripts/check_workflows.py
```

UI and API use matching connections and settings; the API client embeds a UI
workflow with the actual seed set to fixed in generated PNGs.
