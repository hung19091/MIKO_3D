// =====================================================================
//  可調整參數（想微調效果，只要改這一區）
// =====================================================================

// 顏色／燈光
const LOOK = {
    exposure: 0.5,          // 整體曝光（原本 0.75 偏暗偏灰）
    saturation: 1.15,       // 角色貼圖飽和度（1 = 不調整）
    emissiveScale: 0.00,    // MMD 自發光縮放，越小越不會「泛白」
    day: { ambient: 0.5, sky: 0.4, main: 0.95 },
    night: { ambient: 0.15, sky: 0.15, main: 0.25 }
};

// 手臂
const ARM = {
    drop: 0.5,              // 手臂額外下垂量（rad），0 = 維持模型原始姿勢；越大越貼身
    swing: 0.55,            // 走路前後擺幅（rad）
    sprintSwing: 0.4,       // 衝刺時額外擺幅
    elbowIdle: 0.12,        // 站立時手肘彎曲
    elbowWalk: 0.3,         // 走路時手肘彎曲
    elbowSprint: 0.5,       // 衝刺時額外手肘彎曲
    outwardRun: 0.06        // 移動時手臂微微外張（rad）
};

// 頭髮／衣服次級擺動
const SWAY = {
    damping: 6,             // 阻尼（越小越晃）
    idle: 0.03,             // 待機時的微風晃動幅度
    // lag：每 1 m/s 移動速度造成的後飄角度（rad，整條骨骼鏈共用）
    // total：整條骨骼鏈累積的最大擺動角度（rad），避免末端翹太高／裙子走光
    // flare：轉圈／落下時向外飄開的程度　bounce：跑步時的上下起伏
    // stiff：彈簧硬度（越大越不容易晃）
    kinds: {
        hair: { lag: 0.06, total: 0.55, flare: 0.10, bounce: 0.03, stiff: 70 },
        cloth: { lag: 0.025, total: 0.28, flare: 0.04, bounce: 0.01, stiff: 110 }, // 紅繩、緞帶、袖子
        skirt: { lag: 0.02, total: 0.20, flare: 0.05, bounce: 0.0, stiff: 120 }
    }
};

// 依骨骼名稱辨識需要擺動的骨骼（日文名稱；若你的模型骨骼名不同，請在此補上）
const HAIR_RE = /髪|ヘア|hair|ツイン|おさげ|ポニ|アホ毛|ahoge/i;
const CLOTH_RE = /スカート|skirt|袖|sleeve|リボン|ribbon|ひも|紐|マント|cape|裾|帯|ベルト|ネクタイ|しっぽ|尻尾|フリル|frill|スカーフ|scarf|エプロン|apron|羽織|耳|鈴/i;
const SKIRT_RE = /スカート|skirt|裾|フリル|frill/i;
const EXCLUDE_RE = /IK|ＩＫ|操作|親|センター|グルーブ|腰キャンセル|ダミー|dummy|影/i;

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
renderer.toneMappingExposure = LOOK.exposure;
container.appendChild(renderer.domElement);

// --- 2. CONTROLS ---
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera from clipping through floor
controls.minPolarAngle = 0.25;
controls.minDistance = 3;
controls.maxDistance = 28;
controls.enablePan = false;      // 鏡頭固定繞著角色，避免拖曳時跟丟
controls.rotateSpeed = 0.7;      // 旋轉較細膩
controls.zoomSpeed = 0.8;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };

// --- 3. LIGHTING ---
const ambientLight = new THREE.AmbientLight(0xfff8f3, LOOK.day.ambient);
scene.add(ambientLight);

const skyLight = new THREE.HemisphereLight(0xdcecff, 0x806454, LOOK.day.sky);
scene.add(skyLight);

const mainLight = new THREE.DirectionalLight(0xfff3e5, LOOK.day.main);
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
    const preset = lightsOn ? LOOK.day : LOOK.night;
    ambientLight.intensity = preset.ambient;
    skyLight.intensity = preset.sky;
    mainLight.intensity = preset.main;
    streetLampMeshes.forEach((lamp) => {
        lamp.material.emissiveIntensity = lightsOn ? 0.8 : 0;
    });
    scene.background.setHex(lightsOn ? 0xfce7f3 : 0x1e1b4b);
    scene.fog.color.setHex(lightsOn ? 0xfce7f3 : 0x1e1b4b);
});

