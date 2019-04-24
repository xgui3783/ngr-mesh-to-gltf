const { defaultMaterial, CONST } = require('./constants')
const { vec3 } = require('gl-matrix')

/**
 * 
 * @param {Array<[number, number, number]>} vecs, assuming in clockwise direction
 */
const getFaceNormal = (vecs) => {
  const vec0 = vec3.fromValues(...vecs[0])
  const vec1 = vec3.fromValues(...vecs[1])
  const vec2 = vec3.fromValues(...vecs[2])

  const veca = vec3.sub(vec3.create(), vec0, vec2)
  const vecb = vec3.sub(vec3.create(), vec0, vec1)

  const crossProduct = vec3.cross(vec3.create(), veca, vecb)

  return vec3.normalize(vec3.create(), crossProduct)
}

const getNormals = (verticesFL32ArrayArray, bufferIndicies) => {
  const numVertex = verticesFL32ArrayArray.length,
    // byteLength = 3 x numFaces
    byteLength = Buffer.byteLength(bufferIndicies),
    faceArray = [],
    faceIndexToNormalMap = new Map(),
    /**
     * faceIndex is a Map that maps vertex index (int) to set of face indices
     */
    vertexIndexToFaceIndices = new Map(),
    addVertexIndexToFaceIndices = (key, index) => vertexIndexToFaceIndices.has(key)
      ? vertexIndexToFaceIndices.get(key).add(index)
      : vertexIndexToFaceIndices.set(key, new Set().add(index)),
    outputsArray = []
  let index = 0
  while (index < byteLength) {
    const vIndex0 = bufferIndicies.readInt32LE(index),
      vIndex1 = bufferIndicies.readInt32LE(index + 4),
      vIndex2 = bufferIndicies.readInt32LE(index + 8),
      triple = [vIndex0, vIndex1, vIndex2]
    
    addVertexIndexToFaceIndices(vIndex0, index / 12)
    addVertexIndexToFaceIndices(vIndex1, index / 12)
    addVertexIndexToFaceIndices(vIndex2, index / 12)

    faceArray.push(triple)
    index += 12
  }

  /**
   * TODO optimize normal calculation. Currently this process takes quite long (~1sec on 50k normals)
   */
  index = 0
  while (index < numVertex) {
    const output = vec3.create()
    const facesIndicesSet = vertexIndexToFaceIndices.get(index)
    const normalsArray = Array.from(facesIndicesSet)
      .map(faceIndex => {
        return {
          faceIndex,
          vertexIndicies: faceArray[faceIndex]
        }
      })
      .map(({vertexIndicies, faceIndex}) => {
        return {
          faceIndex,
          vertices: vertexIndicies.map(vertexIndex => verticesFL32ArrayArray[vertexIndex])
        }
      })
      .map(({faceIndex, vertices}) => {
        if (faceIndexToNormalMap.has(faceIndex)) {
          return faceIndexToNormalMap.get(faceIndex)
        }
        const newFaceNormal = getFaceNormal(vertices)
        faceIndexToNormalMap.set(faceIndex, newFaceNormal)
        return newFaceNormal
      })
    normalsArray.forEach(normal => vec3.add(output, output, normal))
    vec3.normalize(output, output)
    outputsArray.push(output)
    index += 1
  }
  return outputsArray
}

