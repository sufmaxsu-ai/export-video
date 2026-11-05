#!/usr/bin/env python3
"""Build flat native ComfyUI workflows and matching API graphs (no subgraphs)."""
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODELS = ['qwen-image-2.1-Q4_K_M.gguf', 'qwen3vl_8b_int8_convrot.safetensors', 'qwen_image_2.1_vae_bf16.safetensors']
PROMPT = 'A small red ceramic teapot beside a green plant on a worn wooden kitchen table. Soft morning light through a window, realistic ceramic glaze and wood grain, quiet documentary photograph.'
RGBA = 'This is an RGBA image with transparency. A small red ceramic teapot, complete object centered with generous clear space around it, realistic glazed ceramic and soft studio lighting. The image has an alpha channel and a transparent background.'

def graph(mode='t2i', width=1024, height=1024, steps=40):
    g = {
        '1': {'class_type':'UnetLoaderGGUF','inputs':{'unet_name':MODELS[0]}},
        '2': {'class_type':'CLIPLoader','inputs':{'clip_name':MODELS[1],'type':'qwen_image','device':'default'}},
        '3': {'class_type':'VAELoader','inputs':{'vae_name':MODELS[2]}},
        '4': {'class_type':'TextEncodeQwenImage21','inputs':{'clip':['2',0],'prompt':RGBA if mode=='rgba' else PROMPT,'negative_prompt':'','resolution':1024}},
        '5': {'class_type':'EmptyLatentImage','inputs':{'width':width,'height':height,'batch_size':1}},
        '6': {'class_type':'KSampler','inputs':{'model':['1',0],'positive':['4',0],'negative':['4',1],'latent_image':['5',0],'seed':42,'steps':steps,'cfg':1.0,'sampler_name':'euler','scheduler':'simple','denoise':1.0}},
        '7': {'class_type':'VAEDecode','inputs':{'samples':['6',0],'vae':['3',0]}},
        '8': {'class_type':'SaveImage','inputs':{'images':['7',0],'filename_prefix':'Qwen21-GGUF/'+mode}},
    }
    if mode in {'edit','references'}:
        del g['5']
        g['9']={'class_type':'LoadImage','inputs':{'image':'qwen21-example.png'}}
        g['11']={'class_type':'QwenImage21Cache','inputs':{'model':['1',0],'device':'auto','dtype':'default'}}
        g['4']['inputs'].update({'vae':['3',0],'images.image_1':['9',0], 'prompt':'Change the red teapot in <image1> to cobalt blue glazed ceramic. Preserve its shape, the plant, table, background, framing and lighting.'})
        g['6']['inputs'].update({'model':['11',0],'latent_image':['4',2]})
        if mode=='references':
            g['10']={'class_type':'LoadImage','inputs':{'image':'qwen21-reference.png'}}
            g['4']['inputs'].update({'images.image_2':['10',0], 'prompt':'Use <image1> as the base image. Change only the teapot color to match the main color in <image2>. Keep the shape, viewpoint, background and lighting from <image1>.'})
    if mode in {'lowvram','small'}:
        g['2']['inputs']['device']='cpu'
        g['7']['class_type']='VAEDecodeTiled'
        g['7']['inputs'].update(tile_size=256, overlap=64, temporal_size=64, temporal_overlap=8)
    return g

OUTPUTS = {'UnetLoaderGGUF':[('MODEL','MODEL')], 'CLIPLoader':[('CLIP','CLIP')], 'VAELoader':[('VAE','VAE')], 'TextEncodeQwenImage21':[('positive','CONDITIONING'),('negative','CONDITIONING'),('latent','LATENT')], 'EmptyLatentImage':[('LATENT','LATENT')], 'KSampler':[('LATENT','LATENT')], 'VAEDecode':[('IMAGE','IMAGE')], 'VAEDecodeTiled':[('IMAGE','IMAGE')], 'SaveImage':[('images','IMAGE')], 'LoadImage':[('IMAGE','IMAGE'),('MASK','MASK')], 'QwenImage21Cache':[('MODEL','MODEL')]}
WIDGETS = {'UnetLoaderGGUF':['unet_name'], 'CLIPLoader':['clip_name','type','device'], 'VAELoader':['vae_name'], 'TextEncodeQwenImage21':['prompt','negative_prompt','resolution'], 'EmptyLatentImage':['width','height','batch_size'], 'KSampler':['seed','control_after_generate','steps','cfg','sampler_name','scheduler','denoise'], 'SaveImage':['filename_prefix'], 'LoadImage':['image','upload'], 'QwenImage21Cache':['device','dtype'], 'VAEDecode':[], 'VAEDecodeTiled':['tile_size','overlap','temporal_size','temporal_overlap']}
POSITIONS={1:[0,0],2:[0,170],3:[0,350],4:[440,0],5:[440,620],6:[1000,0],7:[1370,0],8:[1370,160],9:[0,520],10:[0,900],11:[1000,470]}

