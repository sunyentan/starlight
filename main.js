import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222); 

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(25, 25, 25);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

let boxSize = 20;
const boxMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
let boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
let edges = new THREE.EdgesGeometry(boxGeometry);
const boxWireframe = new THREE.LineSegments(edges, boxMaterial);
scene.add(boxWireframe);

let axesHelper = new THREE.AxesHelper(boxSize * 1.1);
scene.add(axesHelper);

// default values for control center
let stepSize = 1.5;
let maxCells = 10000;

const spawnExtraProbability = 0.3;

let activeCells = [];
let allCells = [];

let positions = [];
let colors = [];

function addCellToPoints(cell) {
  positions.push(cell.position.x, cell.position.y, cell.position.z);
  const hue = (cell.generation * 0.05) % 1;
  const color = new THREE.Color();
  color.setHSL(hue, 1.0, 0.5);
  colors.push(color.r, color.g, color.b);
}

// data strucs to store data, [plants] the seed
function initializeSimulation() {
  activeCells = [];
  allCells = [];
  positions = [];
  colors = [];
  const seed = { position: new THREE.Vector3(0, 0, 0), generation: 0 };
  activeCells.push(seed);
  allCells.push(seed);
  addCellToPoints(seed);
}

// array for history
let generationHistory = [];
function pushCurrentStateToHistory() {
  generationHistory.push({
    activeCells: JSON.parse(JSON.stringify(activeCells)),
    allCells: JSON.parse(JSON.stringify(allCells)),
    positions: positions.slice(),
    colors: colors.slice()
  });
}

initializeSimulation();

let geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
geometry.setDrawRange(0, positions.length / 3);