document.getElementById('btn-camera-reset').addEventListener('click', () => {
    // 回到角色背後（依角色目前面向）
    const back = new THREE.Vector3(-Math.sin(player.rotation.y), 0, -Math.cos(player.rotation.y));
    camera.position.copy(player.position).addScaledVector(back, 8).add(new THREE.Vector3(0, 4, 0));
    controls.target.set(player.position.x, 1.25, player.position.z);
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
let armRig = null;            // 手臂擺動所需的旋轉軸
let secondaryBones = [];      // 頭髮／衣服等次級擺動骨骼
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

// 讓角色顏色更飽滿：
// 1) MMDLoader(r128) 載入的貼圖沒有標記為 sRGB，但 renderer 輸出是 sRGB，
//    會造成整體發白偏淡，這裡把貼圖標成 sRGB 以正確解碼。
// 2) 縮小 MMD 的自發光，避免畫面被「洗白」。
// 3) 在 shader 中稍微提高飽和度。
function tuneMaterialLook(material) {
    if (material.map) {
        material.map.encoding = THREE.sRGBEncoding;
        material.map.needsUpdate = true;
    }
    if (material.emissive) material.emissive.multiplyScalar(LOOK.emissiveScale);

    if (LOOK.saturation !== 1 && !material.userData.saturationPatched) {
        material.userData.saturationPatched = true;
        const previous = material.onBeforeCompile;
        material.onBeforeCompile = function (shader, rendererRef) {
            if (previous) previous.call(this, shader, rendererRef);
            if (shader.fragmentShader.includes('#include <map_fragment>')) {
                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <map_fragment>',
                    `#include <map_fragment>
                    {
                        float lumaTune = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
                        diffuseColor.rgb = clamp(mix(vec3(lumaTune), diffuseColor.rgb, ${LOOK.saturation.toFixed(3)}), 0.0, 1.0);
                    }`
                );
            }
        };
        material.customProgramCacheKey = () => `miko-sat-${LOOK.saturation}`;
    }
    material.needsUpdate = true;
}

// 由兩個骨骼的相對位置，算出「繞著垂直於肢體與前方(+Z)的軸」旋轉的軸。
// 繞此軸正向旋轉 = 肢體往前擺，左右手都適用，不受 A-pose／T-pose 影響。
function computeForwardSwingAxis(upperBone, lowerBone) {
    const upperPos = new THREE.Vector3();
    const lowerPos = new THREE.Vector3();
    upperBone.getWorldPosition(upperPos);
    lowerBone.getWorldPosition(lowerPos);
    const dir = lowerPos.sub(upperPos);
    if (upperBone.parent) {
        const inverse = new THREE.Matrix4().copy(upperBone.parent.matrixWorld).invert();
        dir.transformDirection(inverse);
    } else {
        dir.normalize();
    }
    const axis = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 0, 1));
    if (axis.lengthSq() < 1e-6) axis.set(1, 0, 0);
    return axis.normalize();
}

function setupArmRig() {
    const rig = {};
    for (const side of ['left', 'right']) {
        const arm = animationBones[`${side}Arm`];
        const elbow = animationBones[`${side}Elbow`];
        const wrist = animationBones[`${side}Wrist`];
        if (!arm || !elbow) continue;
        rig[side] = {
            arm,
            elbow,
            armAxis: computeForwardSwingAxis(arm.object, elbow.object),
            elbowAxis: wrist
                ? computeForwardSwingAxis(elbow.object, wrist.object)
                : new THREE.Vector3(1, 0, 0),
            lowerSign: side === 'left' ? -1 : 1 // 繞 Z 軸：此方向 = 手臂往下
        };
    }
    armRig = rig;
}

