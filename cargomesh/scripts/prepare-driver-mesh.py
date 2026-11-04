"""Extract the CC0 Blender Studio human topology; Blender is an offline authoring tool only."""
import bpy, hashlib, json, pathlib, sys

source = pathlib.Path(sys.argv[sys.argv.index('--') + 1])
target = pathlib.Path(__file__).resolve().parents[1] / 'src/features/truck-collection/driver-base.json'
bpy.ops.wm.open_mainfile(filepath=str(source))
female = '--female' in sys.argv[sys.argv.index('--') + 2:]
if female:
    target = target.with_name('driver-base-female.json')
male = bpy.data.objects['GEO-body_male_realistic']
body = bpy.data.objects['GEO-body_female_realistic'] if female else male
mesh = body.data
mesh.calc_loop_triangles()

def seated_basis(vertex):
    if not female:
        return vertex.co
    # Match the existing arm, foot and eye anchors while retaining the female face.
    x, y, z = vertex.co
    standard = male.data.vertices[vertex.index].co
    shoulder = min(1, max(0, (standard.z - 1.27) / .19))
    blend = shoulder * shoulder * (3 - 2 * shoulder)
    return standard.lerp(type(vertex.co)((x, y, z + .03927)), blend)
result = {
    'source': 'Blender Studio Human Base Meshes 1.4.1 / Dan Ulrich / CC0-1.0' + (' / realistic female' if female else ''),
    'blendSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'positions': [round(float(c), 5) for v in mesh.vertices for c in seated_basis(v)],
    'indices': [int(v) for t in mesh.loop_triangles for v in t.vertices],
}
assert len(result['positions']) == 10582 * 3
assert len(result['indices']) > 50000
target.write_text(json.dumps(result, separators=(',', ':')), encoding='utf-8')
print('DRIVER_MESH', target, target.stat().st_size)
