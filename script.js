console.log("JS LOADED");
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152/build/three.module.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, -1000);
camera.position.z = 5;


const renderer = new THREE.WebGLRenderer({alpha: true});
renderer.setSize(window.innerWidth, window.innerHeight);

//document.body.appendChild(renderer.domElement);
document.getElementById("three-background").appendChild(renderer.domElement);

// mesh dots / particles
const size = 20;       // points per row/column
const depth = 20;      // number of Z layers
const spacing = 2;   // distance between points
const layerSpacing = 2;

const positions = [];

for (let z = 0; z < depth; z++) {
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {

      positions.push(
        (x - size/2) * spacing,
        (y - size/2) * spacing,
        -z * layerSpacing   // stack backward
      );

    }
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));


// ---------- Shader material ----------
const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 },
    uMaxDepth: { value: depth * layerSpacing },
    uSpeed: { value: 0.5 },
    uZoom: {value: 2.0},
    uOp: {value: 1.0},
  },
  vertexShader: `
    uniform float uTime;
    uniform float uMaxDepth;
    uniform float uSpeed;
    varying float vDepth;
    uniform float uZoom;

    void main() {
      vec3 pos = position;

      // move forward in Z using time
      pos.z += uTime * uSpeed;

      // wrap Z using modulo
      pos.z = mod(pos.z + uMaxDepth, uMaxDepth) - uMaxDepth/uZoom;

      vDepth = pos.z; // optional for color effects
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

      // point size
      gl_PointSize = 2.0;
    }
  `,
  fragmentShader: `
    uniform float uOp;
    void main() {
      gl_FragColor = vec4(0.94, 0.79, 0.79, uOp); // pinkish
    }
  `,
  transparent: true,
});

const particles = new THREE.Points(geometry, material);
const particleGroup = new THREE.Group();
particleGroup.add(particles);
scene.add(particleGroup);




// ---------- Connect particles with lines ----------
const linePositions = [];
for (let z = 0; z < depth; z++) {
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {

      const idx = (z * size * size + x * size + y) * 3;
      const px = positions[idx];
      const py = positions[idx + 1];
      const pz = positions[idx + 2];

      // connect to +X neighbor
      if (x < size - 1) {
        const nIdx = (z * size * size + (x + 1) * size + y) * 3;
        linePositions.push(px, py, pz, positions[nIdx], positions[nIdx + 1], positions[nIdx + 2]);
      }

      // connect to +Y neighbor
      if (y < size - 1) {
        const nIdx = (z * size * size + x * size + (y + 1)) * 3;
        linePositions.push(px, py, pz, positions[nIdx], positions[nIdx + 1], positions[nIdx + 2]);
      }

      // connect to +Z neighbor
      if (z < depth - 1) {
        const nIdx = ((z + 1) * size * size + x * size + y) * 3;
        linePositions.push(px, py, pz, positions[nIdx], positions[nIdx + 1], positions[nIdx + 2]);
      }
    }
  }
}

const lineGeometry = new THREE.BufferGeometry();
lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
const lineMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 },
    uMaxDepth: { value: depth * layerSpacing },
    uSpeed: { value: 0.5 },
    uZoom: {value: 2.0},
    uOp: {value: 0.1},
  },
  vertexShader: `
    uniform float uTime;
    uniform float uMaxDepth;
    uniform float uSpeed;
    uniform float uZoom;

    void main() {
      vec3 pos = position;

      // move forward in Z using time
      pos.z += uTime * uSpeed;

      // wrap Z using modulo
      pos.z = mod(pos.z + uMaxDepth, uMaxDepth) - uMaxDepth/uZoom;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uOp;
    void main() {
      gl_FragColor = vec4(0.94, 0.79, 0.79, uOp);
    }
  `,
  transparent: true,
});
const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
particleGroup.add(lines);




let isFadingOut = false;
let isFadingIn = false; 
let fadeValueParticle = particles.material.uniforms.uOp.value;
let fadeValueLine = lines.material.uniforms.uOp.value;

let isZoomedOut = false;
// reset camera
let targetRotation = { x: particleGroup.rotation.x, y: particleGroup.rotation.y, z: particleGroup.rotation.z };
let isResetting = false;

