import * as KTX2 from "core/Materials/Textures/ktx2decoderTypes";

import { Transcoder } from "../transcoder";
import type { KTX2FileReader, IKTX2_ImageDesc } from "../ktx2FileReader";
import { WASMMemoryManager } from "../wasmMemoryManager";

declare let MSC_TRANSCODER: any;

declare function importScripts(...urls: string[]): void;

/**
 * @internal
 */
export class MSCTranscoder extends Transcoder {
    /**
     * URL to use when loading the MSC transcoder
     */
    public static JSModuleURL = "https://cdn.babylonjs.com/ktx2Transcoders/1/msc_basis_transcoder.js";
    /**
     * URL to use when loading the wasm module for the transcoder
     */
    public static WasmModuleURL = "https://cdn.babylonjs.com/ktx2Transcoders/1/msc_basis_transcoder.wasm";

    /**
     * Binary data of the wasm module
     */
    public static WasmBinary: ArrayBuffer | null = null;

    /**
     * MSC transcoder module, if provided externally
     */
    public static JSModule: any = null;

    public static UseFromWorkerThread = true;

    public static override Name = "MSCTranscoder";

    public override getName(): string {
        return MSCTranscoder.Name;
    }

    private _mscBasisTranscoderPromise: Promise<void>;
    private _mscBasisModule: any;

    private _getMSCBasisTranscoder(): Promise<void> {
        if (this._mscBasisTranscoderPromise) {
            return this._mscBasisTranscoderPromise;
        }

        this._mscBasisTranscoderPromise = (
            MSCTranscoder.WasmBinary ? Promise.resolve(MSCTranscoder.WasmBinary) : WASMMemoryManager.LoadWASM(Transcoder.GetWasmUrl(MSCTranscoder.WasmModuleURL))
        ).then((wasmBinary) => {
            if (MSCTranscoder.JSModule && typeof MSC_TRANSCODER === "undefined") {
                // this must be set on the global scope for the MSC transcoder to work. Mainly due to back-compat with the old way of loading the MSC transcoder.
                (globalThis as any).MSC_TRANSCODER = MSCTranscoder.JSModule;
            } else {
                if (MSCTranscoder.UseFromWorkerThread) {
                    importScripts(Transcoder.GetWasmUrl(MSCTranscoder.JSModuleURL));
                }
                // Worker Number = 0 and MSC_TRANSCODER has not been loaded yet.
                else if (typeof MSC_TRANSCODER === "undefined") {
                    return new Promise((resolve, reject) => {
                        const head = document.getElementsByTagName("head")[0];
                        const script = document.createElement("script");
                        script.setAttribute("type", "text/javascript");
                        script.setAttribute("src", Transcoder.GetWasmUrl(MSCTranscoder.JSModuleURL));

                        script.onload = () => {
                            MSC_TRANSCODER({ wasmBinary }).then((basisModule: any) => {
                                basisModule.initTranscoders();
                                this._mscBasisModule = basisModule;
                                resolve();
                            });
                        };

                        script.onerror = () => {
                            reject("Can not load MSC_TRANSCODER script.");
                        };

                        head.appendChild(script);
                    });
                }
            }

            return new Promise((resolve) => {
                MSC_TRANSCODER({ wasmBinary }).then((basisModule: any) => {
                    basisModule.initTranscoders();
                    this._mscBasisModule = basisModule;
                    resolve();
                });
            });
        });

        return this._mscBasisTranscoderPromise;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public static override CanTranscode(src: KTX2.SourceTextureFormat, dst: KTX2.TranscodeTarget, isInGammaSpace: boolean): boolean {
        return true;
    }

    public override transcode(
        src: KTX2.SourceTextureFormat,
        dst: KTX2.TranscodeTarget,
        level: number,
        width: number,
        height: number,
        uncompressedByteLength: number,
        ktx2Reader: KTX2FileReader,
        imageDesc: IKTX2_ImageDesc | null,
        encodedData: Uint8Array
    ): Promise<Uint8Array | null> {
        const isVideo = false;

        return this._getMSCBasisTranscoder().then(() => {
            const basisModule = this._mscBasisModule;

            let transcoder: any;
            let imageInfo: any;
            let result: any;
            let textureData: any = null;

            try {
                transcoder = src === KTX2.SourceTextureFormat.UASTC4x4 ? new basisModule.UastcImageTranscoder() : new basisModule.BasisLzEtc1sImageTranscoder();
                const texFormat = src === KTX2.SourceTextureFormat.UASTC4x4 ? basisModule.TextureFormat.UASTC4x4 : basisModule.TextureFormat.ETC1S;

                imageInfo = new basisModule.ImageInfo(texFormat, width, height, level);

                const targetFormat = basisModule.TranscodeTarget[KTX2.TranscodeTarget[dst]]; // works because the labels of the sourceTextureFormat enum are the same as the property names used in TranscodeTarget!

                if (!basisModule.isFormatSupported(targetFormat, texFormat)) {
                    throw new Error(
                        `MSCTranscoder: Transcoding from "${KTX2.SourceTextureFormat[src]}" to "${KTX2.TranscodeTarget[dst]}" not supported by current transcoder build.`
                    );
                }

                if (src === KTX2.SourceTextureFormat.ETC1S) {
                    const sgd = ktx2Reader.supercompressionGlobalData;

                    transcoder.decodePalettes(sgd.endpointCount, sgd.endpointsData, sgd.selectorCount, sgd.selectorsData);
                    transcoder.decodeTables(sgd.tablesData);

                    imageInfo.flags = imageDesc!.imageFlags;
                    imageInfo.rgbByteOffset = 0;
                    imageInfo.rgbByteLength = imageDesc!.rgbSliceByteLength;
                    imageInfo.alphaByteOffset = imageDesc!.alphaSliceByteOffset > 0 ? imageDesc!.rgbSliceByteLength : 0;
                    imageInfo.alphaByteLength = imageDesc!.alphaSliceByteLength;

                    result = transcoder.transcodeImage(targetFormat, encodedData, imageInfo, 0, isVideo);
                } else {
                    imageInfo.flags = 0;
                    imageInfo.rgbByteOffset = 0;
                    imageInfo.rgbByteLength = uncompressedByteLength;
                    imageInfo.alphaByteOffset = 0;
                    imageInfo.alphaByteLength = 0;

                    result = transcoder.transcodeImage(targetFormat, encodedData, imageInfo, 0, ktx2Reader.hasAlpha, isVideo);
                }
            } finally {
                if (transcoder) {
                    transcoder.delete();
                }

                if (imageInfo) {
                    imageInfo.delete();
                }

                if (result && result.transcodedImage) {
                    textureData = result.transcodedImage.get_typed_memory_view().slice();
                    result.transcodedImage.delete();
                }
            }

            return textureData;
        });
    }
}
