# @vuemap/three-layer
[![npm (tag)](https://img.shields.io/npm/v/@vuemap/three-layer)](https://www.npmjs.org/package/@vuemap/three-layer)
[![NPM downloads](http://img.shields.io/npm/dm/@vuemap/three-layer.svg)](https://npmjs.org/package/@vuemap/three-layer)
![JS gzip size](http://img.badgesize.io/https://unpkg.com/@vuemap/three-layer/dist/index.js?compression=gzip&label=gzip%20size:%20JS)
[![NPM](https://img.shields.io/npm/l/@vuemap/three-layer)](https://github.com/yangyanggu/amap-three)
[![star](https://badgen.net/github/stars/yangyanggu/amap-three)](https://github.com/yangyanggu/amap-three)

### 示例
[codepen示例](https://codepen.io/yangyanggu/pen/jOxyJqp)

### 简介
本项目为高德地图的threejs图层插件，包含ThreeLayer图层、ThreeGltf加载

### 加载方式
当前项目支持CDN加载和npm加载两种方式。

#### CDN加载
CDN加载需要先加载高德地图JS和threejs的库，代码如下
```js
<!--加载高德地图JS 2.0 -->
<script src = 'https://webapi.amap.com/maps?v=2.0&key=YOUR_KEY'></script>
<!--加载threejs -->
<script src="https://cdn.jsdelivr.net/npm/three@0.143/build/three.js"></script>
<!--加载threejs的GLTFLoader -->
<script src="https://cdn.jsdelivr.net/npm/three@0.143/examples/js/loaders/GLTFLoader.js"></script>
<!--加载three-layer插件 -->
<script src="https://cdn.jsdelivr.net/npm/@vuemap/three-layer/dist/index.js"></script>
```

#### npm加载
npm加载可以直接使用安装库
```shell
npm install '@vuemap/three-layer'
```

### 使用示例

#### CDN方式
```js
<script src = 'https://webapi.amap.com/maps?v=2.0&key=YOUR_KEY'></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.143/build/three.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.143/examples/js/loaders/GLTFLoader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.143/examples/js/loaders/DRACOLoader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@vuemap/three-layer/dist/index.js"></script>
<script type="text/javascript">
  const map = new AMap.Map('app', {
      center: [120,31],
      zoom: 14,
      viewMode: '3D',
      pitch: 35
    })
  const layer = new AMap.ThreeLayer(map)
  layer.on('complete', () => {
      const light = new THREE.AmbientLight('#ffffff', 1);
      layer.add(light);
      const gltf = new AMap.ThreeGltf(layer, {
          url: 'https://a.amap.com/jsapi_demos/static/gltf/Duck.gltf',
          configLoader: (loader) =>{
              const dracoLoader = new THREE.DRACOLoader()
              dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.143/examples/js/libs/draco/');
              loader.setDRACOLoader( dracoLoader );
          },
          position: [120, 31],
          scale: 800,
          rotation: {
              x:90,
              y:0,
              z:0
          }
      })
      console.log('layer: ', layer)
      console.log('gltf: ', gltf)
  })
</script>
```

#### npm方式
```js
import {AmbientLight} from 'three'
import {ThreeLayer, ThreeGltf} from '@vuemap/three-layer'
const map = new AMap.Map('app', {
  center: [120,31],
  zoom: 14,
  viewMode: '3D',
  pitch: 35
})
const layer = new ThreeLayer(map)
layer.on('complete', () => {
  const light = new AmbientLight('#ffffff', 1);
  layer.add(light);
  const gltf = new ThreeGltf(layer, {
    url: 'https://a.amap.com/jsapi_demos/static/gltf/Duck.gltf',
    position: [120, 31],
    scale: 800,
    rotation: {
      x:90,
      y:0,
      z:0
    }
  })
  console.log('layer: ', layer)
  console.log('gltf: ', gltf)
})
```

### API文档说明

#### ThreeLayer图层说明
基于threejs实现的three图层类，提供了基础的添加、删除物体、转换坐标等功能<br/>
``  new AMap.ThreeLayer(map: AMap.Map, options: ThreeLayerOptions)  ``<br/>
###### 参数说明
map: 地图实例对象<br/>
options: ThreeLayer初始化参数，参数内容如下：

| 属性名                   | 属性类型                                                          | 属性描述                                                     |
|-----------------------|---------------------------------------------------------------|----------------------------------------------------------|
| zIndex                | Number                                                        | 图层的层级，默认为 120                                            |
| visible               | Boolean                                                       | 图层是否可见，默认为 true                                          |
| zooms                 | [Number,Number]                                               | 图层缩放等级范围，默认 [2, 20]                                      |
| opacity               | Number                                                        | 图层透明度，默认为 1                                              |
| alpha                 | Boolean                                                       | canvas是否包含alpha (透明度)。默认为 false                          |
| antialias             | Boolean                                                       | 是否执行抗锯齿。默认为false                                         |
| customCoordsCenter    | [Number,Number]                                               | gl自定义图层渲染的中心点，默认为初始化时的地图中心点                              |
| onInit                | Function(render: WebGLRenderer, scene: Scene, camera: Camera) | GlCustomLayer的init执行后触发回调，用于扩展处理能力                       |
| onRender              | render: WebGLRenderer, scene: Scene, camera: Camera)          | GlCustomLayer的render触发时触发该回调，用于替换刷新功能，可以用于增加threejs的后期处理 | 
| createCanvas          | Boolean                                                       | 是否额外创建canvas用于渲染threejs ，默认false                         |
| preserveDrawingBuffer | Boolean                                                       | createCanvas为true的时候生效                                   |

###### 成员函数

| 函数名           | 入参                                 | 返回值                                              | 描述                                 |
|---------------|------------------------------------|--------------------------------------------------|------------------------------------|
| update        | 无                                  | 无                                                | 更新图层，执行后将在下次帧刷新时更新图层               |
| convertLngLat | [Number,Number] (经纬度)              | [Number,Number]                                  | 将经纬度转化为世界坐标                        |
| add           | Object(threejs的对象，包括灯光、Object3D等等) | 无                                                | 添加对象到场景中，支持所有可添加到场景的对象             |
| remove        | Object                             | 无                                                | 从场景中移除对象                           |
| getScene      | 无                                  | THREE.Scene                                      | 获取Threejs的场景对象                     |
| getCamera     | 无                                  | THREE.PerspectiveCamera或THREE.OrthographicCamera | 获取Threejs的相机对象，根据viewMode不同获取的相机不同 |
| getRender     | 无                                  | THREE.WebGLRenderer                              | 获取Threejs的webglRender              |
| getMap        | 无                                  | AMap.Map                                         | 获取地图实例                             |
| getOpacity    | 无                                  | Number                                           | 获取图层透明度                            |
| setOpacity    | Number                             | 无                                                | 设置图层透明度 值范围：0 - 1                  |
| getZooms      | 无                                  | [Number,Number]                                  | 获取显示层级范围                           |
| setZooms      | [Number,Number]                    | 无                                                | 设置图层显示的层级范围                        |
| getzIndex     | 无                                  | Number                                           | 获取图层层级                             |
| setzIndex     | Number                             | 无                                                | 设置图层层级                             |
| show          | 无                                  | 无                                                | 显示图层                               |
| hide          | 无                                  | 无                                                | 隐藏图层                               |
| destroy       | 无                                  | 无                                                | 销毁图层                               |

###### 事件列表

| 事件名 | 参数 | 描述 |
| ---- | ---- | ---- |
| complete | 无 | 图层初始化成功 |

#### ThreeGltf类说明
基于threejs实现的GLTF加载类，提供了基础的gltf模型加载，位置移动、缩放、旋转、高度等功能<br/>
``  new AMap.ThreeGltf(layer: AMap.ThreeLayer, options: ThreeGltfOptions)  ``<br/>
###### 参数说明
layer: ThreeLayer实例对象<br/>
options: ThreeGltf初始化参数，参数内容如下：

| 属性名           | 属性类型                                                | 属性描述                                                         |
|---------------|-----------------------------------------------------|--------------------------------------------------------------|
| url           | String                                              | 模型加载地址                                                       |
| position      | [Number,Number]                                     | 模型的经纬度位置信息                                                   |
| height        | Number                                              | 模型离地高度，默认0                                                   |
| rotation      | {x:Number, y: Number, z: Number}                    | 模型旋转角度，用于调整模型方向  默认 {x:0,y:0,z:0}                            |
| scale         | Number，{x:Number, y: Number, z: Number}             | 模型缩放比例，可以传入数值或者VEC3数据，默认 1                                   |
| angle         | Number                                              | 模型旋转角度，一般用于车辆模型角度使用，默认 0                                     |
| onLoaded      | Function(gltf: Group, animations:  AnimationClip[]) | 模型加载完成后触发回调                                                  | 
| configLoader  | (loader: GLTFLoader) => void                        | 配置loader，用于添加draco等扩展                                        |
| useModelCache | Boolean                                             | 是否启用模型缓存，开启后模型批量加载同一个模型地址时只有第一个执行下载，后续模型将直接使用clone能力。默认false |

###### 成员函数

| 函数名 | 入参                               | 返回值          | 描述               |
|-----|----------------------------------|--------------|------------------|
| setScale | Number，{x:Number, y: Number, z: Number}    | 无            | 设置缩放比例           |
| setPosition | [Number,Number] (经纬度)            | 无            | 设置模型位置           |
| setRotation | {x:Number, y: Number, z: Number} | 无            | 旋转模型             |
| setAngle | Number                           | 无            | 设置模型旋转角度 0 - 360 |
| setHeight | Number                           | 无            | 设置离地高度           |
| getAnimations | 无 | animations数组 | 获取gltf中携带的动画信息   |
| getObject | 无 | Object3D     | 获取模型对象           |
| refresh | 无                                | 无            | 刷新图层             |
| show | 无                                | 无            | 显示模型             |
| hide | 无                                | 无            | 隐藏模型             |
| startAnimations | 无                                | 无            | 执行gltf模型中的动画     |
| stopAnimations | 无                                | 无            | 停止gltf模型中的动画     |
| remove | 无                                | 无            | 从layer中移出模型      |
| destroy | 无                                | 无            | 销毁模型             |

###### 事件列表

| 事件名 | 参数                               | 描述                                     |
| ---- |----------------------------------|----------------------------------------|
| complete | {target: Object3D, animations: animations} | 模型初始化成功后触发，返回模型对象和gltf自带的的animations对象 |