function setupSecondaryBones(bonesByName) {
    const candidates = [];
    bonesByName.forEach((object, name) => {
        if (EXCLUDE_RE.test(name)) return;
        let kind = null;
        if (HAIR_RE.test(name)) kind = 'hair';
        else if (CLOTH_RE.test(name)) kind = 'cloth';
        if (!kind) return;
        if (SKIRT_RE.test(name)) kind = 'skirt';
        candidates.push({ object, name, kind });
    });

    const set = new Set(candidates.map((entry) => entry.object));
    const playerPos = new THREE.Vector3();
    player.getWorldPosition(playerPos);
    const yaw = player.rotation.y;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);

    secondaryBones = candidates.map((entry, i) => {
        let depth = 0;
        for (let p = entry.object.parent; p; p = p.parent) if (set.has(p)) depth++;

        // 骨骼相對角色中心的方向（用來決定裙擺／頭髮「向外飄開」的方向）
        const world = new THREE.Vector3();
        entry.object.getWorldPosition(world);
        world.sub(playerPos);
        const rx = world.x * cos - world.z * sin;
        const rz = world.x * sin + world.z * cos;
        const len = Math.hypot(rx, rz) || 1;

        return {
            object: entry.object,
            kind: SWAY.kinds[entry.kind],
            depth,
            rest: entry.object.rotation.clone(),
            radial: { x: rx / len, z: rz / len },
            phase: i * 1.713,
            ax: 0, vx: 0, az: 0, vz: 0
        };
    });

    // 每種骨骼算出鏈長，把「總擺動角度」平均分攤到每一節，避免逐節疊加後末端翹起
    const maxDepthByKind = new Map();
    secondaryBones.forEach((b) => {
        maxDepthByKind.set(b.kind, Math.max(maxDepthByKind.get(b.kind) || 0, b.depth));
    });
    secondaryBones.forEach((b) => {
        b.limit = (b.kind.total / (maxDepthByKind.get(b.kind) + 1)) * 1.4;
    });

    if (secondaryBones.length === 0) {
        const names = [...bonesByName.keys()];
        console.warn('找不到可擺動的頭髮／衣服骨骼，請依下列骨骼名稱調整 main.js 開頭的 HAIR_RE / CLOTH_RE：', names);
    } else {
        console.info(`次級擺動骨骼 ${secondaryBones.length} 個：`, secondaryBones.map((b) => b.object.name));
    }
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
                materials.forEach(tuneMaterialLook);
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
            if (object) {
                animationBones[name] = {
                    object,
                    rest: object.rotation.clone(),
                    restQuat: object.quaternion.clone()
                };
            }
        }
        player.add(model);
        scene.updateMatrixWorld(true);
        setupArmRig();
        setupSecondaryBones(bonesByName);
        modelStatus.textContent = `官方配布 MMD 角色已載入（擺動骨骼 ${secondaryBones.length} 個）`;
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
let waveBlend = 0;

// 次級擺動用的狀態
const prevPlayerPos = new THREE.Vector3();
let prevYaw = 0;
let sampledOnce = false;
const smoothVelocity = new THREE.Vector3();
let smoothYawRate = 0;

const _zAxis = new THREE.Vector3(0, 0, 1);
const _qAbduct = new THREE.Quaternion();
const _qSwing = new THREE.Quaternion();
const _tmpVelocity = new THREE.Vector3();

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

// 手臂／手肘：先繞前後擺動軸旋轉，再繞 Z 軸做外張／下垂，最後疊加在原始姿勢上。
function applyLimb(entry, swingAxis, swingAngle, abductAngle) {
    _qSwing.setFromAxisAngle(swingAxis, swingAngle);
    _qAbduct.setFromAxisAngle(_zAxis, abductAngle);
    entry.object.quaternion
        .copy(_qAbduct)
        .multiply(_qSwing)
        .multiply(entry.restQuat);
}