// changes textures based on shape
function createPointTexture(shape) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  
  if (shape === 'spark') {
    const gradient = ctx.createRadialGradient(size/2, size/2, 2, size/2, size/2, size/2);
    gradient.addColorStop(0, 'white');
    gradient.addColorStop(0.5, 'yellow');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  else if (shape === 'circle') {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (shape === 'square') {
    ctx.fillStyle = 'white';
    ctx.fillRect(2, 2, size - 4, size - 4);
  } else if (shape === 'triangle') {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(size / 2, 2);
    ctx.lineTo(size - 2, size - 2);
    ctx.lineTo(2, size - 2);
    ctx.closePath();
    ctx.fill();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// default shape circle
let currentShape = 'circle';
const defaultTexture = createPointTexture(currentShape);
const pointsMaterial = new THREE.PointsMaterial({
  size: parseFloat(document.getElementById("pointSizeRange").value) || 0.2,
  vertexColors: true,
  map: defaultTexture,
  alphaTest: 0.5,
  transparent: true,
});

const pointsCloud = new THREE.Points(geometry, pointsMaterial);
scene.add(pointsCloud);

function isInsideBox(pos) {
  const halfSize = boxSize / 2;
  return (
    pos.x >= -halfSize && pos.x <= halfSize &&
    pos.y >= -halfSize && pos.y <= halfSize &&
    pos.z >= -halfSize && pos.z <= halfSize
  );
}

function randomUnitVector() {
  const theta = Math.random() * 2 * Math.PI;
  const phi = Math.acos(2 * Math.random() - 1);
  const x = Math.sin(phi) * Math.cos(theta);
  const y = Math.sin(phi) * Math.sin(theta);
  const z = Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function updateCube(newSize) {
  boxSize = newSize;
  boxWireframe.geometry.dispose();
  let newBoxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
  let newEdges = new THREE.EdgesGeometry(newBoxGeometry);
  boxWireframe.geometry = newEdges;
  
  scene.remove(axesHelper);
  axesHelper = new THREE.AxesHelper(boxSize * 1.1);
  scene.add(axesHelper);
}

let microscopicModeActive = false;

let simSpeed = 1.0;
let isPaused = false;
let baseStepInterval = 500;
let lastUpdateTime = performance.now();

function simulateGenerationStep() {
  let newActiveCells = [];
  for (let cell of activeCells) {
    let direction = randomUnitVector();
    let newPos = cell.position.clone().add(direction.multiplyScalar(stepSize));
    if (isInsideBox(newPos)) {
      let newCell = { position: newPos, generation: cell.generation + 1 };
      newActiveCells.push(newCell);
      allCells.push(newCell);
      positions.push(newCell.position.x, newCell.position.y, newCell.position.z);
      
      if (Math.random() < spawnExtraProbability) {
        let extraDir = randomUnitVector();
        let extraPos = cell.position.clone().add(extraDir.multiplyScalar(stepSize));
        if (isInsideBox(extraPos)) {
          let extraCell = { position: extraPos, generation: cell.generation + 1 };
          newActiveCells.push(extraCell);
          allCells.push(extraCell);
          positions.push(extraCell.position.x, extraCell.position.y, extraCell.position.z);
        }
      }
    }
  }
  activeCells = newActiveCells;
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setDrawRange(0, positions.length / 3);
  geometry.attributes.position.needsUpdate = true;
  
  pushCurrentStateToHistory();
  updatePointCount();
}

function animate() {
  requestAnimationFrame(animate);

  const timeFactor = performance.now() * 0.0001;
  const newColors = [];
  for (let i = 0; i < allCells.length; i++){
    const cell = allCells[i];
    let hue = (cell.generation * 0.05 + timeFactor) % 1;
    const col = new THREE.Color().setHSL(hue, 1, 0.5);
    newColors.push(col.r, col.g, col.b);
  }
  colors = newColors;
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.attributes.color.needsUpdate = true;

  const currentTime = performance.now();
  if (!isPaused && (currentTime - lastUpdateTime) >= (baseStepInterval / simSpeed)) {
    simulateGenerationStep();
    updatePointCount();
    lastUpdateTime = currentTime;
  }

  // let newActiveCells = [];
  // for (let cell of activeCells) {
  //   let direction = randomUnitVector();
  //   let newPos = cell.position.clone().add(direction.multiplyScalar(stepSize));
  //   if (isInsideBox(newPos)) {
  //     let newCell = { position: newPos, generation: cell.generation + 1 };
  //     newActiveCells.push(newCell);
  //     allCells.push(newCell);
  //     positions.push(newCell.position.x, newCell.position.y, newCell.position.z);
      
  //     if (Math.random() < spawnExtraProbability) {
  //       let extraDir = randomUnitVector();
  //       let extraPos = cell.position.clone().add(extraDir.multiplyScalar(stepSize));
  //       if (isInsideBox(extraPos)) {
  //         let extraCell = { position: extraPos, generation: cell.generation + 1 };
  //         newActiveCells.push(extraCell);
  //         allCells.push(extraCell);
  //         positions.push(extraCell.position.x, extraCell.position.y, extraCell.position.z);
  //       }
  //     }
  //   }
  // }
  // activeCells = newActiveCells;
  
  // geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  // geometry.setDrawRange(0, positions.length / 3);
  // geometry.attributes.position.needsUpdate = true;
  
  if (allCells.length >= maxCells) {
    activeCells = [];
  }

  const microOverride = document.getElementById("microscopicToggle").checked;
  const cameraDistance = camera.position.length();
  const microThreshold = 10;
  
  // if (microOverride || cameraDistance < microThreshold) {
  //   if (!microscopicModeActive) {
  //     pointsMaterial.map = createPointTexture('spark');
  //     pointsMaterial.size = parseFloat(document.getElementById("pointSizeRange").value) * 0.5;
  //     pointsMaterial.needsUpdate = true;
  //     microscopicModeActive = true;
  //   }
  // } else {
  //   if (microscopicModeActive) {
  //     pointsMaterial.map = createPointTexture(currentShape);
  //     pointsMaterial.size = parseFloat(document.getElementById("pointSizeRange").value);
  //     pointsMaterial.needsUpdate = true;
  //     microscopicModeActive = false;
  //   }
  // }

  if (microOverride) {
      if (!microscopicModeActive) {
      pointsMaterial.map  = createPointTexture('spark');
      pointsMaterial.size = parseFloat(document.getElementById("pointSizeRange").value) * 0.5;
      pointsMaterial.needsUpdate = true;
      microscopicModeActive = true;
    }
  
    const timeFactor = performance.now() * 0.0001;
    const newColors = [];
    for (let i = 0; i < allCells.length; i++) {
      const cell = allCells[i];
      let hue = (cell.generation * 0.05 + timeFactor) % 1;
      const col = new THREE.Color().setHSL(hue, 1, 0.5);
      newColors.push(col.r, col.g, col.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(newColors, 3));
    geometry.attributes.color.needsUpdate = true;
  } else {  
    if (microscopicModeActive) {
      pointsMaterial.map  = createPointTexture(currentShape);
      pointsMaterial.size = parseFloat(document.getElementById("pointSizeRange").value);
      pointsMaterial.needsUpdate = true;
      microscopicModeActive = false;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

function resetSimulation() {
  initializeSimulation();
  positions = [];
  for (const cell of allCells) {
    positions.push(cell.position.x, cell.position.y, cell.position.z);
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setDrawRange(0, positions.length / 3);
}

const simSpeedRange = document.getElementById("simSpeedRange");
const simSpeedNumber = document.getElementById("simSpeedNumber");
simSpeedRange.addEventListener("input", function(e) {
  simSpeed = parseFloat(e.target.value);
  simSpeedNumber.value = e.target.value;
});
simSpeedNumber.addEventListener("input", function(e) {
  simSpeed = parseFloat(e.target.value);
  simSpeedRange.value = e.target.value;
});

const pausePlayButton = document.getElementById("pausePlayButton");
pausePlayButton.addEventListener("click", function() {
  isPaused = !isPaused;
  pausePlayButton.textContent = isPaused ? "Play" : "Pause";
});

const nextFrameButton = document.getElementById("nextFrameButton");
nextFrameButton.addEventListener("click", function() {
  if (isPaused) {
    simulateGenerationStep();
    updatePointCount();
  }
});

const prevFrameButton = document.getElementById("prevFrameButton");
prevFrameButton.addEventListener("click", function() {
  if (isPaused && generationHistory.length > 1) {
    generationHistory.pop();
    let prevSnapshot = generationHistory[generationHistory.length - 1];
    activeCells = JSON.parse(JSON.stringify(prevSnapshot.activeCells));
    allCells = JSON.parse(JSON.stringify(prevSnapshot.allCells));
    positions = prevSnapshot.positions.slice();
    colors = prevSnapshot.colors.slice();
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setDrawRange(0, positions.length / 3);
    geometry.attributes.position.needsUpdate = true;

    updatePointCount();
  }
});

const maxCellsRange = document.getElementById("maxCellsRange");
const maxCellsNumber = document.getElementById("maxCellsNumber");
maxCellsRange.addEventListener("input", function(e) {
  maxCells = parseInt(e.target.value);
  maxCellsNumber.value = e.target.value;
});
maxCellsNumber.addEventListener("input", function(e) {
  maxCells = parseInt(e.target.value);
  maxCellsRange.value = e.target.value;
});

const pointSizeRange = document.getElementById("pointSizeRange");
const pointSizeNumber = document.getElementById("pointSizeNumber");
pointSizeRange.addEventListener("input", function(e) {
  const value = parseFloat(e.target.value);
  pointsMaterial.size = microscopicModeActive ? value * 0.5 : value;
  pointSizeNumber.value = e.target.value;
});
pointSizeNumber.addEventListener("input", function(e) {
  const value = parseFloat(e.target.value);
  pointsMaterial.size = microscopicModeActive ? value * 0.5 : value;
  pointSizeRange.value = e.target.value;
});

const stepSizeRange = document.getElementById("stepSizeRange");
const stepSizeNumber = document.getElementById("stepSizeNumber");
stepSizeRange.addEventListener("input", function(e) {
  stepSize = parseFloat(e.target.value);
  stepSizeNumber.value = e.target.value;
});
stepSizeNumber.addEventListener("input", function(e) {
  stepSize = parseFloat(e.target.value);
  stepSizeRange.value = e.target.value;
});

const cubeSizeRange = document.getElementById("cubeSizeRange");
const cubeSizeNumber = document.getElementById("cubeSizeNumber");
cubeSizeRange.addEventListener("input", function(e) {
  const newCubeSize = parseFloat(e.target.value);
  cubeSizeNumber.value = e.target.value;
  updateCube(newCubeSize);
});
cubeSizeNumber.addEventListener("input", function(e) {
  const newCubeSize = parseFloat(e.target.value);
  cubeSizeRange.value = e.target.value;
  updateCube(newCubeSize);
});

const shapeButtons = document.querySelectorAll("#controlPanel button[data-shape]");
shapeButtons.forEach(button => {
  button.addEventListener("click", function() {
    currentShape = this.getAttribute("data-shape");
    if (!microscopicModeActive) {
      pointsMaterial.map = createPointTexture(currentShape);
      pointsMaterial.needsUpdate = true;
    }
  });
});

document.getElementById("resetButton").addEventListener("click", () => {
  resetSimulation();
  updatePointCount();
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function updateInfoPanel() {
  document.getElementById("infoMaxCells").textContent = maxCells;
  document.getElementById("infoStepSize").textContent = stepSize.toFixed(2);
  document.getElementById("infoCubeSize").textContent = boxSize.toFixed(1);
  document.getElementById("infoSimSpeed").textContent = simSpeed.toFixed(1) + 'x';
}

maxCellsRange.addEventListener("input", function(e) {
  maxCells = parseInt(e.target.value);
  maxCellsNumber.value = e.target.value;
  updateInfoPanel();
});
stepSizeRange.addEventListener("input", function(e) {
  stepSize = parseFloat(e.target.value);
  stepSizeNumber.value = e.target.value;
  updateInfoPanel();
});
cubeSizeRange.addEventListener("input", function(e) {
  const newCubeSize = parseFloat(e.target.value);
  cubeSizeNumber.value = e.target.value;
  updateCube(newCubeSize);
  updateInfoPanel();
});
simSpeedRange.addEventListener("input", function(e) {
  simSpeed = parseFloat(e.target.value);
  simSpeedNumber.value = e.target.value;
  updateInfoPanel();
});

updateInfoPanel();

const hideInfoButton = document.getElementById("hideInfoButton");
const showInfoButton = document.getElementById("showInfoButton");
const infoPanel = document.getElementById("infoPanel");
const hideControlButton = document.getElementById("hideControlButton");
const showControlButton = document.getElementById("showControlButton");
const controlPanel = document.getElementById("controlPanel");

hideInfoButton.addEventListener("click", function() {
  infoPanel.classList.add("collapsed");
  showInfoButton.style.display = "block";
});

showInfoButton.addEventListener("click", function() {
  infoPanel.classList.remove("collapsed");
  showInfoButton.style.display = "none";
});

hideControlButton.addEventListener("click", function() {
  controlPanel.classList.add("collapsed");
  showControlButton.style.display = "block";
});

showControlButton.addEventListener("click", function() {
  controlPanel.classList.remove("collapsed");
  showControlButton.style.display = "none";
});

const cubeToggle = document.getElementById("toggleCubeVisibility");
boxWireframe.visible = cubeToggle.checked;
cubeToggle.addEventListener("change", (e) => {
  boxWireframe.visible = e.target.checked;
});

const uniformToggle = document.getElementById("toggleUniformColor");
pointsMaterial.vertexColors = true;
pointsMaterial.color.set(0xffffff);
uniformToggle.addEventListener("change", (e) => {
  const useUniform = e.target.checked;
  pointsMaterial.vertexColors = !useUniform;
  if (useUniform) {
    pointsMaterial.color.set(0xffffff);
  }
  pointsMaterial.needsUpdate = true;
});

boxWireframe.visible = axesHelper.visible = cubeToggle.checked;

cubeToggle.addEventListener("change", (e) => {
  const show = e.target.checked;
  boxWireframe.visible = show;
  axesHelper.visible   = show;
});

function updatePointCount() {
  const count = allCells.length;
  document.getElementById("infoPointCount").textContent = count;
}