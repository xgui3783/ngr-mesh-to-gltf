exports.CONST = ({
  componentType: {
    BYTE: 5120,
    UNSIGNED_BYTE: 5121,
    SHORT: 5122,
    UNSIGNED_SHORT: 5123,
    UNSGINED_INT: 5125,
    FLOAT: 5126
  },
  mode: {
    PONITS: 0,
    LINES: 1,
    LINE_LOOP: 2,
    LINE_STRIP: 3,
    TRIANGLES: 4,
    TRIANGLE_STRIP: 5,
    TRIANGLE_FAN: 6
  },
  type: {
    SCALAR: "SCALAR",
    VEC2: "VEC2",
    VEC3: "VEC3",
    VEC4: "VEC4",
    MAT2: "MAT2",
    MAT3: "MAT3",
    MAT4: "MAT4"
  }
})

exports.defaultMaterial = {
  name: 'defaultMaterial',
  pbrMetallicRoughness: {
    roughnessFactor: 0.7,
    metallicFactor: 0.9,
    baseColorFactor: [1.0, 1.0, 1.0, 1.0]
  }
}