const { createGltfFromLocalDir } = require('./src/local')
const { createGltfFromRemote } = require('./src/remote')
const { defaultMaterial } = require('./src/constants')

exports.createGltfFromLocalDir = createGltfFromLocalDir
exports.createGltfFromRemote = createGltfFromRemote
exports.defaultMaterial = defaultMaterial