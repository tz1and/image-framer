import './styles.css'

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { saveAs } from 'file-saver'
import { GUI } from 'dat.gui'

const scene = new THREE.Scene()

const download = () => {
  const exporter = new GLTFExporter()
  exporter.parse(scene, (binaryGltf) => {
    const blob = new Blob([binaryGltf], {
      type: 'model/gltf-binary'
    })
    saveAs(blob, 'frame.glb')
  }, {
    binary: true,
    embedImages: false,
  })
}

const main = () => {
  const canvas = document.querySelector('#c')
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true
  })

  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(0, 0, 1)
  directionalLight.castShadow = true
  scene.add(directionalLight)

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
  const ambientLight = new THREE.AmbientLight(0xffffff)
  scene.add(ambientLight)

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

  let modelFrame
  let modelImage
  let image
  let color = '#7C5427'
  let currentRoot

  const preview = (event) => {
    let reader = new FileReader()
    reader.readAsDataURL(event.target.files[0])
    reader.onload = (e) => {
      image = new Image()
      image.src = e.target.result
      const texture_plane = new THREE.Texture(image)
      image.onload = () => {
        texture_plane.needsUpdate = true
        const material = new THREE.MeshBasicMaterial({
          map: texture_plane,
        })
        material.map.flipY = false
        modelImage.material = material

        const ratio = image.height / image.width
        modelFrame.scale.y = ratio
        modelImage.scale.y = ratio
      }
    }
  }

  const fileInput = document.createElement('input')
  fileInput.type = 'file'
  fileInput.accept = 'image/*'
  fileInput.addEventListener('change', preview)

  const updateImage = () => {
    if (image) {
      const texture_plane = new THREE.Texture(image)
      texture_plane.needsUpdate = true
      const material = new THREE.MeshBasicMaterial({
        map: texture_plane,
      })
      material.map.flipY = false
      modelImage.material = material

      const ratio = image.height / image.width
      modelFrame.scale.y = ratio
      modelImage.scale.y = ratio
    }
  }

  const updateColor = (colorValue) => {
    modelFrame.material.color.set(colorValue)
    color = colorValue
  }

  const gltfLoader = new GLTFLoader()

  const loadFile = async(file) => {
    return new Promise((resolve, reject) => {
      gltfLoader.load(file, (gltf) => {
        let hasPrevious = false
        if (currentRoot) {
          scene.remove(currentRoot)
          hasPrevious = true
        }
        currentRoot = gltf.scene
        scene.add(currentRoot)
        directionalLight.target = currentRoot

        modelFrame = currentRoot.getObjectByName('Frame')
        modelImage = currentRoot.getObjectByName('Image')

        if (!hasPrevious) {
          const box = new THREE.Box3().setFromObject(currentRoot)
          const boxSize = box.getSize(new THREE.Vector3()).length()
          const boxCenter = box.getCenter(new THREE.Vector3())
          frameArea(boxSize * 1.5, boxSize, boxCenter, camera)

          controls.maxDistance = boxSize * 10
          controls.target.copy(boxCenter)
          controls.update()
        }
        resolve()
      })
    })
  }

  const DEFAULT_FRAME = 'Thin matte frame'
  const FRAMES = {
    'Thin matte frame': 'pictureframe.glb',
    'Thin matte edged frame': 'pictureframeedge.glb',
    'Thin shiny frame': 'pictureframeshiny.glb',
    'Thick matte frame': 'pictureframethick.glb',
    'Thick matte beveled frame': 'pictureframebevel.glb'
  }
  loadFile(FRAMES[DEFAULT_FRAME])

  const gui = new GUI({
    width: 320
  })
  let conf = {
    frame: DEFAULT_FRAME,
    color,
    button: () => {
      download()
    },
    file: () => {
      fileInput.click()
    }
  }

  gui.add(conf, 'frame', Object.keys(FRAMES)).onChange(async(option) => {
    const file = FRAMES[option]
    if (file) {
      await loadFile(file)
      updateColor(color)
      updateImage()
    }
  }).name('Change frame')
  gui.addColor(conf, 'color').onChange((colorValue) => {
    updateColor(colorValue)
  }).name('Change color')
  gui.add(conf, 'file').name('Select image')
  gui.add(conf, 'button').name('Download .glb')

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