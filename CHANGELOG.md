### 0.0.9
* gltf增加useModelCache属性，开启后同一个url只会下载一次文件，后续使用clone方法克隆对象，所有模型公用同一个材质，降低内存
* layer开放webGLRendererParameters属性

### 0.0.8
* 开放canvas对象

### 0.0.7
* createCanvas为true时,调整在没有触发地图本身的render时，使用threejs自身render不再直接调用map.render

### 0.0.6
* threelayer增加createCanvas属性，可以通过扩展一个canvas图层将threejs绘制在独立的canvas上

### 0.0.5
* 解决与loca一起使用时坐标转换异常问题
* Gltf增加configLoader,用于扩展gltf配置，增加扩展能力
* 修改打包，es包后缀更改为mjs

### 0.0.4
* 解决发包问题

### 0.0.3
* ThreeLayer初始化参数增加onInit 和 onRender函数
* Gltf增加 onLoaded 参数

### 0.0.2
修改GLTF的scale参数类型，从数组调整为Vec3

### 0.0.1
初始版本，完成threelayer图层和gltf加载