function updateSecondaryMotion(delta, time) {
    if (secondaryBones.length === 0) return;

    // 角色本地座標系的移動速度（+Z = 面向前方，+X = 角色左側）
    const cos = Math.cos(player.rotation.y);
    const sin = Math.sin(player.rotation.y);
    const localVX = smoothVelocity.x * cos - smoothVelocity.z * sin;
    const localVZ = smoothVelocity.x * sin + smoothVelocity.z * cos;

    const spinFlare = clamp(Math.abs(smoothYawRate) / 8, 0, 1);
    const fallFlare = clamp(-smoothVelocity.y * 0.15, 0, 0.5);
    const dt = Math.min(delta, 1 / 30);

    for (const b of secondaryBones) {
        const k = b.kind;
        const flare = k.flare * Math.min(1, spinFlare + fallFlare * 2);

        // 目標角度：往移動反方向後飄 + 轉圈／落下時向外飄開 + 微風 + 跑步起伏
        // 垂下的骨骼：繞 X 正向旋轉 = 尖端往後(-Z)；繞 Z 正向旋轉 = 尖端往 +X
        let targetX = k.lag * localVZ
            - b.radial.z * flare
            + Math.sin(time * 1.6 + b.phase) * SWAY.idle
            + Math.sin(gaitPhase * 2 + b.phase) * k.bounce * locomotionBlend;
        let targetZ = -k.lag * localVX
            + b.radial.x * flare
            + Math.cos(time * 1.3 + b.phase * 1.3) * SWAY.idle * 0.75;

        targetX = clamp(targetX, -b.limit, b.limit);
        targetZ = clamp(targetZ, -b.limit, b.limit);

        // 阻尼彈簧：越靠末端越軟、越慢，形成「跟隨」的波浪感
        const stiffness = k.stiff / (1 + b.depth * 0.08);
        b.vx += (stiffness * (targetX - b.ax) - SWAY.damping * b.vx) * dt;
        b.vz += (stiffness * (targetZ - b.az) - SWAY.damping * b.vz) * dt;
        b.ax = clamp(b.ax + b.vx * dt, -b.limit * 1.25, b.limit * 1.25); // 彈簧過衝也不超過上限
        b.az = clamp(b.az + b.vz * dt, -b.limit * 1.25, b.limit * 1.25);

        b.object.rotation.set(b.rest.x + b.ax, b.rest.y, b.rest.z + b.az, b.rest.order);
    }
}