exports.transformGltfInfoToGltfFragment = ({numVertices, normals, numTriangles, binUri, minx, miny, minz, maxx, maxy, maxz, idx, material}, {calculateNormal}) => {

  /**
   * 
   * each fragment uses: 
   * 2 x buffers 
   * 3 x bufferViews
   * 3 x accessors
   * 1 x mesh
   * 1 x material
   */

  const numBuffer = calculateNormal
    ? 2
    : 1
  const numBufferViews = calculateNormal
    ? 3
    : 2
  const numAccessors = calculateNormal
    ? 3
    : 2

  /**
   * gltf uses RIP convention (Right, Inferior, Posterior)
   * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#coordinate-system-and-units
   */

  let nMaxx, nMaxy, nMaxz, nMinx, nMiny, nMinz, normalMins, floatarray
  if (calculateNormal) {
    floatarray = new Float32Array(3 * numVertices)
    normalMins = normals.reduce((acc, normal, index) => {
      floatarray.set(normal, index * 3)
      return {
        nMaxx: (!acc.nMaxx || acc.nMaxx < normal[0])
          ? normal[0]
          : acc.nMaxx,
        nMaxy: (!acc.nMaxy || acc.nMaxy < normal[1])
          ? normal[1]
          : acc.nMaxy,
        nMaxz: (!acc.nMaxz || acc.nMaxz < normal[2])
          ? normal[2]
          : acc.nMaxz,
        nMinx: (!acc.nMinx || acc.nMinx > normal[0])
          ? normal[0]
          : acc.nMinx,
        nMiny: (!acc.nMiny || acc.nMiny > normal[1])
          ? normal[1]
          : acc.nMiny,
        nMinz: (!acc.nMinz || acc.nMinz > normal[2])
          ? normal[2]
          : acc.nMinz,
      }
        
    }, {
      nMaxx, nMaxy, nMaxz, nMinx, nMiny, nMinz
    })
  }
  
  return {
    nodes:[{
      name: binUri,
      mesh: idx
    }],
    meshes: [{
      name: binUri,
      primitives:[{
        attributes:{
          ...{ POSITION: idx * numAccessors + 1 },
          ...( calculateNormal
            ? { NORMAL: idx * numAccessors + 2 }
            : {} )
        },
        indices: idx * numAccessors,
        mode: CONST.mode.TRIANGLES,
        material: idx
        /**
         * material index to be here
         */
      }]
    }],
    accessors:[
      ...[{
        /**
         * indices
         */
        bufferView: idx * numBufferViews,
        componentType: CONST.componentType.UNSGINED_INT,
        type: CONST.type.SCALAR,
        count: numTriangles
      },{
        /**
         * vertices
         */
        bufferView: idx * numBufferViews + 1,
        componentType: CONST.componentType.FLOAT,
        type: CONST.type.VEC3,
        count: numVertices,
        min: [minx, miny, minz],
        max: [maxx, maxy, maxz]
      }],
      ... (calculateNormal
        ? [{
          /**
           * normal
           */
          bufferView: idx * numBufferViews + 2,
          componentType: CONST.componentType.FLOAT,
          type: CONST.type.VEC3,
          count: numVertices,
          max: [normalMins.nMaxx, normalMins.nMaxy, normalMins.nMaxz],
          min: [normalMins.nMinx, normalMins.nMiny, normalMins.nMinz]
          }]
        : [])
    ],
    bufferViews:[
      ...[{
        /**
         * bufferView indices
         */
        buffer: idx * numBuffer,
        byteOffset: 4 + numVertices * 12,
        byteLength: numTriangles * 4
      },{
        /**
         * bufferView vertices
         */
        buffer: idx * numBuffer,
        byteOffset: 4,
        byteLength: numVertices * 12,
        byteStride: 12
      }],
      ...(calculateNormal
        ? [{
          /**
           * bufferView normal
           */
          buffer: idx * numBuffer + 1,
          byteOffset: 0,
          byteLength: numVertices * 12,
          byteStride: 12
        }]
      : [])
    ],
    buffers:[
      ...[{
        byteLength: 4 + numVertices * 12 + numTriangles * 4,
        uri: binUri
      }],
      ...(calculateNormal
        ? [{
          byteLength: numVertices * 12,
          uri: `data:application/octet-stream;base64,${Buffer.from(floatarray.buffer).toString('base64')}`
        }]
        : [])
    ],
    /**
     * materials
     */
    materials:[
      material
    ]
  }
}

const getInfoFromNgMeshBin = (buffer) => {
  const numVertices = buffer.readInt32LE(0)
  const faceOffset = numVertices * 12 + 4
  const numFaces = (Buffer.byteLength(buffer) - faceOffset) / 12

  return {
    numVertices,
    faceOffset,
    numFaces
  }
}

exports.getInfoFromNgMeshBin = getInfoFromNgMeshBin

