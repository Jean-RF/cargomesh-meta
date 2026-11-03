"""Extract the CC0 Blender Studio human topology; Blender is an offline authoring tool only."""
import bpy, hashlib, json, pathlib, sys

source = pathlib.Path(sys.argv[sys.argv.index('--') + 1])
target = pathlib.Path(__file__).resolve().parents[1] / 'src/features/truck-collection/driver-base.json'
bpy.ops.wm.open_mainfile(filepath=str(source))
body = bpy.data.objects['GEO-body_male_realistic']
mesh = body.data
mesh.calc_loop_triangles()
result = {
    'source': 'Blender Studio Human Base Meshes 1.4.1 / Dan Ulrich / CC0-1.0',
    'blendSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'positions': [round(float(c), 5) for v in mesh.vertices for c in v.co],
    'indices': [int(v) for t in mesh.loop_triangles for v in t.vertices],
}
assert len(result['positions']) == 10582 * 3
assert len(result['indices']) > 50000
target.write_text(json.dumps(result, separators=(',', ':')), encoding='utf-8')
print('DRIVER_MESH', target, target.stat().st_size)
