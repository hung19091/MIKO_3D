// --- 1. SCENE & RENDERER SETUP ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfce7f3); // Soft pastel pink background
scene.fog = new THREE.FogExp2(0xfce7f3, 0.006);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 5, 9);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.75;
container.appendChild(renderer.domElement);

// --- 2. CONTROLS ---
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera from clipping through floor
controls.minDistance = 3;
controls.maxDistance = 28;

// --- 3. LIGHTING ---
const ambientLight = new THREE.AmbientLight(0xfff8f3, 0.3);
scene.add(ambientLight);

const skyLight = new THREE.HemisphereLight(0xdcecff, 0x806454, 0.3);
scene.add(skyLight);

const mainLight = new THREE.DirectionalLight(0xfff3e5, 0.68);
mainLight.position.set(6, 12, 6);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
mainLight.shadow.camera.near = 0.5;
mainLight.shadow.camera.far = 80;
mainLight.shadow.camera.left = -18;
mainLight.shadow.camera.right = 18;
mainLight.shadow.camera.top = 30;
mainLight.shadow.camera.bottom = -30;
mainLight.shadow.bias = -0.0005;
scene.add(mainLight);

// Toggle street lighting
const streetLampMeshes = [];
let lightsOn = true;
document.getElementById('btn-light').addEventListener('click', () => {
    lightsOn = !lightsOn;
    ambientLight.intensity = lightsOn ? 0.3 : 0.12;
    skyLight.intensity = lightsOn ? 0.3 : 0.12;
    mainLight.intensity = lightsOn ? 0.68 : 0.2;
    streetLampMeshes.forEach((lamp) => {
        lamp.material.emissiveIntensity = lightsOn ? 0.8 : 0;
    });
    scene.background.setHex(lightsOn ? 0xfce7f3 : 0x1e1b4b);
    scene.fog.color.setHex(lightsOn ? 0xfce7f3 : 0x1e1b4b);
});

document.getElementById('btn-camera-reset').addEventListener('click', () => {
    camera.position.set(player.position.x, player.position.y + 4, player.position.z + 8);
    controls.target.copy(player.position).add(new THREE.Vector3(0, 1.2, 0));
});

// --- 4. BUILD A LONG JAPANESE STREET ---
const STREET_LENGTH = 160;
const STREET_WIDTH = 18;

function addGround(width, length, color, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width, length),
        new THREE.MeshStandardMaterial({ color, roughness: 0.9 })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
}

function createBox(width, height, depth, color, x, y, z) {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshStandardMaterial({ color, roughness: 0.75 })
    );
    mesh.position.set(x, y + height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
}

addGround(64, STREET_LENGTH + 24, 0xd7d3d0, 0, -0.05);
addGround(STREET_WIDTH, STREET_LENGTH, 0x42464b, 0, 0.005);
addGround(4, STREET_LENGTH, 0xb9b5b2, -11, 0.01);
addGround(4, STREET_LENGTH, 0xb9b5b2, 11, 0.01);

// Sidewalk seams and road markings
for (let z = -STREET_LENGTH / 2; z <= STREET_LENGTH / 2; z += 8) {
    createBox(0.12, 0.015, 3.5, 0xfde68a, 0, 0.006, z);
    createBox(0.12, 0.005, 0.12, 0x8c8580, -11, 0.011, z);
    createBox(0.12, 0.005, 0.12, 0x8c8580, 11, 0.011, z);
}
createBox(0.14, 0.02, STREET_LENGTH, 0xe5e7eb, -8.25, 0.006, 0);
createBox(0.14, 0.02, STREET_LENGTH, 0xe5e7eb, 8.25, 0.006, 0);

