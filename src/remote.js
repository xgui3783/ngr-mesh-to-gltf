const path = require('path')
const request = require('request')
const { processFragmentJson, flatten, getGltfInfoFromBuffer, getMaterialFromMap, transformGltfInfoToGltfFragment, reconstructGltf } = require('./util')

const fetchMeshIndex = (url) => new Promise((resolve, reject) => {
  request(url, {}, (err, resp, body) => {
    if (err) 
      return reject(err)
    if (resp.statusCode >= 400)
      return reject(resp, body)
    return resolve(
      typeof body === 'string'
        ? JSON.parse(body)
        : body
    )
  })
})

const getFragmentBuffer = (url) => new Promise((resolve, reject) => {
  request(url, {
    /**
     * necessary to get body as buffer
     */
    encoding: null
  }, (err, resp, body) => {
    if (err)
      return reject(err)
    if (resp.statusCode >= 400)
      return reject(resp, body)
    return resolve(body)
  })
})

exports.createGltfFromRemote = (root, labelIndexMap, {calculateNormal = true} = {}) => new Promise((resolve, reject) => {
  if (!labelIndexMap)
    return reject('labelIndex must be provided for createGltfFromRemote')
  if (!(labelIndexMap instanceof Map))
    return reject('labelIndex must be instance of Map')
  
  const meshIndexUrls = Array.from(labelIndexMap.keys()).map(key => `${root}/${key}:0`)
  Promise.all(
    meshIndexUrls.map(url => 
      fetchMeshIndex(url)
        .then(json => ({
          json,
          meshIndexFile: url
        })))
  )
    .then(arr => arr.map(processFragmentJson))
    .then(flatten)
    .then(arr => Promise.all(
      arr.map(item => 
        getFragmentBuffer( `${root}/${item.fragment}` )
          .then(buffer => ({
            ...item,
            buffer
          }))  
      )
    )).then(array => 
      array
        .map(({buffer, fragment, meshIndexFile}) => 
          getGltfInfoFromBuffer(
            `${root}/${fragment}`, 
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
