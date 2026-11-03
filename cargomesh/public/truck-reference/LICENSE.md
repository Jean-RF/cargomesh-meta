# CargoMesh truck reference prototype

`hgv.glb` is a derivative of the CARLA vehicle `boxtruck.glb` distributed in Valdrada v0.6.2. It is not an original vehicle mesh authored by Juan.

Attribution: **CARLA Simulator (carla.org), CC BY 4.0**. Conversion by **M. K. Turkcan / Valdrada**. Web adaptation by **CargoMesh / Juan**.

- License: https://creativecommons.org/licenses/by/4.0/
- CARLA assets licensing: https://github.com/carla-simulator/carla#license
- Valdrada licensing: https://github.com/mkturkcan/valdrada/blob/main/LICENSING.md
- Source revision: https://huggingface.co/datasets/mehmetkeremturkcan/valdrada/blob/v0.6.2/Content/models/fleet24/boxtruck.glb
- Download: https://huggingface.co/datasets/mehmetkeremturkcan/valdrada/resolve/v0.6.2/Content/models/fleet24/boxtruck.glb
- Source SHA-256: `bf2a6e9617b873635c2f9a9e8e084cfa73437af37b4965ed6cc7f4ae43714d79`

Changes: kept LOD0 only; decoded compressed vertex attributes to floats; decoded/resized textures to 1024px (PNG normal maps, JPEG for other maps); rotated the vehicle toward -X and grounded it without changing its proportions; reduced geometry to 189,987 triangles in Blender 5.2.3; validated degenerate faces; adjusted paint clearcoat and headlamp lens/reflector materials. Images are embedded; Meshopt/KTX2 runtime decoders are not required. Source, attribution and changes also appear in the GLB's node extras.

The supplied three-LOD source was 17,078,972 bytes. This derivative is 12,052,440 bytes, 10 mesh primitives and 14 embedded images. SHA-256: `07af1d9ea4ffb08efe8b599c595200ce22f55d61e9f07d76d7024adfef545cf7`.

This vehicle-only prototype does not include Valdrada's city data, pedestrians or MetaHuman assets. The HDR lighting uses the existing Poly Haven resource, whose attribution is in `/truck-materials/LICENSE.md`. No endorsement by a vehicle manufacturer, CARLA or Valdrada is implied. This is a visual simulator asset, not certified OEM CAD, a capacity record or a finished replacement for the 60 CargoMesh models.
