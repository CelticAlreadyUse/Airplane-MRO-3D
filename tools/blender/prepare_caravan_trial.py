"""Produce a geometry-first GLB trial with explicit neutral material replacements."""
import bpy
import json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'assets/aircraft/cessna-208-caravan'
REPORT = ROOT / 'reports/phase-1'
bpy.ops.wm.open_mainfile(filepath=str(BASE/'working/source/Cessna-208-CaravanW/caravanW.blend'), load_ui=False, use_scripts=False)
scene = bpy.context.scene
repairs = []
for image in bpy.data.images:
    if image.source != 'FILE' or not image.filepath:
        continue
    path = Path(bpy.path.abspath(image.filepath))
    if not path.is_file():
        replacement = BASE/'working/source/Cessna-208-CaravanW/textures'/path.name
        if replacement.is_file():
            repairs.append({'image':image.name,'old':image.filepath,'new':str(replacement)})
            image.filepath = str(replacement)
            image.reload()

# Legacy UV-face textures are not reliably converted to node materials by Blender 5.
# These are purposefully neutral preview materials, not a restoration of the source.
for material in bpy.data.materials:
    color = tuple(material.diffuse_color)
    material.use_nodes = True
    material.node_tree.nodes.clear()
    output = material.node_tree.nodes.new('ShaderNodeOutputMaterial')
    shader = material.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    shader.inputs['Base Color'].default_value = color
    shader.inputs['Roughness'].default_value = 0.6
    material.node_tree.links.new(shader.outputs['BSDF'], output.inputs['Surface'])
    if material.name == 'transparent':
        # Opaque tint for a geometry audit: avoids claiming restored glass behavior.
        shader.inputs['Base Color'].default_value = (0.16,0.24,0.30,1)

meshes = sorted([o for o in scene.objects if o.type == 'MESH'], key=lambda o:o.name)
mapping = []
for index, obj in enumerate(meshes, 1):
    # Asset IDs are stable for this source snapshot only. They are NOT MRO part IDs.
    obj['asset_object_id'] = f'c208-source-{index:04d}'
    obj['source_object_name'] = obj.name
    obj['mapping_status'] = 'unverified'
    mapping.append({'asset_object_id':obj['asset_object_id'], 'source_object_name':obj.name,
                    'component_id':None, 'mapping_status':'unverified'})
    if obj.hide_get():
        obj.hide_set(False)

bpy.ops.object.select_all(action='DESELECT')
for obj in meshes:
    obj.select_set(True)
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0
glb = BASE/'exports/caravan-geometry-trial.glb'
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', use_selection=True,
                          export_extras=True, export_animations=False,
                          export_cameras=False, export_lights=False, export_apply=True)
bpy.ops.wm.save_as_mainfile(filepath=str(BASE/'working/caravan-geometry-trial.blend'))
(REPORT/'component-map-draft.json').write_text(json.dumps(mapping,indent=2))
(REPORT/'trial-preparation.json').write_text(json.dumps({
    'texture_path_repairs':repairs, 'mesh_objects_selected':len(meshes),
    'glb':str(glb.relative_to(ROOT)), 'glb_bytes':glb.stat().st_size,
    'material_mode':'neutral Principled replacements; original texture appearance NOT restored',
    'scale_note':'one source unit assumed as one meter for trial; not calibrated to a specific variant',
    'component_map_note':'asset object IDs only; all technical component mappings unverified'
},indent=2))

# Preview stage added only after export/save, so it does not enter the asset.
for obj in list(scene.objects):
    if obj.type != 'MESH':
        bpy.data.objects.remove(obj, do_unlink=True)
world = bpy.data.worlds.new('Audit Preview World')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.65,0.70,0.76,1)
world.node_tree.nodes['Background'].inputs[1].default_value = 0.5
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-1.41))
floor = bpy.context.object
mat = bpy.data.materials.new('Preview Floor')
mat.diffuse_color = (0.30,0.35,0.40,1)
floor.data.materials.append(mat)
for location, energy, size in [((-10,-12,15),2200,10),((5,9,11),1800,8)]:
    data = bpy.data.lights.new('Preview Area','AREA')
    data.energy, data.shape, data.size = energy, 'DISK', size
    obj = bpy.data.objects.new('Preview Area',data)
    scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector((0,0,0.5))-obj.location).to_track_quat('-Z','Y').to_euler()
camera_data = bpy.data.cameras.new('Audit Camera')
camera = bpy.data.objects.new('Audit Camera',camera_data)
scene.collection.objects.link(camera)
camera.location = (-19,-22,13)
camera.rotation_euler = (Vector((0,0,0.6))-camera.location).to_track_quat('-Z','Y').to_euler()
camera_data.type = 'ORTHO'
camera_data.ortho_scale = 22
scene.camera = camera
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 12
scene.cycles.use_denoising = True
scene.render.resolution_x = 1280
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = str(REPORT/'caravan-geometry-preview.png')
bpy.ops.render.render(write_still=True)
print('TRIAL_READY',str(glb),glb.stat().st_size)