// 鏡頭跟隨：目標平滑追著角色，並把鏡頭整體一起平移，
// 這樣角色走動時與鏡頭的距離／角度不變（原本鏡頭不動，角色會越走越遠）。
// 玩家仍可用滑鼠左鍵／單指拖曳旋轉、滾輪縮放。
const CAM = { followXZ: 9, followY: 3, headHeight: 1.25 };
function updateCameraFollow(delta) {
    const desired = _camDesired.set(player.position.x, CAM.headHeight, player.position.z); // 不跟著走路上下彈跳
    const kXZ = 1 - Math.exp(-delta * CAM.followXZ);
    const kY = 1 - Math.exp(-delta * CAM.followY);
    _camStep.set(
        (desired.x - controls.target.x) * kXZ,
        (desired.y - controls.target.y) * kY,
        (desired.z - controls.target.z) * kXZ
    );
    controls.target.add(_camStep);
    camera.position.add(_camStep);
}
const _camDesired = new THREE.Vector3();
const _camStep = new THREE.Vector3();

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

    // 手勢（跳躍／轉圈）— 放在速度取樣之前，讓擺動能反映出位移與旋轉
    if (currentGesture) {
        gestureTimer += delta;
        if (currentGesture === 'jump') {
            player.position.y = Math.abs(Math.sin(gestureTimer * Math.PI * 2)) * 0.8;
            if (gestureTimer >= 1) currentGesture = null;
        } else if (currentGesture === 'spin') {
            player.rotation.y += delta * 10;
            if (gestureTimer >= 1.2) currentGesture = null;
        } else if (currentGesture === 'wave') {
            if (gestureTimer >= 2.5) currentGesture = null;
        }
    }

    // 取樣角色速度／轉速（供頭髮、衣服慣性使用）
    if (!sampledOnce) {
        prevPlayerPos.copy(player.position);
        prevYaw = player.rotation.y;
        sampledOnce = true;
    }
    if (delta > 0) {
        _tmpVelocity.copy(player.position).sub(prevPlayerPos).divideScalar(delta);
        const follow = 1 - Math.exp(-delta * 10);
        smoothVelocity.lerp(_tmpVelocity, follow);
        smoothYawRate += (((player.rotation.y - prevYaw) / delta) - smoothYawRate) * follow;
    }
    prevPlayerPos.copy(player.position);
    prevYaw = player.rotation.y;

    // 揮手的混合權重（平滑進出，避免手臂瞬間跳動）
    waveBlend += ((currentGesture === 'wave' ? 1 : 0) - waveBlend) * (1 - Math.exp(-delta * 9));

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
        const kneeBend = 0.28 + sprintBlend * 0.3;
        const idleBreath = Math.sin(time * 1.7);

        // 腿
        setBonePose('leftLeg', step * walkSwing * locomotionBlend);
        setBonePose('rightLeg', oppositeStep * walkSwing * locomotionBlend);
        setBonePose('leftKnee', Math.max(0, -step) * kneeBend * locomotionBlend);
        setBonePose('rightKnee', Math.max(0, -oppositeStep) * kneeBend * locomotionBlend);

        // 手臂：與對側腿相反方向前後擺動，並保持離開身體一小段距離
        if (armRig) {
            const swingAmp = (ARM.swing + sprintBlend * ARM.sprintSwing) * locomotionBlend;
            const swings = { left: step * swingAmp, right: oppositeStep * swingAmp }; // 正值 = 往前
            for (const side of ['left', 'right']) {
                const rig = armRig[side];
                if (!rig) continue;
                const swing = swings[side];
                const breath = Math.sin(time * 1.7 + (side === 'left' ? 0 : 0.6)) * 0.02 * (1 - locomotionBlend);

                // 下垂量：基本下垂 + 呼吸，移動時略為外張
                let abduct = rig.lowerSign * (ARM.drop + breath - ARM.outwardRun * locomotionBlend);
                let armSwing = swing;
                let elbowBend = ARM.elbowIdle
                    + ARM.elbowWalk * locomotionBlend
                    + ARM.elbowSprint * sprintBlend
                    + Math.max(0, swing) * 0.5; // 手往前擺時手肘彎得更多

                // 揮手：右手舉到側上方，前臂左右擺動
                let elbowAbduct = 0;
                if (side === 'right' && waveBlend > 0.001) {
                    abduct = THREE.MathUtils.lerp(abduct, -1.25, waveBlend);
                    armSwing = THREE.MathUtils.lerp(armSwing, 0.15, waveBlend);
                    elbowBend = THREE.MathUtils.lerp(elbowBend, 0.1, waveBlend);
                    elbowAbduct = (-0.85 + Math.sin(gestureTimer * 10) * 0.35) * waveBlend;
                }

                applyLimb(rig.arm, rig.armAxis, armSwing, abduct);
                applyLimb(rig.elbow, rig.elbowAxis, elbowBend, elbowAbduct);
            }
        }

        // 肩膀：揮手時稍微抬起；其餘維持原始姿勢
        setBonePose('leftShoulder');
        setBonePose('rightShoulder', 0, 0, -0.15 * waveBlend);
        setBonePose('leftWrist', 0, 0, -step * 0.05 * locomotionBlend);
        setBonePose('rightWrist', 0, 0, step * 0.05 * locomotionBlend + Math.sin(gestureTimer * 12) * 0.25 * waveBlend);

        // 軀幹：走路時上身與骨盆反向扭轉、衝刺時前傾
        setBonePose('lowerBody', 0, step * 0.05 * locomotionBlend);
        setBonePose('upperBody', 0.06 * sprintBlend + idleBreath * 0.012 * (1 - locomotionBlend), -step * 0.08 * locomotionBlend);
        setBonePose('chest', idleBreath * (0.018 + 0.012 * (1 - locomotionBlend)), -step * 0.04 * locomotionBlend);
        setBonePose('neck', 0, Math.sin(time * 0.8) * 0.018 * (1 - locomotionBlend));
        setBonePose('head', Math.sin(time * 1.4) * 0.012, Math.sin(time * 0.7) * 0.025, 0);

        // 頭髮、裙擺、緞帶等次級擺動
        updateSecondaryMotion(delta, time);
    } else if (fallbackCharacter && fallbackArmRestRotation && currentGesture === 'wave') {
        const arm = fallbackCharacter.userData.rightArm;
        arm.rotation.copy(fallbackArmRestRotation);
        arm.rotation.x -= Math.PI * 0.65;
        arm.rotation.z = fallbackArmRestRotation.z + Math.sin(gestureTimer * 10) * 0.35;
    }

    updateCameraFollow(delta);
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