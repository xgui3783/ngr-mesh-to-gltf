const express = require('express')
const path = require('path')
const app = express()

const PORT = process.env.PORT || 3001

app.use((req, res, next) => {
  console.log('resource accessed')
  res.setHeader('Access-Control-Allow-Origin', '*')
  const baseUrl = req.baseUrl
  const ext = path.extname(baseUrl)
  if (ext === '.gltf') {
    res.setHeader('Content-Type', 'model/gltf+json')
  }else if (ext === '') {
    res.setHeader('Content-Type', 'application/octet-stream')
  }
  
  /**
   * setting content header is current irrelevant. the application is not even calling GET req to retrieve gltf file
   */
  console.log(req.path, ext)
  next()
})

app.use(express.static( path.join(__dirname) ))

app.listen(PORT, () => console.log(`app listening on port ${PORT}`))