const initialRotation = {
    x: particleGroup.rotation.x,
    y: particleGroup.rotation.y,
    z: particleGroup.rotation.z
};
function resetCamera() {
    isFadingIn = true;
    isFadingOut = false;
  
    particles.material.uniforms.uZoom.value = 2.0;
    lines.material.uniforms.uZoom.value = 2.0;
    targetRotation.x = initialRotation.x;
    targetRotation.y = initialRotation.y;
    camera.position.x = 0.0;
    camera.position.y = 0.0;
    camera.position.z = 5;
    isResetting = true;
    isZoomedOut = false;
}
//document.getElementById('homeLink').addEventListener('click', resetCamera);

// zoom out
let currPosParticles = particles.material.uniforms.uZoom.value;
let currPosLines = lines.material.uniforms.uZoom.value;
function zoomOut(){
    isFadingIn = true;
    isFadingOut = false;

    particles.material.uniforms.uZoom.value = 0.5;
    lines.material.uniforms.uZoom.value = 0.5;
    camera.position.set(35, 25, 15);

    targetRotation.x = 0.60;
    targetRotation.y = -0.65;
    targetRotation.z = 0.0;
    
    isResetting = true;
    isZoomedOut = true;
    
}
//document.getElementById('portfolioLink').addEventListener('click', zoomOut);

// cube fading 
function fadeCube(){
  isFadingOut = true;
}
//document.getElementById('contactLink').addEventListener('click', fadeCube);



let isDragging = false;
let previousMouse = { x: 0, y: 0 };

window.addEventListener('mousedown', (e) => {
    isDragging = true;
    isResetting = false;
    previousMouse.x = e.clientX;
    previousMouse.y = e.clientY;
});

window.addEventListener('mouseup', () => {
    isDragging = false;
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - previousMouse.x;
    const deltaY = e.clientY - previousMouse.y;

    const rotationSpeed = 0.005;

    if(!isZoomedOut){
      particleGroup.rotation.y -= deltaX * rotationSpeed; // mirror X
      particleGroup.rotation.x -= deltaY * rotationSpeed; // mirror Y
    }

    previousMouse.x = e.clientX;
    previousMouse.y = e.clientY;
});






// ---------- Animation ----------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  material.uniforms.uTime.value = clock.getElapsedTime();


  // Smooth reset rotation
    if (isResetting) {
        const lerpFactor = 0.1; 
        particleGroup.rotation.x += (targetRotation.x - particleGroup.rotation.x) * lerpFactor;
        particleGroup.rotation.y += (targetRotation.y - particleGroup.rotation.y) * lerpFactor;

        // Stop when close enough
        if (Math.abs(targetRotation.x - particleGroup.rotation.x) < 0.001 &&
            Math.abs(targetRotation.y - particleGroup.rotation.y) < 0.001) {
            particleGroup.rotation.x = targetRotation.x;
            particleGroup.rotation.y = targetRotation.y;
            isResetting = false;
        }
    }

    // smooth fading out / in
    if(isFadingOut){
      fadeValueParticle -= 0.02;
      fadeValueLine -= 0.002;
      if(fadeValueParticle < 0 && fadeValueLine < 0){
        fadeValueParticle = 0;
        fadeValueLine = 0;
        isFadingOut = false;
      }
      particles.material.uniforms.uOp.value = fadeValueParticle;
      lines.material.uniforms.uOp.value = fadeValueLine;

    }
    if(isFadingIn){
      fadeValueParticle += 0.02;
      fadeValueLine += 0.002;
      if(fadeValueParticle > 1.0 && fadeValueLine > 0.1){
        fadeValueParticle = 1.0;
        fadeValueLine = 0.1;
        isFadingIn = false;
      }
      particles.material.uniforms.uOp.value = fadeValueParticle;
      lines.material.uniforms.uOp.value = fadeValueLine;
    }


  renderer.render(scene, camera);
}

animate();

// responsive resize
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});





// page switching
const pages = {
    homeSection: resetCamera,
    portfolioSection: zoomOut,
    contactSection: fadeCube
};

function showPage(id){
    document.querySelectorAll(".page").forEach(p=>{
        p.classList.remove("active");
    });

    document.getElementById(id).classList.add("active");

    window.location.hash = id;
}

// Handle clicks
document.querySelectorAll('nav a').forEach(link=>{
    link.addEventListener('click', e=>{
        const id = e.target.id.replace('Link','Section');
        pages[id]?.();               // trigger cube animation
        setTimeout(()=>showPage(id), 500); // show content after animation
    });
});

// Handle page load with hash
window.addEventListener('load', ()=>{
    const hash = window.location.hash.replace('#','');
    if(hash && document.getElementById(hash)) pages[hash]?.(), showPage(hash);
    else showPage('homeSection');
});
