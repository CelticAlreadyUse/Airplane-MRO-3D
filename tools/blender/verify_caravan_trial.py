"""Re-import the trial GLB and compare geometry bounds and object identities."""
import bpy
import json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
report = ROOT/'reports/phase-1'
audit = json.loads((report/'asset-audit.json').read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/aircraft/cessna-208-caravan/exports/caravan-geometry-trial.glb'))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
points = [o.matrix_world @ Vector(v) for o in meshes for v in o.bound_box]
actual_min = [min(p[i] for p in points) for i in range(3)]
actual_max = [max(p[i] for p in points) for i in range(3)]
errors = []
if len(meshes) != audit['summary']['mesh_count']:
    errors.append('Mesh count changed')
ids = [o.get('asset_object_id') for o in meshes]
if None in ids or len(set(ids)) != len(ids):
    errors.append('Missing or duplicate asset IDs')
expected_names = {o['name'] for o in audit['objects'] if o['type']=='MESH'}
if {o.get('source_object_name') for o in meshes} != expected_names:
    errors.append('Source object identity set changed')
for actual, expected in [(actual_min,audit['summary']['bounds_min']), (actual_max,audit['summary']['bounds_max'])]:
    if any(abs(a-b)>0.002 for a,b in zip(actual,expected)):
        errors.append('World bounds differ by more than 0.002 source units')
triangles = 0
for o in meshes:
    o.data.calc_loop_triangles()
    triangles += len(o.data.loop_triangles)
result = {'passed':not errors, 'checks':['mesh count','unique asset IDs','source object names','world bounds tolerance 0.002'],
          'mesh_count':len(meshes),'triangles':triangles,'bounds_min':actual_min,'bounds_max':actual_max,
          'errors':errors,
          'scope':'Blender GLB round-trip only. Babylon/browser performance and original material fidelity not tested.'}
(report/'roundtrip-verification.json').write_text(json.dumps(result,indent=2))
print('ROUNDTRIP',json.dumps(result))
if errors:
    raise RuntimeError(errors)
