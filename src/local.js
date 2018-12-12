const fs = require('fs')
const path = require('path')
const { reconstructGltf, processFragmentJson, flatten, getGltfInfoFromBuffer, getMaterialFromMap, transformGltfInfoToGltfFragment } = require('./util')

const getFragmentBuffer = (file) => new Promise((resolve, reject) => {
  fs.readFile(file, (err, data) => {
    if (err)
      return reject(err)
    resolve(data)
  })
})

const readJson = (file) => new Promise((resolve, reject) => {
  fs.readFile(file, 'utf-8', (err, data) => {
    if (err) 
      return reject(err)
    resolve(JSON.parse(data))
  })
})

/**
 * @param dir path to mesh folder of neuroglancer on file system. 
 *  nb: dir will be used as uri, so the context in which this funciton is invoke should normally be where the .gltf file is saved
 * @param labelIndexMap optional param. 
 * If left empty, will render all fragments files that satisfy /^[0-9]*\:0/. 
 * If passed, must be an instance of Map, that maps number to gltf material object or null. 
 * fragments not mapped will not be rendered.
 * objects mapped to null will display default material 
 * @param options optional param
 * 
 * {
 *   calculateNormal: boolean (default = true),
 *   normalOutput: string | null (default = null)
 * }
 */
exports.createGltfFromLocalDir = (dir, labelIndexMap, {calculateNormal = true, normalOutput = null } = {}) => new Promise((resolve, reject) => {
  fs.readdir(dir, (err, files) => {
    if (err) 
      return reject(err)
    if (labelIndexMap && !(labelIndexMap instanceof Map))
      return reject('labelIndexMap has to be a Map object')
    const filteredFiles = labelIndexMap
      ? Array.from(labelIndexMap.keys()).map(num => `${num}:0`)
      : files.filter(file => /^[0-9]*\:0/.test(file))
    Promise.all(
      filteredFiles.map(file => 
        readJson(path.join(dir, file))
          .then(json => ({
            meshIndexFile: file,
            json
          }))
      )
    )
      .then(arrayedJson => arrayedJson.map(processFragmentJson))
      .then(flatten)
      .then(arr => 
        Promise.all(
          arr.map(item => 
            getFragmentBuffer( path.join( dir, item.fragment) )
              .then(buffer => ({
                ...item,
                buffer
              }))
          )
        )
      ).then(array => 
        array
          .map(({buffer, fragment, meshIndexFile}) => 
            getGltfInfoFromBuffer(
              path.join(dir, fragment), 
              buffer, 
              getMaterialFromMap(meshIndexFile, labelIndexMap),
              { calculateNormal }
            )
          )
          .map((item, idx) => transformGltfInfoToGltfFragment({
            ...item,
            idx
          },{
            calculateNormal
          }))
      ).then(reconstructGltf)
        .then(resolve)
        .catch(reject)
  })
})