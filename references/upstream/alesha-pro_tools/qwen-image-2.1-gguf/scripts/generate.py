#!/usr/bin/env python3
"""Run a supplied API graph; download and decode its PNG, preserving evidence."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

ROOT=Path(__file__).resolve().parents[1]
MODES={'t2i':'01-text-to-image','2k':'02-text-to-image-2k','edit':'03-image-edit','rgba':'04-transparent-rgba','references':'05-two-reference-edit','lowvram':'06-low-vram','small':'07-small-512'}

def request(base,path,body=None,content_type='application/json'):
    data=json.dumps(body).encode() if isinstance(body,dict) else body
    req=urllib.request.Request(base+path,data=data,headers={'Content-Type':content_type})
    try:
        with urllib.request.urlopen(req,timeout=60) as r:return r.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f'HTTP {e.code}: {e.read().decode(errors="replace")[:4000]}') from e

def call(base,path,body=None):return json.loads(request(base,path,body))

def upload(base,path):
    boundary='qwen21'+uuid.uuid4().hex
    name='qwen21-'+uuid.uuid4().hex+path.suffix.lower()
    data=(f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{name}"\r\nContent-Type: application/octet-stream\r\n\r\n').encode()+path.read_bytes()+f'\r\n--{boundary}--\r\n'.encode()
    result=json.loads(request(base,'/upload/image',data,'multipart/form-data; boundary='+boundary))
    return '/'.join(filter(None,[result.get('subfolder',''),result['name']]))

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--url',default='http://127.0.0.1:8188')
    p.add_argument('--mode',choices=MODES,default='t2i')
    p.add_argument('--prompt');p.add_argument('--prompt-file',type=Path)
    p.add_argument('--image',type=Path);p.add_argument('--reference',type=Path)
    p.add_argument('--seed',type=int);p.add_argument('--steps',type=int)
    p.add_argument('--width',type=int);p.add_argument('--height',type=int)
    p.add_argument('--resolution',type=int,help='Edit reference pixel budget side, normally 1024')
    p.add_argument('--timeout',type=int,default=1800)
    p.add_argument('--out',type=Path,default=Path('outputs'))
    p.add_argument('--allow-queue',action='store_true',help='Explicitly allow submitting behind existing jobs')
    a=p.parse_args()
    from PIL import Image
    base=a.url.rstrip('/')
    if a.prompt and a.prompt_file:p.error('Use --prompt OR --prompt-file')
    if a.mode in {'edit','references'} and not a.image:p.error('--image is required for editing')
    if a.mode=='references' and not a.reference:p.error('--reference is required')
    if bool(a.width)!=bool(a.height):p.error('Set both --width and --height')
    if a.width and a.mode in {'edit','references'}:p.error('Edit uses reference aspect ratio; use --resolution instead')
    for v in (a.width,a.height):
        if v is not None and (v<64 or v%32):p.error('Dimensions must be >=64 and divisible by 32')
    if a.steps is not None and a.steps<1:p.error('steps must be positive')
    if a.resolution is not None and (a.resolution<0 or a.resolution>4096 or a.resolution%32):p.error('resolution must be 0..4096 and divisible by 32')
    q=call(base,'/queue')
    if not a.allow_queue and (q.get('queue_running') or q.get('queue_pending')):
        raise RuntimeError('Server queue is busy. No job submitted. Retry later or use --allow-queue.')
    g=json.loads((ROOT/'workflows/api'/f'{MODES[a.mode]}.json').read_text())
    info=call(base,'/object_info')
    for spec in g.values():
        if spec['class_type'] not in info:raise RuntimeError('Missing node: '+spec['class_type'])
    for node,field in [('1','unet_name'),('2','clip_name'),('3','vae_name')]:
        name=g[node]['inputs'][field];choices=info[g[node]['class_type']]['input']['required'][field][0]
        if name not in choices:raise RuntimeError('Model missing from server dropdown: '+name)
    g['6']['inputs']['seed']=a.seed if a.seed is not None else secrets.randbelow(2**53)
    if a.steps is not None:g['6']['inputs']['steps']=a.steps
    if a.prompt or a.prompt_file:g['4']['inputs']['prompt']=a.prompt or a.prompt_file.read_text()
    if a.width:g['5']['inputs'].update(width=a.width,height=a.height)
    if a.resolution is not None:g['4']['inputs']['resolution']=a.resolution
    if a.mode in {'edit','references'}:
        for node,path in [('9',a.image),('10',a.reference)]:
            if path is not None:
                with Image.open(path) as im:im.verify()
                g[node]['inputs']['image']=upload(base,path)
    run_dir=a.out.expanduser().resolve()/('qwen21-'+time.strftime('%Y%m%d-%H%M%S')+'-'+uuid.uuid4().hex[:6])
    run_dir.mkdir(parents=True)
    (run_dir/'prompt.json').write_text(json.dumps(g,indent=2)+'\n')
    # Build UI from the exact submitted graph so PNG drag-and-drop reproduces settings.
    from build_workflows import ui
    workflow=ui(g,MODES[a.mode])
    for node in workflow['nodes']:
        if node['type']=='KSampler':node['widgets_values'][1]='fixed'
    started=time.monotonic()
    response=call(base,'/prompt',{'prompt':g,'client_id':'qwen21-guide-'+uuid.uuid4().hex,'extra_data':{'extra_pnginfo':{'workflow':workflow}}})
    (run_dir/'submission.json').write_text(json.dumps(response,indent=2)+'\n')
    pid=response['prompt_id'];print('prompt_id:',pid,'| evidence:',run_dir,flush=True)
    deadline=time.monotonic()+a.timeout
    last_report=0
    while time.monotonic()<deadline:
        history=call(base,'/history/'+pid)
        if pid in history:break
        elapsed=time.monotonic()-started
        if elapsed-last_report>=30:
            print(f'Waiting for own prompt: {elapsed:.0f}s',flush=True);last_report=elapsed
        time.sleep(2)
    else:
        raise RuntimeError(f'Timed out; job {pid} may still be running. Inspect its history. Nothing was interrupted.')
    h=history[pid];(run_dir/'history.json').write_text(json.dumps(h,indent=2)+'\n')
    if h['status']['status_str']!='success':raise RuntimeError('Generation failed; inspect '+str(run_dir/'history.json'))
    outputs=h.get('outputs',{}).get('8',{}).get('images',[])
    if not outputs:raise RuntimeError('No saved image returned')
    stats=[]
    for i,meta in enumerate(outputs):
        data=request(base,'/view?'+urllib.parse.urlencode(meta));dest=run_dir/f'image-{i+1}.png';dest.write_bytes(data)
        with Image.open(dest) as im:im.verify()
        with Image.open(dest) as im:
            im.load();row={'file':dest.name,'width':im.width,'height':im.height,'mode':im.mode,'sha256':hashlib.sha256(data).hexdigest()}
            if '5' in g and im.size!=(g['5']['inputs']['width'],g['5']['inputs']['height']):raise RuntimeError('Unexpected output dimensions')
            if a.mode=='rgba':
                if im.mode!='RGBA':raise RuntimeError('RGBA requested but no alpha channel returned')
                lo,hi=im.getchannel('A').getextrema();row['alpha_range']=[lo,hi]
                if lo==hi:raise RuntimeError('RGBA output has no varying alpha; inspect image/prompt')
        stats.append(row)
    stamps={name:payload.get('timestamp') for name,payload in h['status'].get('messages',[]) if name in {'execution_start','execution_success'}}
    server_seconds=(stamps['execution_success']-stamps['execution_start'])/1000 if len(stamps)==2 else None
    summary={'mode':a.mode,'seed':g['6']['inputs']['seed'],'steps':g['6']['inputs']['steps'],'server_seconds':server_seconds,'client_seconds':round(time.monotonic()-started,3),'images':stats}
    (run_dir/'result.json').write_text(json.dumps(summary,indent=2)+'\n')
    print(json.dumps(summary,indent=2));print('PNG verified. Open it to check visual quality:',run_dir)

if __name__=='__main__':main()