def ui(g, title):
    ns=[];links=[];byid={}
    for key, spec in g.items():
        nid=int(key); kind=spec['class_type']; data=spec['inputs']
        n={'id':nid,'type':kind,'pos':POSITIONS[nid], 'size':[510,560] if nid==4 else [340,330] if kind=='LoadImage' else [340,360] if nid==6 else [480,500] if nid==8 else [340,140], 'flags':{},'order':nid,'mode':0,'inputs':[], 'outputs':[{'name':name,'type':typ,'links':[]} for name,typ in OUTPUTS[kind]], 'properties':{'Node name for S&R':kind}, 'widgets_values':[]}
        for name in WIDGETS[kind]:
            n['widgets_values'].append('randomize' if name=='control_after_generate' else 'image' if name=='upload' else data[name])
        for name,value in data.items():
            if isinstance(value,list):
                origin,slot=value
                typ=OUTPUTS[g[origin]['class_type']][slot][1]
                lid=len(links)+1;target_slot=len(n['inputs'])
                n['inputs'].append({'name':name,'type':typ,'link':lid})
                links.append([lid,int(origin),slot,nid,target_slot,typ])
        if kind=='TextEncodeQwenImage21' and 'vae' not in data:
            n['inputs'].append({'name':'vae','type':'VAE','link':None,'shape':7})
        # In V3 autogrow, the instantiated input names are images.image_1 etc.
        byid[nid]=n;ns.append(n)
    for lid,origin,slot,_,_,_ in links:
        byid[origin]['outputs'][slot]['links'].append(lid)
    note='Qwen-Image-2.1 | single NVIDIA GPU | GGUF Q4_K_M\n\nEdit the prompt in TextEncodeQwenImage21. Run once to generate.\nKSampler: 40 steps, Euler/simple, CFG=1. Seed control is randomize; choose fixed to reproduce.\nT2I size: EmptyLatentImage. Edit size: resolution in TextEncodeQwenImage21, following image_1 aspect ratio.\nFor edits, upload your own image(s) in LoadImage; <image1> and <image2> identify slots.\nPNG output: output/Qwen21-GGUF/. RGBA: keep PNG to preserve alpha.\nUse the preset dimensions first. Read README before increasing resolution or changing VRAM settings.'
    note=note.replace('40 steps', str(g['6']['inputs']['steps'])+' steps')
    if g['2']['inputs']['device']=='cpu':
        note += '\nLOW VRAM: text encoder on CPU, tiled VAE. Slower prompt encoding. Use --lowvram if needed; see memory guide. 512 is a compatibility starting point, not the 1 MP quality preset.'
    ns.append({'id':99,'type':'Note','title':title,'pos':[1000,680],'size':[680,340],'flags':{},'order':99,'mode':0,'inputs':[],'outputs':[],'properties':{},'widgets_values':[note]})
    return {'last_node_id':99,'last_link_id':len(links),'nodes':ns,'links':links,'groups':[],'config':{},'extra':{'ds':{'scale':0.65,'offset':[90,90]}},'version':0.4}

SPECS=[('01-text-to-image','t2i',1024,1024,40),('02-text-to-image-2k','t2i',2048,1152,50),('03-image-edit','edit',1024,1024,40),('04-transparent-rgba','rgba',1024,1024,40),('05-two-reference-edit','references',1024,1024,40),('06-low-vram','lowvram',1024,1024,40),('07-small-512','small',512,512,40)]

def main():
    for name,mode,w,h,steps in SPECS:
        g=graph(mode,w,h,steps)
        (ROOT/'workflows/api'/f'{name}.json').write_text(json.dumps(g,indent=2)+'\n')
        (ROOT/'workflows'/f'{name}.json').write_text(json.dumps(ui(g,name),indent=2)+'\n')
    print('Built 7 UI workflows and 7 API graphs.')

if __name__=='__main__':main()
