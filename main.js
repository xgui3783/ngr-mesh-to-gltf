const { createGltfFromLocalDir } = require('./src/local')
const { createGltfFromRemote } = require('./src/remote')
const { defaultMaterial } = require('./src/constants')
const { getInfoFromNgMeshBin } = require('./src/util')

exports.createGltfFromLocalDir = createGltfFromLocalDir
exports.createGltfFromRemote = createGltfFromRemote
exports.defaultMaterial = defaultMaterial
exports.getInfoFromNgMeshBin = getInfoFromNgMeshBin