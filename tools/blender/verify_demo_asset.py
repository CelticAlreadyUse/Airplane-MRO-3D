"""Validate textured GLB geometry, identity and per-object texture assignments."""
import bpy
import json
import struct
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
REPORT=ROOT/'reports/phase-4'
source=json.loads((ROOT/'reports/phase-1/asset-audit.json').read_text())
legacy=json.loads((REPORT/'legacy-face-materials.json').read_text())
manifest=json.loads((ROOT/'reports/phase-1/component-map-draft.json').read_text())
path=ROOT/'assets/aircraft/cessna-208-caravan/exports/caravan-demo.glb'
data=path.read_bytes()
magic,version,total=struct.unpack_from('<4sII',data)
assert magic==b'glTF' and version==2 and total==len(data)
length,kind=struct.unpack_from('<I4s',data,12)
assert kind==b'JSON'
gltf=json.loads(data[20:20+length])
assert len(gltf['images'])==28
assert len(gltf['materials'])==32
expected={m['source_object_name']:m['asset_object_id'] for m in manifest}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(path))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
assert len(meshes)==434
actual={m.get('source_object_name'):m.get('asset_object_id') for m in meshes}
assert expected==actual
points=[];triangles=0;textured=0
for mesh in meshes:
    mesh.data.calc_loop_triangles();triangles+=len(mesh.data.loop_triangles)
    points.extend(mesh.matrix_world@Vector(p) for p in mesh.bound_box)
    assigned=[n for slot in mesh.material_slots if slot.material and slot.material.node_tree for n in slot.material.node_tree.nodes if n.type=='TEX_IMAGE' and n.image]
    wanted=any(legacy['objects'][mesh['source_object_name']]['face_images'])
    assert bool(assigned)==wanted,mesh.name
    if wanted:assert len(mesh.data.uv_layers)>0,mesh.name
    if assigned:textured+=1
assert triangles==80695 and textured==392
mins=[min(p[i] for p in points) for i in range(3)]
maxs=[max(p[i] for p in points) for i in range(3)]
assert all(abs(a-b)<0.002 for a,b in zip(mins,source['summary']['bounds_min']))
assert all(abs(a-b)<0.002 for a,b in zip(maxs,source['summary']['bounds_max']))
result={'passed':True,'meshes':len(meshes),'triangles':triangles,'textured_objects':textured,'images':len(gltf['images']),'materials':len(gltf['materials']),'bytes':len(data),'identity_matches_source':True,'world_bounds_match':True,'per_object_texture_presence_matches_legacy':True,'alpha_modes':sorted({m.get('alphaMode','OPAQUE') for m in gltf['materials']})}
(REPORT/'asset-verification.json').write_text(json.dumps(result,indent=2))
print('VERIFIED_DEMO_ASSET',json.dumps(result))