const buildingColors = [0xffe4e6, 0xe0e7ff, 0xfef3c7, 0xdbeafe, 0xfce7f3, 0xe2e8f0];
const windowColors = [0xfff7cc, 0xc7e9ff, 0xfbcfe8];
for (let side = -1; side <= 1; side += 2) {
    for (let index = 0, z = -68; z <= 68; index++, z += 17) {
        const width = 6 + (index % 3);
        const depth = 11 + (index % 2) * 3;
        const height = 8 + (index % 4) * 2.5;
        const centerX = side * (17 + (index % 2) * 2);
        const color = buildingColors[index % buildingColors.length];
        createBox(width, height, depth, color, centerX, 0, z);
        createBox(width + 0.3, 0.35, depth + 0.3, 0xf8fafc, centerX, height, z);
        createBox(width + 0.5, 0.35, depth + 0.5, 0xf472b6, centerX, 0, z);

        const facadeX = centerX - side * (width / 2 + 0.08);
        for (let floor = 1; floor < height / 3; floor++) {
            for (let window = -1; window <= 1; window++) {
                const pane = new THREE.Mesh(
                    new THREE.BoxGeometry(0.12, 1.35, 1.45),
                    new THREE.MeshStandardMaterial({
                        color: windowColors[(index + floor + window + 6) % windowColors.length],
                        emissive: 0x332211,
                        roughness: 0.35
                    })
                );
                pane.position.set(facadeX, floor * 3, z + window * 3);
                scene.add(pane);
            }
        }

        // Street lamps add depth cues without adding extra dynamic lights.
        for (const lampZ of [z - 5, z + 5]) {
            const lampX = side * 10.1;
            createBox(0.18, 4.2, 0.18, 0x475569, lampX, 0, lampZ);
            createBox(1.2, 0.12, 0.12, 0x475569, lampX - side * 0.45, 4.0, lampZ);
            const lampHead = createBox(0.65, 0.22, 0.45, 0xffe9a8, lampX - side * 0.9, 3.9, lampZ);
            lampHead.material.emissive.setHex(0xffcc66);
            lampHead.material.emissiveIntensity = 0.8;
            streetLampMeshes.push(lampHead);
        }
    }
}

// --- 5. LOAD THE OFFICIAL DISTRIBUTED MIKO MMD MODEL ---
const player = new THREE.Group();
player.position.set(0, 0, 0);
scene.add(player);

let animationBones = null;
let fallbackCharacter = null;
let fallbackArmRestRotation = null;
const modelStatus = document.getElementById('model-status');
const modelUrl = './mmd/%EE%BE%A6%EE%BE%A0%EE%BF%9A%EE%BF%90%EE%BE%A42.pmx';
const mmdLoader = new THREE.MMDLoader();

function showFallbackCharacter(message) {
    fallbackCharacter = createMikoCharacter();
    fallbackArmRestRotation = fallbackCharacter.userData.rightArm.rotation.clone();
    player.add(fallbackCharacter);
    modelStatus.textContent = message;
}

mmdLoader.load(
    modelUrl,
    (model) => {
        model.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        if (!Number.isFinite(size.y) || size.y <= 0) {
            console.error('Loaded MMD model has invalid bounds:', bounds);
            showFallbackCharacter('官方 MMD 模型尺寸無效；暫用示意角色。');
            return;
        }

        const scale = 1.8 / size.y;
        model.scale.setScalar(scale);
        model.position.y = -bounds.min.y * scale;
        const bonesByName = new Map();
        model.traverse((object) => {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
                const materials = Array.isArray(object.material) ? object.material : [object.material];
                materials.forEach((material) => {
                    if (material.emissive) material.emissive.multiplyScalar(0.25);
                });
            }
            if (object.isBone) {
                bonesByName.set(object.name, object);
            }
        });
        const bone = (name) => bonesByName.get(name);
        animationBones = {
            leftLeg: bone('左足'),
            rightLeg: bone('右足'),
            leftKnee: bone('左ひざ'),
            rightKnee: bone('右ひざ'),
            leftArm: bone('左腕'),
            rightArm: bone('右腕'),
            leftShoulder: bone('左肩'),
            rightShoulder: bone('右肩'),
            leftElbow: bone('左ひじ'),
            rightElbow: bone('右ひじ'),
            leftWrist: bone('左手首'),
            rightWrist: bone('右手首'),
            center: bone('センター'),
            lowerBody: bone('下半身'),
            upperBody: bone('上半身'),
            chest: bone('上半身2'),
            neck: bone('首'),
            head: bone('頭')
        };
        for (const [name, object] of Object.entries(animationBones)) {
            if (object) animationBones[name] = { object, rest: object.rotation.clone() };
        }
        player.add(model);
        modelStatus.textContent = '官方配布 MMD 角色已載入';
    },
    (event) => {
        if (event.total) {
            const percent = Math.round((event.loaded / event.total) * 100);
            modelStatus.textContent = `正在載入官方 MMD 配布角色… ${percent}%`;
        }
    },
    (error) => {
        showFallbackCharacter('官方 MMD 載入失敗；請確認 mmd 資料夾與 HTTP 伺服器。');
        console.error('Failed to load the distributed Miko MMD model:', error);
    }
);

