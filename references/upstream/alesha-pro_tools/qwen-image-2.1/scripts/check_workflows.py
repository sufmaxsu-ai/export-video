#!/usr/bin/env python3
"""Check UI/API parity, socket wiring and Qwen edit latent routing."""
import json
from pathlib import Path
from build_workflows import ROOT, WIDGETS

def main():
    count=0
    for path in sorted((ROOT/'workflows').glob('*.json')):
        ui=json.loads(path.read_text())
        api=json.loads((path.parent/'api'/path.name).read_text())
        nodes={n['id']:n for n in ui['nodes'] if n['type']!='Note'}
        assert set(map(str,nodes))==set(api),path.name
        linked={}
        for lid,origin,slot,target,target_slot,typ in ui['links']:
            assert lid not in linked,'duplicate link id'
            linked[lid]=True
            out=nodes[origin]['outputs'][slot];inp=nodes[target]['inputs'][target_slot]
            assert out['type']==inp['type']==typ
            assert lid in out['links'] and inp['link']==lid
            assert api[str(target)]['inputs'][inp['name']]==[str(origin),slot]
        for nid,node in nodes.items():
            spec=api[str(nid)];assert node['type']==spec['class_type']
            for key,value in zip(WIDGETS[node['type']],node['widgets_values']):
                if key not in {'control_after_generate','upload'}:
                    assert spec['inputs'][key]==value,(path.name,key)
            for key,value in spec['inputs'].items():
                if isinstance(value,list):
                    assert any(i['name']==key and i['link'] in linked for i in node['inputs'])
        ks=api['6']['inputs']
        assert ks['cfg']==1 and ks['denoise']==1 and ks['sampler_name']=='euler' and ks['scheduler']=='simple'
        if '9' in api:
            assert ks['latent_image']==['4',2]
            assert api['4']['inputs']['vae']==['3',0]
            assert api['4']['inputs']['images.image_1']==['9',0]
        else:
            assert ks['latent_image']==['5',0]
            assert all(api['5']['inputs'][k]%32==0 for k in ['width','height'])
        count+=1
    assert count==5
    print('PASS: 5 UI/API pairs, widget values, links, dimensions and edit routing')

if __name__=='__main__':main()
