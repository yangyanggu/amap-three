import {
  PerspectiveCamera,
  OrthographicCamera,
  WebGLRenderer,
  Scene,
  Cache,
} from 'three';
import Event from '../event'
import {clearScene} from "../../utils/threeUtil";
import type {Camera} from 'three';

export interface ThreeLayerOptions{
  zIndex?: number
  visible?: boolean //  是否显示
  zooms?: number[] // 支持的缩放级别范围，默认范围 [2, 20]
  opacity?: number // 透明度，默认1
  alpha?: boolean // canvas是否包含alpha (透明度)。默认为 false
  antialias?: boolean //是否执行抗锯齿。默认为false
  customCoordsCenter?: number[] // 默认gl自定义图层渲染的中心点
  onInit?: (render: WebGLRenderer, scene: Scene, camera: Camera) => void // 初始化完成做处理，主要用于GlCustom的init执行后做一些处理
  onRender?: (render: WebGLRenderer, scene: Scene, camera: Camera) => void // 渲染时候执行，用于替换默认的render，可以扩展后期处理等功能
  createCanvas?: boolean // 是否额外创建canvas用于渲染threejs
  preserveDrawingBuffer?: boolean // createCanvas为true的时候生效
}

class ThreeLayer extends Event{
  customCoords: any
  center: number[] // 图层显示的中心点，默认是初始化时的地图中心，尽量使用模型的第一个点
  layer: any // GLCustomLayer图层实例
  renderer?: WebGLRenderer;
  camera?: PerspectiveCamera | OrthographicCamera; // 相机实例
  scene?: Scene; //场景实例
  options: ThreeLayerOptions //初始化参数
  map: any; // 地图实例
  frameTimer = -1; // 刷新图层的定时器
  needsUpdate = false; //是否需要更新图层，默认false
  canvas?: HTMLCanvasElement; // customLayer时缓存canvas对象用于后续绑定事件

  constructor(map: any, options?: ThreeLayerOptions) {
    super();
    options = options || {};
    this.customCoords = (map as any).customCoords;
    this.center = options.customCoordsCenter || map.getCenter().toArray();
    this.customCoords.lngLatsToCoords([
      this.center
    ])
    const defaultOptions = {
      zooms: [2,20],
      opacity: 1,
      alpha: false,
      antialias: false,
      visible: true,
      zIndex: 120,
      createCanvas: false,
      preserveDrawingBuffer: false
    }
    this.options = Object.assign({}, defaultOptions, options);
    this.map = map;
    this.init();
  }

  init() {
    const options = this.options;
    if(!options.createCanvas){
      this.createGlCustomLayer();
    }else{
      this.createCustomCanvasLayer();
    }
  }