// Keep a visible fallback if the official MMD model cannot be loaded.
function createMikoCharacter() {
    const avatar = new THREE.Group();

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfd3, roughness: 0.5 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0xff85a1, roughness: 0.4 }); // Sakura Pink Hair
    const mikoRedMat = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.5 }); // Shrine Maiden Red
    const mikoWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2b2d42 });

    // Root / Hips
    const hips = new THREE.Group();
    hips.position.y = 0.85;
    avatar.add(hips);

    // Torso (Miko Kimono Top)
    const torsoGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.55, 12);
    const torso = new THREE.Mesh(torsoGeo, mikoWhiteMat);
    torso.castShadow = true;
    hips.add(torso);

    // Red Obi (Belt)
    const obiGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.15, 12);
    const obi = new THREE.Mesh(obiGeo, mikoRedMat);
    obi.position.y = -0.1;
    hips.add(obi);

    // Hakama Skirt
    const skirtGeo = new THREE.ConeGeometry(0.45, 0.5, 12);
    const skirt = new THREE.Mesh(skirtGeo, mikoRedMat);
    skirt.position.y = -0.3;
    skirt.castShadow = true;
    hips.add(skirt);

    // Head & Hair Group
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.45;
    hips.add(headGroup);

    // Head Sphere
    const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.castShadow = true;
    headGroup.add(head);

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.05, 0.08, 0.02);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.09, 0.02, 0.25);
    const rightEye = leftEye.clone();
    rightEye.position.x = 0.09;
    headGroup.add(leftEye);
    headGroup.add(rightEye);

    // Pink Hair Base
    const hairGeo = new THREE.SphereGeometry(0.31, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const hairTop = new THREE.Mesh(hairGeo, hairMat);
    hairTop.rotation.x = -0.2;
    headGroup.add(hairTop);

    // Twin Tails (Sakura Miko's Signature hairstyle)
    const tailGeo = new THREE.ConeGeometry(0.12, 0.55, 8);
    
    const leftTail = new THREE.Mesh(tailGeo, hairMat);
    leftTail.position.set(-0.28, 0.05, -0.1);
    leftTail.rotation.z = 0.6;
    leftTail.rotation.x = -0.2;
    headGroup.add(leftTail);

    const rightTail = new THREE.Mesh(tailGeo, hairMat);
    rightTail.position.set(0.28, 0.05, -0.1);
    rightTail.rotation.z = -0.6;
    rightTail.rotation.x = -0.2;
    headGroup.add(rightTail);

    // Hair Bell / Ribbon Accent
    const ribbonGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xffb703 }); // Gold Bell
    const bell = new THREE.Mesh(ribbonGeo, ribbonMat);
    bell.position.set(-0.24, 0.22, 0.15);
    headGroup.add(bell);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.45, 8);
    
    // Left Arm Group
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.3, 0.2, 0);
    const leftArm = new THREE.Mesh(armGeo, mikoWhiteMat);
    leftArm.position.y = -0.18;
    leftArm.castShadow = true;
    leftArmGroup.add(leftArm);
    hips.add(leftArmGroup);

    // Right Arm Group
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.3, 0.2, 0);
    const rightArm = new THREE.Mesh(armGeo, mikoWhiteMat);
    rightArm.position.y = -0.18;
    rightArm.castShadow = true;
    rightArmGroup.add(rightArm);
    hips.add(rightArmGroup);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.45, 8);
    
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.12, -0.4, 0);
    const leftLeg = new THREE.Mesh(legGeo, skinMat);
    leftLeg.position.y = -0.15;
    leftLeg.castShadow = true;
    leftLegGroup.add(leftLeg);
    hips.add(leftLegGroup);

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.12, -0.4, 0);
    const rightLeg = new THREE.Mesh(legGeo, skinMat);
    rightLeg.position.y = -0.15;
    rightLeg.castShadow = true;
    rightLegGroup.add(rightLeg);
    hips.add(rightLegGroup);

    // Attach limb references for procedural animations
    avatar.userData = {
        hips: hips,
        head: headGroup,
        leftArm: leftArmGroup,
        rightArm: rightArmGroup,
        leftLeg: leftLegGroup,
        rightLeg: rightLegGroup,
        leftTail: leftTail,
        rightTail: rightTail
    };

    return avatar;
}

