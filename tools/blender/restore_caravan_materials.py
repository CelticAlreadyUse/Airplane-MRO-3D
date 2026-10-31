"""Rebuild node materials from measured 2.79 per-face image assignments.

Preserve source object IDs, UVs, polygons and geometry. No livery repainting.
"""
import bpy
import json
import re
from pathlib import Path
from collections import Counter
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'assets/aircraft/cessna-208-caravan'
SOURCE=BASE/'working/source/Cessna-208-CaravanW'
REPORT=ROOT/'reports/phase-4'
legacy=json.loads((REPORT/'legacy-face-materials.json').read_text())
manifest=json.loads((ROOT/'reports/phase-1/component-map-draft.json').read_text())
ids={m['source_object_name']:m['asset_object_id'] for m in manifest}
bpy.ops.wm.open_mainfile(filepath=str(SOURCE/'caravanW.blend'),load_ui=False,use_scripts=False)
scene=bpy.context.scene
materials={}
images={}
stats=Counter()
for obj in sorted((o for o in scene.objects if o.type=='MESH'),key=lambda o:o.name):
    measured=legacy['objects'][obj.name]
    if len(obj.data.polygons)!=measured['polygons']:
        raise RuntimeError('Polygon topology changed: '+obj.name)
    pairs=list(zip(measured['material_names'],measured['face_images']))
    unique=list(dict.fromkeys(pairs))
    obj.data.materials.clear()
    for material_name,image_name in unique:
        key=(material_name,image_name)
        if key not in materials:
            original=legacy['materials'].get(material_name,{'diffuse_color':[1,1,1],'alpha':1})
            material=bpy.data.materials.new('restored::{}::{}'.format(material_name,image_name or 'solid'))
            material.use_nodes=True
            material.node_tree.nodes.clear()
            shader=material.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
            shader.inputs['Base Color'].default_value=(*original['diffuse_color'],1)
            shader.inputs['Roughness'].default_value=0.3 if material_name=='transparent' else 0.58
            shader.inputs['Metallic'].default_value=0
            shader.inputs['Alpha'].default_value=original['alpha']
            output=material.node_tree.nodes.new('ShaderNodeOutputMaterial')
            material.node_tree.links.new(shader.outputs['BSDF'],output.inputs['Surface'])
            if original['alpha']<1:
                material.surface_render_method='DITHERED'
                material.use_transparent_shadow=True
            if image_name:
                filename=re.sub(r'\.\d{3}$','',image_name)
                path=SOURCE/'textures'/filename
                if not path.is_file():raise RuntimeError('Image missing: '+str(path))
                if filename not in images:
                    image=bpy.data.images.load(str(path),check_existing=False)
                    image.colorspace_settings.name='sRGB'
                    images[filename]=image
                texture=material.node_tree.nodes.new('ShaderNodeTexImage')
                texture.image=images[filename]
                material.node_tree.links.new(texture.outputs['Color'],shader.inputs['Base Color'])
            materials[key]=material
        obj.data.materials.append(materials[key])
    slot={key:index for index,key in enumerate(unique)}
    for polygon,key in zip(obj.data.polygons,pairs):polygon.material_index=slot[key]
    if measured['uv_layer'] and obj.data.uv_layers.get(measured['uv_layer']):
        obj.data.uv_layers.active=obj.data.uv_layers[measured['uv_layer']]
        obj.data.uv_layers.active.active_render=True
    obj['asset_object_id']=ids[obj.name]
    obj['source_object_name']=obj.name
    obj['mapping_status']='unverified'
    obj['material_provenance']='legacy face-image assignments read with Blender 2.79'
    obj.hide_set(False)
    obj.data.calc_loop_triangles()
    stats['meshes']+=1;stats['triangles']+=len(obj.data.loop_triangles)
    if any(i for _,i in pairs):stats['textured_objects']+=1

bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects:
    if obj.type=='MESH':obj.select_set(True)
out=BASE/'exports/caravan-demo.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,
                         export_extras=True,export_animations=False,export_cameras=False,
                         export_lights=False,export_apply=True)
bpy.ops.wm.save_as_mainfile(filepath=str(BASE/'working/caravan-materials-restored.blend'))
info={**dict(stats),'image_count':len(images),'material_count':len(materials),'bytes':out.stat().st_size,
      'material_mode':'Tekstur sumber dipulihkan',
      'provenance':'Source texture atlas and exact per-face image assignments, not AMA livery.',
      'limitations':'Glass alpha retained from source; not a measured optical material. Engineering scale/configuration unverified.'}
(REPORT/'material-restoration.json').write_text(json.dumps(info,indent=2))

# Illustrations for the walkthrough: selected source parts, no fabricated damage.
for obj in list(scene.objects):
    if obj.type!='MESH':bpy.data.objects.remove(obj,do_unlink=True)
world=bpy.data.worlds.new('Demo studio')
world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(0.65,0.70,0.75,1)
world.node_tree.nodes['Background'].inputs[1].default_value=0.6
scene.world=world
for location,energy,size in [((-10,-12,15),2100,10),((5,9,11),1700,8)]:
    data=bpy.data.lights.new('Studio light','AREA');data.energy=energy;data.shape='DISK';data.size=size
    light=bpy.data.objects.new('Studio light',data);scene.collection.objects.link(light);light.location=location
    light.rotation_euler=(Vector((0,0,0.5))-light.location).to_track_quat('-Z','Y').to_euler()
camera_data=bpy.data.cameras.new('Demo camera')
camera=bpy.data.objects.new('Demo camera',camera_data);scene.collection.objects.link(camera)
scene.camera=camera;camera_data.type='ORTHO'
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='JPEG';scene.render.image_settings.quality=87
illustrations=ROOT/'mro-web/public/demo'
illustrations.mkdir(parents=True,exist_ok=True)
meshes=[o for o in scene.objects if o.type=='MESH']
for name,offset,scale in [('roueG',(-1.2,-1.5,0.7),1.1),('porteAG',(-2,-3,1.2),2.2),('helice',(-4,-5,2),4.0),('aircraft',(-19,-22,13),22)]:
    if name=='aircraft':
        target=Vector((0,0,0.6));camera.location=offset
        for obj in meshes:obj.hide_render=False
        scene.render.resolution_x=1280;scene.render.resolution_y=800
    else:
        chosen=bpy.data.objects[name]
        points=[chosen.matrix_world@Vector(v) for v in chosen.bound_box]
        target=sum(points,Vector())/len(points)
        camera.location=target+Vector(offset)
        for obj in meshes:obj.hide_render=obj.name!=name
        scene.render.resolution_x=800;scene.render.resolution_y=600
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    camera_data.ortho_scale=scale
    scene.render.filepath=str(illustrations/('ilustrasi-'+name+'.jpg'))
    bpy.ops.render.render(write_still=True)
print('RESTORED',json.dumps(info))
