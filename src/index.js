import "./styles.css"

import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter"
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { saveAs } from "file-saver"
import { GUI } from 'dat.gui'

const scene = new THREE.Scene()

const download = () => {
  const exporter = new GLTFExporter()
  exporter.parse(scene, (gltfJson) => {
    const jsonString = JSON.stringify(gltfJson)
    const blob = new Blob([jsonString], {
      type: "application/json"
    })
    saveAs(blob, "frame.gltf")
  }, {
    binary: false
  })
}

const main = () => {
  const canvas = document.querySelector('#c')
  const renderer = new THREE.WebGLRenderer({
    canvas
  })

  const fov = 45
  const aspect = 2
  const near = 0.1
  const far = 100
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
  camera.position.set(0, 10, 20)

  const controls = new OrbitControls(camera, canvas)
  controls.target.set(0, 5, 0)
  controls.update()

  scene.background = new THREE.Color('white')
  const light = new THREE.AmbientLight(0xffffff)
  scene.add(light)

  const frameArea = (sizeToFitOnScreen, boxSize, boxCenter, camera) => {
    const halfSizeToFitOnScreen = sizeToFitOnScreen * 0.5
    const halfFovY = THREE.Math.degToRad(camera.fov * .5)
    const distance = halfSizeToFitOnScreen / Math.tan(halfFovY)
    const direction = (new THREE.Vector3())
      .subVectors(camera.position, boxCenter)
      .multiply(new THREE.Vector3(1, 0, 1))
      .normalize()

    camera.position.copy(direction.multiplyScalar(distance).add(boxCenter))

    camera.near = boxSize / 100
    camera.far = boxSize * 100

    camera.updateProjectionMatrix()

    camera.lookAt(boxCenter.x, boxCenter.y, boxCenter.z)
  }

  let frame
  let image

  const preview = (event) => {
    var reader = new FileReader()
    reader.readAsDataURL(event.target.files[0])
    reader.onload = (e) => {
      var newImage = new Image()
      newImage.src = e.target.result
      const texture_plane = new THREE.Texture(newImage)
      newImage.onload = () => {
        console.log('image onload', newImage.width, newImage.height)
        texture_plane.needsUpdate = true
        const material = new THREE.MeshBasicMaterial({
          map: texture_plane,
        })
        material.map.flipY = false
        image.material = material

        const ratio = newImage.height / newImage.width
        frame.scale.y = ratio
        image.scale.y = ratio
      }
    }
  }

  const fileInput = document.createElement('input')
  fileInput.type = 'file'
  fileInput.accept = 'image/*'
  fileInput.addEventListener('change', preview)

  const gltfLoader = new GLTFLoader()
  gltfLoader.load('pictureframe.glb', (gltf) => {
    const root = gltf.scene
    scene.add(root)

    frame = root.getObjectByName('Frame')
    image = root.getObjectByName('Image')

    const box = new THREE.Box3().setFromObject(root)
    const boxSize = box.getSize(new THREE.Vector3()).length()
    const boxCenter = box.getCenter(new THREE.Vector3())
    frameArea(boxSize * 1.5, boxSize, boxCenter, camera)

    controls.maxDistance = boxSize * 10
    controls.target.copy(boxCenter)
    controls.update()

    const gui = new GUI()
    var conf = {
      color: '#7C5427',
      button: () => {
        console.log('download button')
        download()
      },
      file: () => {
        fileInput.click()
      }
    }
    gui.addColor(conf, 'color').onChange((colorValue) => {
      frame.material.color.set(colorValue)
    }).name("Change color")
    gui.add(conf, "file").name("Upload image")
    gui.add(conf, "button").name("Download .gltf")
  })

  const resizeRendererToDisplaySize = (renderer) => {
    const canvas = renderer.domElement
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const needResize = canvas.width !== width || canvas.height !== height
    if (needResize) {
      renderer.setSize(width, height, false)
    }
    return needResize
  }

  const render = () => {
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement
      camera.aspect = canvas.clientWidth / canvas.clientHeight
      camera.updateProjectionMatrix()
    }

    renderer.render(scene, camera)

    requestAnimationFrame(render)
  }

  requestAnimationFrame(render)
}

main()