import type {GLTF} from "three/examples/jsm/loaders/GLTFLoader";

export {};

declare global {
    interface Window {
        // 缓存模型
        _THREE_GLTF_CACHE: Record<string, {
            loaded: boolean, // 判断是否已经加载完成
            model?: GLTF // 加载完成后的模型对象
        }>
    }
}