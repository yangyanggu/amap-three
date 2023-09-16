import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AnimationMixer, Clock} from 'three';
import BaseEvent from '../event';
import {clearGroup} from '../../utils/threeUtil';
import type {AnimationClip, Group} from 'three';
import type {GLTF} from "three/examples/jsm/loaders/GLTFLoader";

interface Vec {
  x: number
  y: number
  z: number
}

export interface GltfOptions {
  url: string //模型下载地址
  position: number[] // 模型的经纬度
  height: number  // 高度，模型的离地高度
  rotation: Vec // 模型旋转角度
  scale: number | Vec  //模型缩放级别，可以整体缩放和按X Y Z缩放
  angle: number //  模型旋转角度
  configLoader: (loader: GLTFLoader) => void // 配置loader，用于添加draco等扩展
  onLoaded: (gltf: Group, animations:  AnimationClip[]) => void // gltf加载并且处理完成后回调
  useModelCache: boolean // 是否启用模型缓存，开启后模型批量加载同一个模型地址时只有第一个执行下载，后续模型将直接使用clone能力。
}

class ThreeGltf extends BaseEvent{
  object: any; // 加载模型后的Object3D对象
  animations: any; // 模型的动画
  layer: any; // threejs的图层对象
  linerAnimationFrame = -1; //gltf动画
  getModelTimer: any

  constructor(layer: any, options: GltfOptions) {
    super();
    this.layer = layer;
    const defaultOptions = {
      url: '',
      position: [0,0],
      height: 0,
      rotation: {
        x: 0,
        y: 0,
        z: 0
      },
      scale: 1,
      angle: 0,
      useModelCache: false
    }
    options = Object.assign({}, defaultOptions, options);
    this.init(options);
  }

  init(options: GltfOptions) {
    // 判断是否使用缓存
    if(options.useModelCache){
      // 初始化全局缓存对象
      window._THREE_GLTF_CACHE = window._THREE_GLTF_CACHE || {};
      // 如果存在该url的缓存，则直接使用，不进行gltfLoader加载
      if(window._THREE_GLTF_CACHE[options.url]){
        // 判断模型是否加载完成
        if(window._THREE_GLTF_CACHE[options.url].loaded){
          const gltf = window._THREE_GLTF_CACHE[options.url].model as GLTF;
          this._loadModel(gltf.scene.clone(true),gltf.animations.map(item => item.clone()),options);
        }else{
          // 模型还未加载完成，延时后继续尝试加载
          this.getModelTimer = setTimeout(() => {
            this.init(options);
          }, 100)
        }
      }else {
        // 初始化对象并锁住缓存
        window._THREE_GLTF_CACHE[options.url] = {
          loaded: false
        }
        const loader = new GLTFLoader(); // 读取模型
        if (options.configLoader){
          options.configLoader(loader)
        }
        loader.load(options.url, (gltf) => {
          // 将缓存放入全局
          window._THREE_GLTF_CACHE[options.url].model = gltf;
          window._THREE_GLTF_CACHE[options.url].loaded = true;
          this._loadModel(gltf.scene.clone(true),gltf.animations.map(item => item.clone()),options);
        });
      }
    }
    // 不使用缓存直接加载模型
    else{
      const loader = new GLTFLoader(); // 读取模型
      if (options.configLoader){
        options.configLoader(loader)
      }
      loader.load(options.url, (gltf) => {
        this._loadModel(gltf.scene,gltf.animations,options);
      });
    }

  }

  _loadModel(object: Group, animations: AnimationClip[], options: GltfOptions){
    this.layer.add(object);
    this.object = object;
    this.animations = animations;
    this.setScale(options.scale);
    this.setRotation(options.rotation);
    this.setAngle(options.angle);
    this.setPosition(options.position);
    this.setHeight(options.height);
    if(options.onLoaded){
      options.onLoaded(object,animations);
    }
    this.emit('complete', {
      target: object,
      animations
    });
  }

  setScale(scale: number | Vec) {
    let scaleVec: Vec;
    if (typeof scale === 'number') {
      scaleVec = {
        x: scale,
        y: scale,
        z: scale
      };
    } else {
      scaleVec = scale;
    }
    this.object.scale.set(scaleVec.x, scaleVec.y, scaleVec.z);
    this.refresh();
  }

  setPosition(position) {
    const positionConvert = this.layer.convertLngLat(position);
    this.object.position.setX(positionConvert[0]);
    this.object.position.setY(positionConvert[1]);
    this.refresh();
  }

  setRotation(rotation: Vec) {
    if (rotation) {
      const x = Math.PI / 180 * (rotation.x || 0);
      const y = Math.PI / 180 * (rotation.y || 0);
      const z = Math.PI / 180 * (rotation.z || 0);
      this.object.rotation.set(x, y, z);
      this.refresh();
    }
  }

  setAngle(angle: number) {
    const x = this.object.rotation.x;
    const z = this.object.rotation.z;
    const y = Math.PI / 180 * angle;
    this.object.rotation.set(x, y, z);
    this.refresh();
  }

  setHeight(height) {
    if (height !== undefined) {
      this.object.position.setZ(height);
      this.refresh();
    }
  }

  getAnimations() {
    return this.animations;
  }

  getObject() {
    return this.object;
  }

  refresh() {
    this.layer.update();
  }

  show() {
    this.object.visible = true;
    this.refresh();
  }

  hide() {
    this.object.visible = false;
    this.refresh();
  }

  animate(callback) {
    this.linerAnimationFrame = requestAnimationFrame(() => {
      this.animate(callback);
    });
    callback();
  }

  startAnimations() {
    if (this.animations) {
      const animations = this.animations;
      const mixer = new AnimationMixer(this.object);
      const actions = {};
      for (let i = 0; i < animations.length; i++) {
        const clip = animations[i];
        actions[clip.name] = mixer.clipAction(clip);
      }
      const clock = new Clock();
      for (const name in actions) {
        actions[name].play();
      }
      this.animate(() => {
        const dt = clock.getDelta();
        if (mixer) mixer.update(dt);
        this.refresh();
      });
    }
  }

  stopAnimations() {
    cancelAnimationFrame(this.linerAnimationFrame);
  }

  remove(){
    if (this.object) {
      this.layer.remove(this.object);
    }
  }

  destroy() {
    this.stopAnimations();
    if (this.object) {
      clearGroup(this.object);
      this.object = null;
      this.layer = null;
    }
  }
}

export {ThreeGltf}
