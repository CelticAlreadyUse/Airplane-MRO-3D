"""Audit the downloaded source without saving changes to it.

Run with blender --background --factory-startup --disable-autoexec --python ...
"""
import bpy
import json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/aircraft/cessna-208-caravan/working/source/Cessna-208-CaravanW/caravanW.blend'
REPORT = ROOT / 'reports/phase-1'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE), load_ui=False, use_scripts=False)

objects = []
for obj in bpy.data.objects:
    entry = {
        'name': obj.name, 'type': obj.type,
        'parent': obj.parent.name if obj.parent else None,
        'dimensions': list(obj.dimensions),
        'location': list(obj.location), 'scale': list(obj.scale),
        'hidden_render': obj.hide_render, 'hidden_viewport': obj.hide_viewport,
        'collections': [c.name for c in obj.users_collection],
        'materials': [s.material.name if s.material else None for s in obj.material_slots],
        'modifiers': [{'name': m.name, 'type': m.type} for m in obj.modifiers],
    }
    if obj.type == 'MESH':
        obj.data.calc_loop_triangles()
        points = [obj.matrix_world @ Vector(p) for p in obj.bound_box]
        entry.update(vertices=len(obj.data.vertices), polygons=len(obj.data.polygons),
                     triangles=len(obj.data.loop_triangles),
                     uv_layers=[u.name for u in obj.data.uv_layers],
                     bounds_min=[min(p[i] for p in points) for i in range(3)],
                     bounds_max=[max(p[i] for p in points) for i in range(3)])
    objects.append(entry)

images = []
for im in bpy.data.images:
    path = Path(bpy.path.abspath(im.filepath)) if im.filepath else None
    images.append({'name': im.name, 'filepath': im.filepath,
                   'resolved_path': str(path) if path else None,
                   'exists': bool(path and path.is_file()),
                   'packed': bool(im.packed_file), 'size': list(im.size), 'source': im.source})
materials = []
for m in bpy.data.materials:
    materials.append({'name': m.name, 'diffuse_color': list(m.diffuse_color),
                      'roughness': m.roughness, 'node_types': [n.type for n in m.node_tree.nodes] if m.node_tree else [],
                      'image_nodes': [n.image.name for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image] if m.node_tree else []})
meshes = [o for o in objects if o['type'] == 'MESH']
bounds_min = [min(o['bounds_min'][i] for o in meshes) for i in range(3)]
bounds_max = [max(o['bounds_max'][i] for o in meshes) for i in range(3)]
summary = {'blender_version': bpy.app.version_string, 'object_count': len(objects),
           'mesh_count': len(meshes), 'material_count': len(materials), 'image_count': len(images),
           'source_triangles': sum(o['triangles'] for o in meshes),
           'bounds_min': bounds_min, 'bounds_max': bounds_max,
           'dimensions_blender_units': [bounds_max[i]-bounds_min[i] for i in range(3)],
           'unit_system': bpy.context.scene.unit_settings.system,
           'unit_scale': bpy.context.scene.unit_settings.scale_length,
           'missing_unpacked_images': [i['name'] for i in images if not i['exists'] and not i['packed']],
           'scenes': [s.name for s in bpy.data.scenes]}
REPORT.mkdir(parents=True, exist_ok=True)
(REPORT/'asset-audit.json').write_text(json.dumps({'summary':summary,'objects':objects,'materials':materials,'images':images}, indent=2))
print('AUDIT_SUMMARY', json.dumps(summary))
print('MESH_NAMES', json.dumps([o['name'] for o in meshes]))
