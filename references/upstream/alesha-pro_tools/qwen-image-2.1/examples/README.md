# Example inputs and checked outputs

Generated locally during the [installation validation](../docs/validation.md),
using the supplied API workflows. PNGs are original outputs, not retouched.

| File | Role |
|---|---|
| `qwen21-example.png` | Generated red teapot scene; input for both edit workflows |
| `qwen21-reference.png` | Programmatically authored 512 × 512 blue color swatch |
| `edited-blue.png` | One-reference instruction edit: red → cobalt blue |
| `two-reference-edit.png` | Color transfer from the blue swatch |
| `transparent-teapot.png` | Generated RGBA teapot; use an alpha-aware viewer |

The setup script copies only `qwen21-*.png` into ComfyUI/input when those
filenames do not already exist. Upload your own images in LoadImage to edit them.
The PNG workflow metadata and [validation results](../docs/validation-results.json)
record the generation settings. An alpha-ignorant viewer can show arbitrary RGB
colors in nearly transparent areas; that is not the composited result.

| Generation | Instruction edit | Native RGBA |
|---|---|---|
| ![Red teapot](qwen21-example.png) | ![Blue teapot](edited-blue.png) | ![Transparent teapot](transparent-teapot.png) |
