#!/usr/bin/env python3
"""Download pinned official weights and verify every byte with SHA-256."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import sys

MANIFEST = json.loads(Path(__file__).with_name('models.json').read_text())

def valid(path, spec):
    if not path.is_file() or path.stat().st_size != spec['bytes']:
        return False
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(8 * 1024 * 1024), b''):
            h.update(block)
    return h.hexdigest() == spec['sha256']

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--models-dir', type=Path, required=True, help='ComfyUI/models, not ComfyUI root')
    p.add_argument('--verify-only', action='store_true')
    a = p.parse_args()
    dest = a.models_dir.expanduser().resolve()
    if not dest.exists() and a.verify_only:
        raise RuntimeError('Model directory does not exist')
    if not a.verify_only:
        dest.mkdir(parents=True, exist_ok=True)
    missing = []
    for spec in MANIFEST['files']:
        target = dest / spec['path']
        if valid(target, spec):
            print('VERIFIED', spec['path'], flush=True)
        else:
            missing.append(spec)
    if a.verify_only:
        if missing:
            raise RuntimeError('Missing or invalid: ' + ', '.join(s['path'] for s in missing))
        return
    needed = sum(s['bytes'] for s in missing)
    if shutil.disk_usage(dest).free < needed + 1024**3:
        raise RuntimeError(f'Need at least {(needed+1024**3)/1e9:.1f} GB free for remaining files')
    if missing:
        try:
            from huggingface_hub import hf_hub_download
        except ImportError:
            raise RuntimeError('Install huggingface_hub in this Python environment first')
    for spec in missing:
        target = dest / spec['path']
        # Preserve any existing mismatched file instead of replacing user data.
        if target.exists():
            raise RuntimeError(f'Checksum mismatch: {target}. Move this file aside before retrying.')
        print('DOWNLOADING', spec['path'], flush=True)
        got = Path(hf_hub_download(repo_id=MANIFEST['repository'], filename=spec['path'], revision=MANIFEST['revision'], local_dir=dest))
        if not valid(got, spec):
            raise RuntimeError('SHA-256 mismatch: ' + str(got))
        print('VERIFIED', spec['path'], flush=True)
    print('All 3 model files verified.')

if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print('ERROR:', exc, file=sys.stderr)
        sys.exit(1)
