#!/usr/bin/env python3
"""Install a separate single-GPU Qwen ComfyUI, or copy workflows only."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
VERSIONS = json.loads((ROOT / 'install/versions.json').read_text())

def run(argv, **kwargs):
    print('+', ' '.join(map(str, argv)), flush=True)
    return subprocess.run(list(map(str, argv)), check=True, **kwargs)

def python_at(comfy):
    return comfy / '.venv' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')

def copy_workflows(comfy):
    if not (comfy / 'main.py').is_file():
        raise RuntimeError('Not a ComfyUI directory: ' + str(comfy))
    dest = comfy / 'user/default/workflows/qwen-image-2.1-gguf'
    sources = sorted((ROOT / 'workflows').glob('*.json'))
    for src in sources:
        target = dest / src.name
        if target.exists() and target.read_bytes() != src.read_bytes():
            raise RuntimeError(f'Refusing to overwrite edited workflow: {target}. Rename it first.')
    dest.mkdir(parents=True, exist_ok=True)
    for src in sources:
        shutil.copy2(src, dest / src.name)
    print(f'Copied {len(sources)} UI workflows to {dest}')
    (comfy / 'input').mkdir(exist_ok=True)
    for example in (ROOT / 'examples').glob('qwen21-*.png'):
        target = comfy / 'input' / example.name
        if not target.exists():
            shutil.copy2(example, target)

def check():
    print('Python:', sys.version.split()[0], '|', sys.executable)
    print('git:', shutil.which('git') or 'MISSING')
    print('uv:', shutil.which('uv') or 'optional; pip fallback will be used')
    if shutil.which('nvidia-smi'):
        run(['nvidia-smi', '--query-gpu=index,name,memory.total,memory.used,driver_version', '--format=csv'])
    else:
        print('No nvidia-smi. Install an NVIDIA driver before using this CUDA profile.')
    print('Profile: one NVIDIA GPU; validated on RTX 3090 24 GB. No install performed.')
    print('Weights: 14.63 GB decimal. Plan >=45 GB free disk and preferably 32–64 GB system RAM.')

def install(comfy, index):
    if not shutil.which('git'):
        raise RuntimeError('Install Git first.')
    if not (3, 10) <= sys.version_info[:2] <= (3, 13):
        raise RuntimeError('Run installer with Python 3.10–3.13; Python 3.12 is recommended.')
    marker = comfy / '.qwen21-gguf-installer.json'
    if comfy.exists() and any(comfy.iterdir()):
        if not marker.is_file():
            raise RuntimeError('Existing directory not owned by this installer. Use workflows --comfy instead, or choose a new directory.')
        if subprocess.check_output(['git', '-C', str(comfy), 'rev-parse', 'HEAD'], text=True).strip() != VERSIONS['comfy_commit']:
            raise RuntimeError('Checkout changed since installation; refusing to change it.')
        if subprocess.check_output(['git', '-C', str(comfy), 'status', '--porcelain', '--untracked-files=no'], text=True).strip():
            raise RuntimeError('Tracked ComfyUI files modified; refusing dependency installation.')
    else:
        comfy.mkdir(parents=True, exist_ok=True)
        run(['git', 'init', comfy])
        run(['git', '-C', comfy, 'remote', 'add', 'origin', VERSIONS['comfy_repository']])
        run(['git', '-C', comfy, 'fetch', '--depth', '1', 'origin', VERSIONS['comfy_commit']])
        run(['git', '-C', comfy, 'checkout', '--detach', 'FETCH_HEAD'])
        marker.write_text(json.dumps(VERSIONS, indent=2) + '\n')
    py = python_at(comfy)
    uv = shutil.which('uv')
    if not py.exists():
        if uv:
            run([uv, 'venv', '--python', sys.executable, comfy / '.venv'])
        else:
            run([sys.executable, '-m', 'venv', comfy / '.venv'])
    pip = [uv, 'pip', 'install', '--python', str(py)] if uv else [str(py), '-m', 'pip', 'install']
    if not uv:
        run(pip + ['--upgrade', 'pip'])
    run(pip + [f"torch=={VERSIONS['torch']}", f"torchvision=={VERSIONS['torchvision']}", f"torchaudio=={VERSIONS['torchaudio']}", '--index-url', index])
    # Install the matching CUDA trio first, then constrain it while installing
    # the remaining pinned-checkout requirements.
    filtered = []
    for line in (comfy / 'requirements.txt').read_text().splitlines():
        if line.strip().split('=')[0] in {'torch', 'torchvision', 'torchaudio'}:
            continue
        if line.startswith('transformers'):
            line = f"transformers=={VERSIONS['transformers']}"
        filtered.append(line)
    req = comfy / '.qwen21-image-requirements.txt'
    req.write_text('\n'.join(filtered) + '\n')
    constraints = comfy / '.qwen21-constraints.txt'
    constraints.write_text(f"torch=={VERSIONS['torch']}\ntorchvision=={VERSIONS['torchvision']}\ntorchaudio=={VERSIONS['torchaudio']}\n")
    run(pip + ['-r', str(req), '-c', str(constraints), 'huggingface_hub>=1.0,<2'])
    run([py, '-c', 'import torch; print("torch",torch.__version__,"CUDA",torch.version.cuda); assert torch.cuda.is_available(), "CUDA unavailable: check driver and wheel"'])
    install_node(comfy, py, pip)
    copy_workflows(comfy)
    marker.write_text(json.dumps(VERSIONS, indent=2) + '\n')
    print('Runtime installed. Next: download_models.py, launch, then generate.py smoke test.')

def install_node(comfy, py, pip):
    node = comfy / 'custom_nodes/ComfyUI-GGUF'
    if node.exists():
        head = subprocess.check_output(['git', '-C', str(node), 'rev-parse', 'HEAD'], text=True).strip()
        dirty = subprocess.check_output(['git', '-C', str(node), 'status', '--porcelain', '--untracked-files=no'], text=True).strip()
        if head != VERSIONS['gguf_commit'] or dirty:
            raise RuntimeError('Existing GGUF node differs from the validated version. Do not overwrite it; use a separate installation.')
    else:
        node.mkdir(parents=True)
        run(['git', 'init', node])
        run(['git', '-C', node, 'remote', 'add', 'origin', VERSIONS['gguf_repository']])
        run(['git', '-C', node, 'fetch', '--depth', '1', 'origin', VERSIONS['gguf_commit']])
        run(['git', '-C', node, 'checkout', '--detach', 'FETCH_HEAD'])
    run(pip + [f"gguf=={VERSIONS['gguf_python']}", 'sentencepiece', 'protobuf'])

def main():
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest='command', required=True)
    sub.add_parser('check')
    i = sub.add_parser('install')
    i.add_argument('--dir', type=Path, required=True)
    i.add_argument('--torch-index', default=VERSIONS['torch_index'])
    w = sub.add_parser('workflows')
    w.add_argument('--comfy', type=Path, required=True)
    s = sub.add_parser('launch')
    s.add_argument('--comfy', type=Path, required=True)
    s.add_argument('--gpu', default='0', help='One physical GPU index or UUID, never a list')
    s.add_argument('--port', type=int, default=8188)
    s.add_argument('--listen', default='127.0.0.1')
    s.add_argument('--lowvram', action='store_true')
    s.add_argument('--reserve-vram', type=float, default=1.0)
    s.add_argument('--cpu-vae', action='store_true')
    s.add_argument('--fp32-text-enc', action='store_true')
    s.add_argument('--cpu-threads', type=int, help='Optional CPU thread count for OMP/MKL')
    a = p.parse_args()
    if a.command == 'check':
        check()
    elif a.command == 'install':
        install(a.dir.expanduser().resolve(), a.torch_index)
    elif a.command == 'workflows':
        copy_workflows(a.comfy.expanduser().resolve())
    else:
        if ',' in a.gpu or not a.gpu:
            raise RuntimeError('Choose exactly one GPU.')
        comfy = a.comfy.expanduser().resolve()
        env = dict(os.environ, CUDA_VISIBLE_DEVICES=a.gpu)
        if a.cpu_threads is not None:
            if a.cpu_threads < 1:
                raise RuntimeError('cpu-threads must be positive')
            env.update(OMP_NUM_THREADS=str(a.cpu_threads), MKL_NUM_THREADS=str(a.cpu_threads))
        cmd = [python_at(comfy), 'main.py', '--listen', a.listen, '--port', str(a.port), '--disable-auto-launch', '--disable-dynamic-vram', '--reserve-vram', str(a.reserve_vram)]
        if a.lowvram:
            cmd.append('--lowvram')
        if a.cpu_vae:
            cmd.append('--cpu-vae')
        if a.fp32_text_enc:
            cmd.append('--fp32-text-enc')
        run(cmd, cwd=comfy, env=env)

if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, subprocess.CalledProcessError) as exc:
        print('ERROR:', exc, file=sys.stderr)
        sys.exit(1)
