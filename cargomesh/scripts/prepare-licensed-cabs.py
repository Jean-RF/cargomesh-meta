"""Blender --background --python this_file -- decoded_source_dir output_dir.
Sources are licensed, locally decoded GLBs; source paths/hashes remain in the asset notice.
"""
import bpy, bmesh, json, math, sys, hashlib
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix

source, output = map(Path, sys.argv[sys.argv.index('--')+1:])
output.mkdir(parents=True, exist_ok=True)
specs = {
 'sprinter':dict(file='van-decoded.glb',front=-2.959,cut=-.24,width=1.99,radius=.3656,axle=-1.9429,track=.8402,head=[1.85,1.80,.57],cap=2.48),
 'bonnet':dict(file='ambulance-decoded.glb',front=-3.178,cut=-1.15,width=1.96,radius=.3548,axle=-2.4019,track=.7841,head=[1.80,1.77,.55],cap=2.02),
 'isuzu':dict(file='isuzu-decoded.glb',front=-4.919,cut=-3.16,width=2.12,radius=.3997,axle=-3.8155,track=.9041,head=[1.02,2.08,.60]),
 'euro-high':dict(file='euro-decoded.glb',front=-3.997,cut=-1.65,width=2.50,radius=.5734,axle=-2.3401,track=1.19,head=[1.20,2.80,.76]),
 'euro-day':dict(file='firetruck-decoded.glb',front=-4.29,cut=-1.94,width=2.50,radius=.5734,axle=-2.5146,track=1.19,head=[1.20,2.80,.76]),
}
result={}
def image_for(socket):
 if not socket or not socket.is_linked:return None
 node=socket.links[0].from_node
 if node.type=='TEX_IMAGE':return node.image
 for value in node.inputs:
  image=image_for(value)
  if image:return image
 return None
def pixels(image,constant,size=508):
 if not image:return np.broadcast_to(np.array(constant,dtype=np.float32),(size,size,4)).copy()
 copy=image.copy();copy.scale(size,size)
 values=np.empty(size*size*4,dtype=np.float32);copy.pixels.foreach_get(values)
 bpy.data.images.remove(copy)
 return values.reshape(size,size,4)