exports.getGltfInfoFromBuffer = (fragmentPath, buffer, material, {calculateNormal}) => {

  const { numVertices, faceOffset, numFaces} = getInfoFromNgMeshBin(buffer)
  let i = 0, vertices = []
  while(i < numVertices){
    vertices.push(
      [buffer.readFloatLE(4 + i * 12), buffer.readFloatLE(8 + i * 12), buffer.readFloatLE(12 + i * 12)]
    )
    i += 1
  }
  // const xs = vertices.map(v => v[0])
  // const ys = vertices.map(v => v[1])
  // const zs = vertices.map(v => v[2])

  /**
   * TODO should be quicker in executing
   */
  const xs = vertices.map(v => v[0])
  const xsSorted = xs.sort()
  const maxx = xsSorted.slice(-1)[0]
  const minx = xsSorted.slice(0, 1)[0]

  const ys = vertices.map(v => v[1])
  const ysSorted = ys.sort()
  const maxy = ysSorted.slice(-1)[0]
  const miny = ysSorted.slice(0, 1)[0]

  const zs = vertices.map(v => v[2])
  const zsSorted = zs.sort()
  const maxz = zsSorted.slice(-1)[0]
  const minz = zsSorted.slice(0, 1)[0]


  return Object.assign({}, {
    numVertices,
    numTriangles: numFaces * 3,
    maxx,
    minx,
    maxy,
    miny,
    maxz,
    minz,
    binUri: fragmentPath,
    material
  }, calculateNormal
    ? { normals: getNormals(vertices, buffer.slice(4 + numVertices * 12)) }
    : {})
}

exports.processFragmentJson = ({meshIndexFile, json}) => json.fragments instanceof Array
  ? json.fragments.map(fragment => ({
      meshIndexFile,
      fragment
    }))
  : []

exports.flatten = (arrOfArr) => arrOfArr.reduce((acc, curr) => acc.concat(curr), [])

exports.getMaterialFromMap = (meshIndexFileName, map = new Map()) => {
  const regex = /([0-9]*)\:0/.exec(meshIndexFileName)
  const number = Number(regex[1])
  return (map && map.get(number)) || defaultMaterial
}

exports.reconstructGltf = (array) => {

  const rootNode = {
    name: "rootNode",
    rotation: [0.707106781, 0, 0, -0.707106781],
    /**
     * neuroglancer precmoputed mesh fomrat is in nm. gltf is in m
     */
    scale: [1e-9, 1e-9, 1e-9],
    translation: [0, 0, 0],
    children: []
  }

  const root = {
    asset: {
      version: "2.0"
    },
    scenes: [{
      name: "singleScene",
      nodes: [
        0
      ]
    }],
    scene: 0,
    nodes: [],
    meshes: [],
    accessors: [],
    bufferViews: [],
    buffers: [],
    materials: []
  }
  const gltf = array
    // .map((item, idx) => getGltf(Object.assign({}, item, item.gltfData, { idx })))
    .reduce((acc, curr) => Object.assign({}, acc, {
      buffers: acc.buffers.concat(curr.buffers),
      bufferViews: acc.bufferViews.concat(curr.bufferViews),
      accessors: acc.accessors.concat(curr.accessors),
      meshes: acc.meshes.concat(curr.meshes),
      nodes: acc.nodes.concat(curr.nodes),
      materials: acc.materials.concat(curr.materials)
    }), root)

  const revisedRootNode = Object.assign({}, rootNode, {
    children: [...Array(gltf.nodes.length)].map((_, idx) => idx + 1)
  })

  const completeGlTF = Object.assign({}, gltf, {
    nodes: [revisedRootNode, ...gltf.nodes]
  })

  return completeGlTF
}

const invertFaces = (buffer) => {
  const { faceOffset, numFaces, numVertices } = getInfoFromNgMeshBin(buffer)

  const numVertVerticesBuffer = buffer.slice(0, faceOffset)
  let faceIdx = 0
  let faceBuffer = Buffer.concat([numVertVerticesBuffer])
  console.log(`total num faces: ${numFaces}`)
  while (faceIdx < numFaces) {
    if (faceIdx % 100 === 0) {
      console.log(`just finished face no. ${faceIdx}`)
    }
    const idx1 = buffer.readUInt32LE(faceOffset + 12 * faceIdx)
    const idx2 = buffer.readUInt32LE(faceOffset + 12 * faceIdx + 4)
    const idx3 = buffer.readUInt32LE(faceOffset + 12 * faceIdx + 8)
    const idxArray = new Uint32Array(3)
    idxArray[0] = idx1
    idxArray[1] = idx3
    idxArray[2] = idx2
    const buf = Buffer.from(idxArray.buffer)
    faceBuffer = Buffer.concat([faceBuffer, buf ])
    faceIdx += 1
  }
  return faceBuffer
}

exports.invertFaces = invertFaces