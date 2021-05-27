import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';
import * as CANNON from 'https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js'

let camera, scene, renderer, messh, goal, keys, follow;

let temp = new THREE.Vector3;
let dir = new THREE.Vector3;
let a = new THREE.Vector3;
let b = new THREE.Vector3;
let coronaSafetyDistance = 0.3;
let velocity = 0.0;
let speed = 0.0;

init();
animate();

function createWheels() {
    const geometry = new THREE.BoxBufferGeometry(1.2, 1.2, 3.3);
    const material = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const wheel = new THREE.Mesh(geometry, material);
    return wheel;
}

function createCar() {
    const car = new THREE.Group();

    const backWheel = createWheels();
    backWheel.position.y = 1;
    backWheel.position.x = -18;
    car.add(backWheel);

    const frontWheel = createWheels();
    frontWheel.position.y = 6;
    frontWheel.position.x = 18;
    car.add(frontWheel);

    const main = new THREE.Mesh(
        new THREE.BoxBufferGeometry(1, 1, 1),
        new THREE.MeshLambertMaterial({ color: 0x78b14b })
    );
    main.position.y = 12;
    car.add(main);

    const cabin = new THREE.Mesh(
        new THREE.BoxBufferGeometry(1, 1, 1),
        new THREE.MeshLambertMaterial({ color: 0xffffff })
    );
    cabin.position.x = -6;
    cabin.position.y = 0;
    car.add(cabin);

    return car;
}

/* function initPhysics() {
    world = new CANNON.World()

    dt = 1.0 / 60.0
    damping = 0.01;

    world.broadPhase = new CANNON.NaiveBroadplane
} */


function init() {
    /* const fov = 75;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 1000.0; */




    camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.01, 10);
    camera.position.set(- .05, -.1, 0);

    scene = new THREE.Scene();
    camera.lookAt(scene.position);

    var geometry = new THREE.BoxBufferGeometry(0.2, 0.2, 0.2);
    var material = new THREE.MeshNormalMaterial();

    messh = new THREE.Mesh(geometry, material);

    goal = new THREE.Object3D;
    follow = new THREE.Object3D;

    follow.position.z = -coronaSafetyDistance;
    messh.add(follow);

    const geometryPlane = new THREE.PlaneGeometry(100, 100, 10);
    const materialPlane = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(geometryPlane, materialPlane);
    plane.rotateX(Math.PI / 2);
    plane.position.set(0, -.2, 0)
    scene.add(plane);

    goal.add(camera);
    scene.add(messh);

    const car = createCar();
    scene.add(car);

    var gridHelper = new THREE.GridHelper(100, 100);
    gridHelper.position.set(0, -.2, 0)
    scene.add(gridHelper);

    let light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
    light.position.set(-100, -100, 100);
    light.target.position.set(100, 0, 0);
    light.castShadow = true;
    light.shadow.bias = -0.001;
    light.shadow.mapSize.width = 4096;
    light.shadow.mapSize.height = 4096;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.left = 50;
    light.shadow.camera.right = -50;
    light.shadow.camera.top = 50;
    light.shadow.camera.bottom = -50;
    scene.add(light);

    const lighta = new THREE.PointLight(0xff0000, 100, 100);
    lighta.position.set(50, 50, 50);
    scene.add(lighta);



    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);



    keys = {
        a: false,
        s: false,
        d: false,
        w: false,
        q: false
    };

    document.body.addEventListener('keydown', function (e) {
        const key = e.code.replace('Key', '').toLowerCase();
        if (keys[key] !== undefined)
            keys[key] = true;
    });
    document.body.addEventListener('keyup', function (e) {
        const key = e.code.replace('Key', '').toLowerCase();
        if (keys[key] !== undefined)
            keys[key] = false;
    });


}

function animate() {

    requestAnimationFrame(animate);
    speed = 0;

    if (keys.w) {
        speed = 0.03;
        if (keys.q) {
            speed = 0.06;
        }

    } else if (keys.s) {
        speed = -0.01;
    }
    velocity += (speed - velocity) * .3;
    messh.translateZ(velocity);

    if (keys.a)
        messh.rotateY(0.05);
    else if (keys.d)
        messh.rotateY(-0.05);

    a.lerp(messh.position, 0.1);
    b.copy(goal.position);

    dir.copy(a).sub(b).normalize();
    const dis = a.distanceTo(b) - coronaSafetyDistance;
    goal.position.addScaledVector(dir, dis);
    goal.position.lerp(temp, 0.0002);
    temp.setFromMatrixPosition(follow.matrixWorld);

    camera.lookAt(messh.position);
    renderer.render(scene, camera);
}