def shader_of(material):
 return next((n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
def kind(material):
 name=material.name.lower()
 if name.startswith('paint:') or name=='boxtruck26_paint' or name.endswith(('truck_body','truck_roofbody_mat')):return 'paint'
 if 'glass' in name or 'windows' in name:return 'glass'
 if 'siren' in name:return 'remove'
 return 'detail'
for name,spec in specs.items():
 bpy.ops.wm.read_factory_settings(use_empty=True)
 path=source/spec['file'];bpy.ops.import_scene.gltf(filepath=str(path))
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 materials=list(bpy.data.materials)
 detail=[m for m in materials if kind(m)=='detail']
 columns=2;rows=math.ceil(len(detail)/columns);tile=512
 maps=[np.ones((rows*tile,columns*tile,4),dtype=np.float32) for _ in range(3)]
 for index,material in enumerate(detail):
  shader=shader_of(material);base=shader.inputs['Base Color'];normal=shader.inputs['Normal']
  color=pixels(image_for(base),base.default_value)
  norm=pixels(image_for(normal),(.5,.5,1,1))
  rough=shader.inputs['Roughness'];metal=shader.inputs['Metallic']
  rimage=image_for(rough);mimage=image_for(metal)
  packed=np.ones_like(color)
  packed[:,:,1]=pixels(rimage,(1,rough.default_value,1,1))[:,:,1]
  packed[:,:,2]=pixels(mimage,(1,1,metal.default_value,1))[:,:,2]
  packed[:,:,1]=np.maximum(packed[:,:,1],.32)
  row,column=divmod(index,columns)
  for atlas,data in zip(maps,[color,norm,packed]):atlas[row*tile:(row+1)*tile,column*tile:(column+1)*tile]=np.pad(data,((2,2),(2,2),(0,0)),mode='edge')
 atlas_material=bpy.data.materials.new('licensed:detail');atlas_material.use_nodes=True
 shader=shader_of(atlas_material);textures=[]
 for role,data in zip(['color','normal','orm'],maps):
  image=bpy.data.images.new(f'{name}-{role}',width=columns*tile,height=rows*tile,alpha=False)
  image.colorspace_settings.name='sRGB' if role=='color' else 'Non-Color'
  image.file_format='JPEG' if role=='color' else 'PNG'
  image.pixels.foreach_set(data.ravel());image.pack()
  node=atlas_material.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;textures.append(node)
 atlas_material.node_tree.links.new(textures[0].outputs['Color'],shader.inputs['Base Color'])
 normal_node=atlas_material.node_tree.nodes.new('ShaderNodeNormalMap')
 atlas_material.node_tree.links.new(textures[1].outputs['Color'],normal_node.inputs['Color'])
 atlas_material.node_tree.links.new(normal_node.outputs['Normal'],shader.inputs['Normal'])
 separate=atlas_material.node_tree.nodes.new('ShaderNodeSeparateColor')
 atlas_material.node_tree.links.new(textures[2].outputs['Color'],separate.inputs['Color'])
 atlas_material.node_tree.links.new(separate.outputs['Green'],shader.inputs['Roughness'])
 atlas_material.node_tree.links.new(separate.outputs['Blue'],shader.inputs['Metallic'])
 paint=bpy.data.materials.new('licensed:paint');paint.use_nodes=True
 p=shader_of(paint);p.inputs['Base Color'].default_value=(.8,.8,.8,1);p.inputs['Roughness'].default_value=.3;p.inputs['Coat Weight'].default_value=.55;p.inputs['Coat Roughness'].default_value=.18
 glass=bpy.data.materials.new('licensed:glass');glass.use_nodes=True
 p=shader_of(glass);p.inputs['Base Color'].default_value=(.12,.17,.20,1);p.inputs['Alpha'].default_value=.22;p.inputs['Roughness'].default_value=.06
 glass.surface_render_method='DITHERED';glass.diffuse_color=(.12,.17,.20,.22)
 root=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(root)
 root['license']='CC-BY-4.0';root['attribution']='CARLA Simulator; Valdrada / M. K. Turkcan; Isuzu FFR by mekanismo where applicable; adaptation CargoMesh/Juan'
 root['changes']='Cab/chassis cut; texture atlases; separate cab/wheel LOD budgets; paint and glazing adapted; original coordinates in metres'
 wheel_groups={}
 for side in [-1,1]:
  group=bpy.data.objects.new('wheel-left' if side<0 else 'wheel-right',None);bpy.context.collection.objects.link(group);group.parent=root
  group.location=(spec['axle']-spec['front'],side*spec['track'],spec['radius']);wheel_groups[side]=group
 created=[]
 for obj in meshes:
  mesh=obj.data;world=obj.matrix_world;normal_matrix=world.to_3x3().inverted().transposed()
  vertices=[world@v.co for v in mesh.vertices]
  normals=[(normal_matrix@n.vector).normalized() for n in mesh.corner_normals]
  batches={'cab':[],-1:[],1:[]}
  for face in mesh.polygons:
   material=obj.material_slots[face.material_index].material
   if kind(material)=='remove':continue
   center=sum((vertices[i] for i in face.vertices),Vector())/len(face.vertices)
   if center.x>spec['cut']:continue
   if name=='euro-day' and kind(material)!='paint' and center.z>3.20:continue
   wheel=kind(material)!='paint' and all(abs(vertices[i].y)>spec['width']*.31 and (vertices[i].x-spec['axle'])**2+(vertices[i].z-spec['radius'])**2<(spec['radius']*1.06)**2 for i in face.vertices)
   batch=(-1 if center.y<0 else 1) if wheel else 'cab'
   batches[batch].append(face.index)
  for batch,indices in batches.items():
   if not indices:continue
   data=bpy.data.meshes.new('source-cut');data.from_pydata([v-Vector((spec['front'],0,0)) for v in vertices],[],[tuple(mesh.polygons[i].vertices) for i in indices])
   data.materials.clear();data.materials.append(atlas_material);data.materials.append(paint);data.materials.append(glass)
   uv=data.uv_layers.new(name='UVMap');source_uv=mesh.uv_layers.active
   corner=[]
   for new_face,old_index in zip(data.polygons,indices):
    old_face=mesh.polygons[old_index];material=obj.material_slots[old_face.material_index].material;role=kind(material)
    new_face.material_index={'detail':0,'paint':1,'glass':2}[role];new_face.use_smooth=True
    for new_loop,old_loop in zip(new_face.loop_indices,old_face.loop_indices):
     u,v=source_uv.data[old_loop].uv if source_uv else (0,0)
     if role=='detail':
      row,column=divmod(detail.index(material),columns);u=(column*tile+2+max(0,min(1,u))*(tile-4))/(columns*tile);v=(row*tile+2+max(0,min(1,v))*(tile-4))/(rows*tile)
     uv.data[new_loop].uv=(u,v);corner.append(normals[old_loop])
   data.normals_split_custom_set(corner)
   item=bpy.data.objects.new('cab-surface',data);bpy.context.collection.objects.link(item);item.parent=root
   if batch!='cab':
    item.parent=wheel_groups[batch];data.transform(Matrix.Translation(-item.parent.location))
   created.append(item)
 for obj in meshes:bpy.data.objects.remove(obj,do_unlink=True)
 if spec.get('cap'):
  bpy.ops.mesh.primitive_cube_add(size=1,location=(spec['cut']-spec['front'],0,(spec['cap']+.40)/2))
  cap=bpy.context.object;cap.name='cab-back';cap.dimensions=(.045,spec['width']*.94,spec['cap']-.40)
  bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);cap.data.materials.append(paint);cap.parent=root;created.append(cap)
  bevel=cap.modifiers.new('Folded panel edges','BEVEL');bevel.width=.045;bevel.segments=3;bpy.ops.object.modifier_apply(modifier=bevel.name)
 before=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in created)
 totals={parent:sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in created if o.parent==parent) for parent in [root,*wheel_groups.values()]}
 for obj in created:
  bpy.context.view_layer.objects.active=obj
  high=obj.copy();high.data=obj.data.copy();bpy.context.collection.objects.link(high);high.hide_render=True
  mesh=bmesh.new();mesh.from_mesh(obj.data)
  if obj.parent==root and obj.name!='cab-back':
   bmesh.ops.bisect_plane(mesh,geom=list(mesh.verts)+list(mesh.edges)+list(mesh.faces),plane_co=(spec['cut']-spec['front'],0,0),plane_no=(1,0,0),clear_outer=True,clear_inner=False)
   if name=='bonnet':bmesh.ops.bisect_plane(mesh,geom=list(mesh.verts)+list(mesh.edges)+list(mesh.faces),plane_co=(0,0,2.08),plane_no=(0,0,1),clear_outer=True,clear_inner=False)
  bmesh.ops.delete(mesh,geom=[v for v in mesh.verts if not v.link_faces],context='VERTS')
  mesh.to_mesh(obj.data);mesh.free()
  modifier=obj.modifiers.new('Web LOD','DECIMATE');modifier.ratio=min(1,(50000 if obj.parent==root else 2000)/max(1,totals[obj.parent]));modifier.use_collapse_triangulate=True
  bpy.ops.object.modifier_apply(modifier=modifier.name);obj.data.validate(clean_customdata=False)
  normals=obj.modifiers.new('Preserve authored surface normals','DATA_TRANSFER');normals.object=high;normals.use_loop_data=True;normals.data_types_loops={'CUSTOM_NORMAL'};normals.loop_mapping='POLYINTERP_NEAREST'
  bpy.ops.object.modifier_apply(modifier=normals.name)
  high_data=high.data;bpy.data.objects.remove(high,do_unlink=True);bpy.data.meshes.remove(high_data)
 # Join wheel fragments, retaining the side-specific source hub and tyre geometry.
 for side,group in wheel_groups.items():
  children=list(group.children)
  if not children:raise RuntimeError(f'{name}: no wheel on side {side}')
  bpy.ops.object.select_all(action='DESELECT')
  for item in children:item.select_set(True)
  bpy.context.view_layer.objects.active=children[0];bpy.ops.object.join();children[0].name='tyre'
 cab_meshes=[o for o in root.children if o.type=='MESH']
 bpy.ops.object.select_all(action='DESELECT')
 for item in cab_meshes:item.select_set(True)
 bpy.context.view_layer.objects.active=cab_meshes[0];bpy.ops.object.join();cab_meshes[0].name='cab'
 bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
 for obj in root.children_recursive:obj.select_set(True)
 dest=output/(name+'.glb')
 bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_extras=True,export_jpeg_quality=92)
 # Blender coordinates XYZ map to Three XZY; width excludes mirrors.
 result[name]={'file':name+'.glb','bodyWidth':spec['width'],'length':round(spec['cut']-spec['front']+.04,4),'radius':spec['radius'],'frontAxle':round(spec['axle']-spec['front'],4),'track':spec['track'],'head':spec['head'],'license':'CC-BY-4.0','bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()}
 print('CAB_READY '+name+' '+str(dest.stat().st_size),flush=True)
(output/'bases.json').write_text(json.dumps(result,indent=2)+'\n')
