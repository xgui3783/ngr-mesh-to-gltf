const path = require('path')
const { createGltfFromLocalDir } = require('./local')
const fs = require('fs')

createGltfFromLocalDir( path.join('.', 'data', 'mesh') )
  .then(gltf => {
    fs.writeFile('local.gltf', JSON.stringify(gltf, null, 2), 'utf-8', (err) => {
      if(err)
        throw err
      console.log('done')
    })
  })
  .catch(console.error)