"""Read legacy face-image assignments using official portable Blender 2.79.

Source .blend is opened with autoexec disabled and is never saved.
"""
import bpy
import json
from pathlib import Path
from collections import Counter

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'assets/aircraft/cessna-208-caravan/working/source/Cessna-208-CaravanW/caravanW.blend'
REPORT=ROOT/'reports/phase-4'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE),load_ui=False,use_scripts=False)
objects={}
for obj in bpy.data.objects:
    if obj.type!='MESH':
        continue
    mesh=obj.data
    layer=mesh.uv_textures.active
    images=[face.image.name if face.image else None for face in layer.data] if layer else [None]*len(mesh.polygons)
    objects[obj.name]={
        'polygons':len(mesh.polygons), 'uv_layer':layer.name if layer else None,
        'face_images':images,'image_counts':dict(Counter(images)),
        'material_names':[obj.material_slots[p.material_index].name if obj.material_slots and p.material_index<len(obj.material_slots) else None for p in mesh.polygons],
    }
materials={m.name:{'alpha':m.alpha,'diffuse_color':list(m.diffuse_color),'use_transparency':m.use_transparency,'specular_intensity':m.specular_intensity} for m in bpy.data.materials}
REPORT.mkdir(parents=True,exist_ok=True)
(REPORT/'legacy-face-materials.json').write_text(json.dumps({'blender_version':bpy.app.version_string,'objects':objects,'materials':materials},indent=2))
print('LEGACY_READ',len(objects),'meshes;',sum(any(i for i in o['face_images']) for o in objects.values()),'with face images')
for name in ['fuselage','roueG','porteAG','helice','panel']:
    print(name,objects.get(name,{}).get('image_counts'))