  createGlCustomLayer(){
    const options = this.options;
    const map = this.map;
    const layerOptions = {
      zooms: options.zooms,
      opacity: options.opacity,
      visible: options.visible,
      zIndex: options.zIndex,
      init: (gl) => {
        // 这里我们的地图模式是 3D，所以创建一个透视相机，相机的参数初始化可以随意设置，因为在 render 函数中，每一帧都需要同步相机参数，因此这里变得不那么重要。
        // 如果你需要 2D 地图（viewMode: '2D'），那么你需要创建一个正交相机
        const container = map.getContainer();
        const width = container.offsetWidth;
        const height = container.offsetHeight;
        let camera;
        if (map.getView().type === '3D') {
          camera = new PerspectiveCamera(60, width / height, 100, 1 << 30);
        } else {
          camera = new OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 1000);
        }
        const renderer = new WebGLRenderer({
          context: gl, // 地图的 gl 上下文
          alpha: options.alpha,
          antialias: options.antialias
          // canvas: gl.canvas,
        });
        renderer.setSize(width, height);

        // 自动清空画布这里必须设置为 false，否则地图底图将无法显示
        renderer.autoClear = false;
        const scene = new Scene();
        this.camera = camera;
        this.renderer = renderer;
        this.scene = scene;
        if(options.onInit){
          options.onInit(renderer,scene,camera);
        }
        this.animate();
        this.emit('complete');
      },
      render: () => {
        // 这里必须执行！！重新设置 three 的 gl 上下文状态。
        this.renderer?.resetState();
        this.customCoords.setCenter(this.center);
        const camera = this.camera;
        // 2D 地图下使用的正交相机
        if (map.getView().type === '3D') {
          const {near, far, fov, up, lookAt, position} = this.customCoords.getCameraParams() as {
            near: number;
            far: number;
            fov: number;
            up: [number, number,number];
            lookAt: [number, number,number];
            position: [number, number,number]
          };
          // 2D 地图下使用的正交相机
          // 这里的顺序不能颠倒，否则可能会出现绘制卡顿的效果。
          (camera as PerspectiveCamera).near = near;
          (camera as PerspectiveCamera).far = far;
          (camera as PerspectiveCamera).fov = fov;
          (camera as PerspectiveCamera).position.set(...position);
          (camera as PerspectiveCamera).up.set(...up);
          (camera as PerspectiveCamera).lookAt(...lookAt);
          (camera as PerspectiveCamera).updateProjectionMatrix();
        } else {
          const {top, bottom, left, right, position} = this.customCoords.getCameraParams() as {
            top: number;
            bottom: number;
            left: number;
            right: number;
            position: [number, number, number]
          };
          // 2D 地图使用的正交相机参数赋值
          (camera as OrthographicCamera).top = top;
          (camera as OrthographicCamera).bottom = bottom;
          (camera as OrthographicCamera).left = left;
          (camera as OrthographicCamera).right = right;
          (camera as OrthographicCamera).position.set(...position);
          (camera as OrthographicCamera).updateProjectionMatrix();
        }
        this.camera = camera;
        if(options.onRender){
          options.onRender(this.renderer as WebGLRenderer,this.scene as Scene,this.camera as Camera);
        }else{
          this.renderer?.render(this.scene as Scene, camera as Camera);
        }
        this.renderer?.resetState();
      }
    }
    this.layer = new AMap.GLCustomLayer(layerOptions);
    this.layer.setMap(map);
  }

  createCustomCanvasLayer(){
    const options = this.options;
    const map = this.map;
    const canvas = document.createElement('canvas');
    this.canvas = canvas;
    // 这里我们的地图模式是 3D，所以创建一个透视相机，相机的参数初始化可以随意设置，因为在 render 函数中，每一帧都需要同步相机参数，因此这里变得不那么重要。
    // 如果你需要 2D 地图（viewMode: '2D'），那么你需要创建一个正交相机
    const container = map.getContainer();
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    let camera;
    if (map.getView().type === '3D') {
      camera = new PerspectiveCamera(60, width / height, 100, 1 << 30);
    } else {
      camera = new OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 1000);
    }
    const renderer = new WebGLRenderer({
      alpha: options.alpha,
      antialias: options.antialias,
      canvas,
      preserveDrawingBuffer: options.preserveDrawingBuffer
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);

    // 自动清空画布这里必须设置为 false，否则地图底图将无法显示
    const scene = new Scene();
    this.camera = camera;
    this.renderer = renderer;
    renderer.setClearColor(0x000000,0)
    this.scene = scene;
    const layerOptions = {
      zooms: options.zooms,
      opacity: options.opacity,
      visible: options.visible,
      zIndex: options.zIndex,
      alwaysRender: true,
      render: () => {
        this.customCoords.setCenter(this.center);
        const camera = this.camera;
        // 2D 地图下使用的正交相机
        if (map.getView().type === '3D') {
          const {near, far, fov, up, lookAt, position} = this.customCoords.getCameraParams() as {
            near: number;
            far: number;
            fov: number;
            up: [number, number,number];
            lookAt: [number, number,number];
            position: [number, number,number]
          };
          // 2D 地图下使用的正交相机
          // 这里的顺序不能颠倒，否则可能会出现绘制卡顿的效果。
          (camera as PerspectiveCamera).near = near;
          (camera as PerspectiveCamera).far = far;
          (camera as PerspectiveCamera).fov = fov;
          (camera as PerspectiveCamera).position.set(...position);
          (camera as PerspectiveCamera).up.set(...up);
          (camera as PerspectiveCamera).lookAt(...lookAt);
          (camera as PerspectiveCamera).updateProjectionMatrix();
        } else {
          const {top, bottom, left, right, position} = this.customCoords.getCameraParams() as {
            top: number;
            bottom: number;
            left: number;
            right: number;
            position: [number, number, number]
          };
          // 2D 地图使用的正交相机参数赋值
          (camera as OrthographicCamera).top = top;
          (camera as OrthographicCamera).bottom = bottom;
          (camera as OrthographicCamera).left = left;
          (camera as OrthographicCamera).right = right;
          (camera as OrthographicCamera).position.set(...position);
          (camera as OrthographicCamera).updateProjectionMatrix();
        }
        this.camera = camera;
        if(options.onRender){
          options.onRender(this.renderer as WebGLRenderer,this.scene as Scene,this.camera as Camera);
        }else{
          this.renderer?.render(this.scene as Scene, camera as Camera);
        }
      }
    }
    this.layer = new AMap.CustomLayer(canvas, layerOptions);
    this.layer.setMap(map);
    setTimeout(() => {
      if(options.onInit){
        options.onInit(renderer,scene,camera);
      }
      this.animate();
      this.emit('complete');
    }, 10)
  }

  update(){
    this.needsUpdate = true;
  }

  animate() {
    if (this.needsUpdate) {
      if(this.options.createCanvas){
        if(this.options.onRender){
          this.options.onRender(this.renderer as WebGLRenderer,this.scene as Scene,this.camera as Camera);
        }else{
          this.renderer?.render(this.scene as Scene, this.camera as Camera);
        }
      }else{
        this.refreshMap();
      }
      this.needsUpdate = false;
    }
    this.frameTimer = requestAnimationFrame(() => {
      this.animate();
    });
  }

  refreshMap() {
    if (this.map) {
      this.map.render();
    }
  }

  convertLngLat(lnglat) {
    this.customCoords.setCenter(this.center)
    const data = this.customCoords.lngLatsToCoords([
      lnglat
    ]);
    return data[0];
  }

  // 往场景中添加对象
  add(object) {
    this.scene?.add(object);
    this.refreshMap();
  }

  // 从场景中移除对象
  remove(object) {
    this.scene?.remove(object);
    this.refreshMap();
  }

  getScene() {
    return this.scene
  }

  getCamera() {
    return this.camera;
  }

  getRender() {
    return this.renderer;
  }

  destroy() {
    cancelAnimationFrame(this.frameTimer);
    this.layer.setMap(null);
    this.customCoords = null;
    clearScene(this.scene);
    this.scene = undefined;
    this.camera = undefined;
    this.renderer?.dispose();
    this.renderer = undefined;
    this.layer = null;
    this.map = null;
    Cache.clear();
    this.options = null as any;
  }

  getMap(){
    if(this.map){
      return this.map;
    }
    return null;
  }

  getOpacity() : number{
    return this.layer.getOpacity();
  }

  setOpacity(opacity: number){
    this.layer.setOpacity(opacity);
  }

  getZooms() : number[]{
    return this.layer.getZooms();
  }

  setZooms(zooms: number[]){
    this.layer.setZooms(zooms);
  }

  getzIndex() : number{
    return this.layer.getzIndex();
  }

  setzIndex(zIndex: number){
    this.layer.setzIndex(zIndex);
  }

  show(){
    this.layer.show();
  }

  hide(){
    this.layer.hide();
  }

}

export {ThreeLayer}
