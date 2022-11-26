import { PickingInfo } from "core/Collisions";
import type { Engine } from "core/Engines";
import { NullEngine } from "core/Engines";
import { Vector3 } from "core/Maths";
import type { Mesh } from "core/Meshes";
import { MeshBuilder } from "core/Meshes";
import { Scene } from "core/scene";

describe("PickingInfo", () => {
    let subject: Engine;
    let scene: Scene;
    let box: Mesh;
    let torusKnot: Mesh;

    beforeEach(() => {
        subject = new NullEngine({
            renderHeight: 256,
            renderWidth: 256,
            textureSize: 256,
            deterministicLockstep: false,
            lockstepMaxSteps: 1,
        });
        scene = new Scene(subject);

        torusKnot = MeshBuilder.CreateTorusKnot(
            "Knot",
            {
                radius: 10,
                tube: 3,
                radialSegments: 32,
                tubularSegments: 8,
                p: 2,
                q: 3,
            },
            scene
        );

        box = MeshBuilder.CreateBox("Box", { size: 1 }, scene);
    });

    describe("getNormal", () => {
        it("should return null when no intersection", () => {
            const pickingInfo = new PickingInfo();
            pickingInfo.pickedMesh = null;

            expect(pickingInfo.getNormal()).toBeNull();
        });

        it('should return null when "useVerticesNormals" is true and no normals', () => {
            const pickingInfo = new PickingInfo();

            box.isVerticesDataPresent = () => false;
            pickingInfo.pickedMesh = box;

            expect(pickingInfo.getNormal(true)).toBeNull();
        });

        it("should return null when no indices", () => {
            const pickingInfo = new PickingInfo();

            box.getIndices = () => null;
            pickingInfo.pickedMesh = box;

            expect(pickingInfo.getNormal()).toBeNull();
        });

        it("should return normal when useVerticesNormals is true", () => {
            const pickingInfo = new PickingInfo();
            pickingInfo.pickedMesh = box;
            pickingInfo.faceId = 0;
            pickingInfo.bu = 0.5;
            pickingInfo.bv = 0.5;

            const normalBox = pickingInfo.getNormal(false, true);

            expect(normalBox).toBeInstanceOf(Vector3);
            expect(normalBox!.x).toBeCloseTo(0);
            expect(normalBox!.y).toBeCloseTo(0);
            expect(normalBox!.z).toBeCloseTo(1);

            // And test with the knot

            pickingInfo.pickedMesh = torusKnot;

            const normal = pickingInfo.getNormal(false, true);

            expect(normal).toBeInstanceOf(Vector3);
            expect(normal!.x).toBeCloseTo(-0.84);
            expect(normal!.y).toBeCloseTo(-0.24);
            expect(normal!.z).toBeCloseTo(-0.48);
        });

        it("should return normal when useVerticesNormals is false", () => {
            const pickingInfo = new PickingInfo();
            pickingInfo.pickedMesh = box;
            pickingInfo.faceId = 0;
            pickingInfo.bu = 0.5;
            pickingInfo.bv = 0.5;

            const normalBox = pickingInfo.getNormal(false, false);

            expect(normalBox).toBeInstanceOf(Vector3);
            expect(normalBox!.x).toBeCloseTo(0);
            expect(normalBox!.y).toBeCloseTo(0);
            expect(normalBox!.z).toBeCloseTo(1);

            // And test with the knot

            pickingInfo.pickedMesh = torusKnot;

            const normal = pickingInfo.getNormal(false, false);

            expect(normal).toBeInstanceOf(Vector3);
            expect(normal!.x).toBeCloseTo(-0.89);
            expect(normal!.y).toBeCloseTo(-0.08);
            expect(normal!.z).toBeCloseTo(-0.45);
        });
    });
});