// --- 6. PLAYER CONTROLLER & INPUT HANDLING ---
const keys = { w: false, a: false, s: false, d: false, shift: false };
let joystickVector = { x: 0, y: 0 };

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'w' || key === 'arrowup') { keys.w = true; e.preventDefault(); }
    if (key === 'a' || key === 'arrowleft') { keys.a = true; e.preventDefault(); }
    if (key === 's' || key === 'arrowdown') { keys.s = true; e.preventDefault(); }
    if (key === 'd' || key === 'arrowright') { keys.d = true; e.preventDefault(); }
    if (e.key === 'Shift') keys.shift = true;
}, { passive: false });

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'w' || key === 'arrowup') { keys.w = false; e.preventDefault(); }
    if (key === 'a' || key === 'arrowleft') { keys.a = false; e.preventDefault(); }
    if (key === 's' || key === 'arrowdown') { keys.s = false; e.preventDefault(); }
    if (key === 'd' || key === 'arrowright') { keys.d = false; e.preventDefault(); }
    if (e.key === 'Shift') keys.shift = false;
}, { passive: false });

// Virtual Touch Joystick Implementation
const joystickZone = document.getElementById('touch-joystick-zone');
const joystickStick = document.getElementById('joystick-stick');
let joystickActive = false;
let touchStartPos = { x: 0, y: 0 };

joystickZone.addEventListener('touchstart', (e) => {
    joystickActive = true;
    const touch = e.touches[0];
    touchStartPos = { x: touch.clientX, y: touch.clientY };
});

window.addEventListener('touchmove', (e) => {
    if (!joystickActive) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.x;
    const dy = touch.clientY - touchStartPos.y;
    const dist = Math.min(Math.hypot(dx, dy), 40);
    const angle = Math.atan2(dy, dx);
    
    const moveX = Math.cos(angle) * dist;
    const moveY = Math.sin(angle) * dist;
    
    joystickStick.style.transform = `translate(${moveX}px, ${moveY}px)`;
    joystickVector.x = moveX / 40;
    joystickVector.y = moveY / 40;
});

const resetJoystick = () => {
    joystickActive = false;
    joystickStick.style.transform = `translate(0px, 0px)`;
    joystickVector = { x: 0, y: 0 };
};

window.addEventListener('touchend', resetJoystick);
window.addEventListener('touchcancel', resetJoystick);

// --- 7. ACTION / ANIMATION STATES ---
let currentGesture = null;
let gestureTimer = 0;

document.getElementById('btn-wave').addEventListener('click', () => {
    currentGesture = 'wave';
    gestureTimer = 0;
});
document.getElementById('btn-jump').addEventListener('click', () => {
    currentGesture = 'jump';
    gestureTimer = 0;
});
document.getElementById('btn-spin').addEventListener('click', () => {
    currentGesture = 'spin';
    gestureTimer = 0;
});

