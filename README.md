# neuroglancer precomputed mesh to gltf converter

[neuroglancer](https://www.github.com/google/neuroglancer) is a popular framework for the rendering of big data volumes. The mesh format supported by neuroglancer is [well documented](https://github.com/google/neuroglancer/tree/master/src/neuroglancer/datasource/precomputed#mesh-representation-of-segmented-object-surfaces), as such, it can easily be translated to [gltf](https://github.com/KhronosGroup/glTF), a common 3D asset framework. 

The advantage of translating neuroglancer format to gltf is that it can be imported by many popular 3D visualisation/editing softawres (e.g. [blender](https://github.com/KhronosGroup/glTF-Blender-IO), [unity](https://github.com/KhronosGroup/UnityGLTF) and so on ) and frameworks (e.g. [threejs](https://threejs.org/docs/#examples/loaders/GLTFLoader), [babylon](https://doc.babylonjs.com/how_to/gltf) and so on). 

## Prerequisite

node > 8

This is currently not a frontend library. 

## Installation

```
npm i <repo>
```

## Usage

_local directory_
```javascript
const path = require('path')
const fs = require('fs')
const { createGltfFromLocalDir } = require('neuroglancer-precomputed-mesh-to-gltf')
const pathToDir = path.join(__dirname, 'precomputed', 'mySeg', 'mesh')

/**
 * basic config, calculates normal, reads all file in pathToDir satisfying /^[0-9]*\:0/
 */
const localNormalAll = createGltfFromLocalDir(pathToDir)

/**
 * define a material map. in this case, only 1:0 2:0 and 3:0 will be rendered.
 */
const materialMap = new Map([
  // segment 1 uses custom material
  [1, {
    name: 'material-for-segment-1',
    pbrMetallicRoughness: {
      roughnessFactor: 0.5,
      metallicFactor: 0.9,
      baseColorFactor: [1.0, 0.5, 0.5, 1.0]  
    }
  }],
  // segment 2 uses custom material
  [2, {
    name: 'material-for-segment-2',
    pbrMetallicRoughness: {
      roughnessFactor: 0.65,
      metallicFactor: 0.9,
      baseColorFactor: [0.5, 1.0, 0.5, 1.0]
    }
  }],
  // segment 3 uses default material
  [3, null]
])
const localNormalSubMesh = createGltfFromLocalDir(pathToDir, materialMap)

/**
 * significantly faster, but may not conform to gltf standard, some libraries may not work. 
*/
const localNoNormalSubMesh = createGltfFromLocalDir(pathToDir, materialMap, {calculateNormal: false})

localNormalSubMesh
  .then(gltf => {
    /**
     * nb bin urls are relative to the path to __dirname
     * */
    fs.writeFile('myGltf.gltf', JSON.stringify(gltf, null, 2), 'utf-8', (err) => {
      if(err) throw err
    })
  })
  .catch(console.error)

```

_http(s) directory_
```javascript
const path = require('path')
const fs = require('fs')
const { createGltfFromRemote } = require('neuroglancer-precomputed-mesh-to-gltf')
const pathToDir = `http://localhost:3001/precomputed/mySeg/mesh`

/**
 * loading from remote requires a map to be defined. 
 */
const materialMap = new Map([
  // segment 1 uses custom material
  [1, {
    name: 'material-for-segment-1',
    pbrMetallicRoughness: {
      roughnessFactor: 0.5,
      metallicFactor: 0.9,
      baseColorFactor: [1.0, 0.5, 0.5, 1.0]  
    }
  }],
  // segment 2 uses custom material
  [2, {
    name: 'material-for-segment-2',
    pbrMetallicRoughness: {
      roughnessFactor: 0.65,
      metallicFactor: 0.9,
      baseColorFactor: [0.5, 1.0, 0.5, 1.0]
    }
  }],
  // segment 3 uses default material
  [3, null]
])
const remoteNormalSubMesh = createGltfFromRemote(pathToDir, materialMap)

/**
 * significantly faster, but may not conform to gltf standard, some libraries may not work. 
*/
const remoteNoNormalSubMesh = createGltfFromRemote(pathToDir, materialMap, {calculateNormal: false})

remoteNormalSubMesh
  .then(gltf => {
    /**
     * nb bin urls are relative to the path to __dirname
     * */
    fs.writeFile('myGltf.gltf', JSON.stringify(gltf, null, 2), 'utf-8', (err) => {
      if(err) throw err
    })
  })
  .catch(console.error)

```

## License

MIT