// --- 8. MAIN ANIMATION LOOP & PHYSICS ---
const clock = new THREE.Clock();
let gaitPhase = 0;
let locomotionBlend = 0;
let sprintBlend = 0;

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();
    let inputX = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
    let inputZ = (keys.w ? 1 : 0) - (keys.s ? 1 : 0);

    if (joystickActive) {
        inputX = joystickVector.x;
        inputZ = -joystickVector.y;
    }

    const isMoving = Math.abs(inputX) > 0.1 || Math.abs(inputZ) > 0.1;
    const speed = keys.shift ? 7 : 4;
    const blendRate = 1 - Math.exp(-delta * 8);
    locomotionBlend += ((isMoving ? 1 : 0) - locomotionBlend) * blendRate;
    sprintBlend += ((isMoving && keys.shift ? 1 : 0) - sprintBlend) * blendRate;

    if (isMoving) {
        currentGesture = null;
        const cameraForward = camera.getWorldDirection(new THREE.Vector3());
        cameraForward.y = 0;
        cameraForward.normalize();
        const cameraRight = new THREE.Vector3().crossVectors(cameraForward, new THREE.Vector3(0, 1, 0));
        const moveDirection = new THREE.Vector3()
            .addScaledVector(cameraRight, inputX)
            .addScaledVector(cameraForward, inputZ)
            .normalize();

        const targetAngle = Math.atan2(moveDirection.x, moveDirection.z);
        let angleDifference = targetAngle - player.rotation.y;
        angleDifference = Math.atan2(Math.sin(angleDifference), Math.cos(angleDifference));
        player.rotation.y += angleDifference * Math.min(1, delta * 10);

        player.position.addScaledVector(moveDirection, speed * delta);
        player.position.x = THREE.MathUtils.clamp(player.position.x, -7.3, 7.3);
        player.position.z = THREE.MathUtils.clamp(player.position.z, -78, 78);

        gaitPhase += delta * (7 + sprintBlend * 4);
        player.position.y = Math.abs(Math.sin(gaitPhase * 2)) * (0.025 + sprintBlend * 0.035);
    } else {
        player.position.y = Math.sin(time * 2.5) * 0.015;
    }

    if (animationBones) {
        const setBonePose = (name, x = 0, y = 0, z = 0) => {
            const entry = animationBones[name];
            if (!entry) return;
            entry.object.rotation.set(
                entry.rest.x + x,
                entry.rest.y + y,
                entry.rest.z + z,
                entry.rest.order
            );
        };
        const step = Math.sin(gaitPhase);
        const oppositeStep = Math.sin(gaitPhase + Math.PI);
        const walkSwing = 0.38 + sprintBlend * 0.2;
        const armSwing = 0.24 + sprintBlend * 0.35;
        const kneeBend = 0.28 + sprintBlend * 0.3;
        const idleBreath = Math.sin(time * 1.7);

        setBonePose('leftLeg', step * walkSwing * locomotionBlend);
        setBonePose('rightLeg', oppositeStep * walkSwing * locomotionBlend);
        setBonePose('leftKnee', Math.max(0, -step) * kneeBend * locomotionBlend);
        setBonePose('rightKnee', Math.max(0, -oppositeStep) * kneeBend * locomotionBlend);
        setBonePose('leftArm', -oppositeStep * armSwing * locomotionBlend);
        setBonePose('rightArm', -step * armSwing * locomotionBlend);
        setBonePose('leftShoulder', 0, 0, -0.75 - step * 0.05 * locomotionBlend);
        setBonePose('rightShoulder', 0, 0, 0.75 + step * 0.05 * locomotionBlend);
        setBonePose('leftElbow', -0.12 - 0.04 * locomotionBlend);
        setBonePose('rightElbow', -0.12 - 0.04 * locomotionBlend);
        setBonePose('leftWrist', 0, 0, -step * 0.04 * locomotionBlend);
        setBonePose('rightWrist', 0, 0, step * 0.04 * locomotionBlend);
        setBonePose('lowerBody', -0.025 * sprintBlend);
        setBonePose('upperBody', -0.045 * sprintBlend + idleBreath * 0.012 * (1 - locomotionBlend));
        setBonePose('chest', idleBreath * (0.018 + 0.012 * (1 - locomotionBlend)));
        setBonePose('neck', 0, Math.sin(time * 0.8) * 0.018 * (1 - locomotionBlend));
        setBonePose('head', Math.sin(time * 1.4) * 0.012, Math.sin(time * 0.7) * 0.025, 0);
    }

    if (currentGesture) {
        gestureTimer += delta;
        if (currentGesture === 'jump') {
            player.position.y = Math.abs(Math.sin(gestureTimer * Math.PI * 2)) * 0.8;
            if (gestureTimer >= 1) currentGesture = null;
        } else if (currentGesture === 'spin') {
            player.rotation.y += delta * 10;
            if (gestureTimer >= 1.2) currentGesture = null;
        } else if (currentGesture === 'wave') {
            if (animationBones.rightShoulder && animationBones.rightElbow) {
                const shoulder = animationBones.rightShoulder;
                shoulder.object.rotation.copy(shoulder.rest);
                shoulder.object.rotation.z -= 1.0;
                const elbow = animationBones.rightElbow;
                elbow.object.rotation.copy(elbow.rest);
                elbow.object.rotation.x -= 1.0;
                if (animationBones.rightWrist) {
                    const wrist = animationBones.rightWrist;
                    wrist.object.rotation.copy(wrist.rest);
                    wrist.object.rotation.z += Math.sin(gestureTimer * 10) * 0.3;
                }
            } else if (fallbackCharacter && fallbackArmRestRotation) {
                const arm = fallbackCharacter.userData.rightArm;
                arm.rotation.copy(fallbackArmRestRotation);
                arm.rotation.x -= Math.PI * 0.65;
                arm.rotation.z = fallbackArmRestRotation.z + Math.sin(gestureTimer * 10) * 0.35;
            }
            if (gestureTimer >= 2.5) currentGesture = null;
        }
    }

    controls.target.copy(player.position).add(new THREE.Vector3(0, 1.2, 0));
    controls.update();
    renderer.render(scene, camera);
}

// --- 9. WINDOW RESIZE HANDLING ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start render loop after load
window.onload = () => {
    animate();
};
