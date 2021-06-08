let slopee = 0;
let numberOfCoin = 1;
let level = 1;
let walls = 10;
let runNextLevel = true;
let wireFrame = false;

class Game {
    constructor() {
        this.container;
        this.camera;
        this.scene;
        this.renderer;
        this.debug = true;
        this.debugPhysics = true;
        this.fixedTimeStep = 1.0 / 60.0;

        this.container = document.createElement('div');
        this.container.id = 'scene'
        this.container.style.height = '100%';
        document.body.appendChild(this.container);


        this.js = { forward: 0, turn: 0 };
        this.clock = new THREE.Clock();

        this.init();

        window.onError = function (error) {
            console.error(JSON.stringify(error));
        }
    }



    init() {
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
        this.camera.position.set(0, 6, -15);
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);
        this.helper = new CannonHelper(this.scene);
        this.helper.addLights(this.renderer);
        this.helper.addSkyBox(this.renderer);
        this.joystick = new JoyStick({
            game: this,
            onMove: this.joystickCallback
        });
        this.initPhysics();
    }

    initPhysics() {
        this.physics = {};
        const game = this;
        const world = new CANNON.World();
        this.world = world;
        world.broadphase = new CANNON.SAPBroadphase(world);
        world.gravity.set(0, -10, 0);
        world.defaultContactMaterial.friction = 0;
        const groundMaterial = new CANNON.Material("groundMaterial");
        const wheelMaterial = new CANNON.Material("wheelMaterial");
        const wheelGroundContactMaterial = new CANNON.ContactMaterial(wheelMaterial, groundMaterial, {
            friction: 0.3,
            restitution: 0,
            contactEquationStiffness: 1000,
        });

        world.addContactMaterial(wheelGroundContactMaterial);
        const chassisBody = new CANNON.Body({ mass: 350 });
        const chassisShape = new CANNON.Box(new CANNON.Vec3(1, 0.3, 2));
        const chassisShapeTop = new CANNON.Box(new CANNON.Vec3(.9, 0.5, 1));
        chassisBody.addShape(chassisShape, new CANNON.Vec3(0, 0, 0), new CANNON.Quaternion());
        chassisBody.addShape(chassisShapeTop, new CANNON.Vec3(0, .5, 0), new CANNON.Quaternion());
        chassisBody.position.set(0, 0, 0);
        chassisBody.angularVelocity.set(0, 0, 0);
        this.helper.addVisual(chassisBody, 'car');
        this.followCam = new THREE.Object3D();
        this.followCam.position.copy(this.camera.position);
        this.scene.add(this.followCam);
        this.followCam.parent = chassisBody.threemesh;
        this.helper.shadowTarget = chassisBody.threemesh;
        const vehicle = new CANNON.RaycastVehicle({
            chassisBody: chassisBody,
            indexRightAxis: 0,
            indexUpAxis: 1,
            indexForwardAxis: 1,
        });

        const options = {
            radius: 0.5,
            directionLocal: new CANNON.Vec3(0, -1.6, 0),
            suspensionStiffness: 45,
            suspensionRestLength: 0.4,
            frictionSlip: 5,
            dampingRelaxation: 2.3,
            dampingCompression: 4.5,
            maxSuspensionForce: 200000,
            rollInfluence: 0.001,
            axleLocal: new CANNON.Vec3(0, 0, 0),
            chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
            maxSuspensionTravel: 0.15,
            customSlidingRotationalSpeed: -30,
            useCustomSlidingRotationalSpeed: false,
        };

        function randomPosition() {
            const negative = Math.floor(Math.random() < 0.5 ? -1 : 1);
            const random = Math.floor(Math.random() * 64 + 1);
            const number = negative * random
            return number;
        }

        const coinBodies = [];

        const addCoin = () => {
            let x = randomPosition();
            let y = randomPosition();
            const radius = .5;
            const coinBody = new CANNON.Body({ mass: 0 });
            const coinShape = new CANNON.Cylinder(radius, radius, radius / 2, 30);
            coinBody.addShape(coinShape);
            coinBody.position.set(x, -2, y);
            coinBody.angularVelocity.set(0, 0, 0);
            world.add(coinBody)
            coinBodies.push(coinBody);
            this.helper.addVisual(coinBody, 'coin');
        }

        for (var i = 0; i < numberOfCoin; i++) { addCoin() }
        const removeCoin = () => {
            var coinsLeft = coinBodies.filter(function (el) {
                return el.world !== null;
            });
            var filtered = coinBodies.filter(function (el) {
                return el.world === null;
            });

            const counter = document.querySelector('.money');
            let number = filtered.length;
            let score = coinsLeft.length;
            counter.innerHTML = score + ' left';
            if (number === numberOfCoin && runNextLevel === true) {
                newLevel();
                runNextLevel = false;
            }

        }

        for (var i = 0; i < coinBodies.length; i++) {
            coinBodies[i].addEventListener("collide", function (e) {
                world.remove(e.target)
                e.target.threemesh.visible = false
                removeCoin()
            });
        }

        const axlewidth = 1;
        options.chassisConnectionPointLocal.set(axlewidth, 0, -1);
        vehicle.addWheel(options);

        options.chassisConnectionPointLocal.set(-axlewidth, 0, -1);
        vehicle.addWheel(options);

        options.chassisConnectionPointLocal.set(axlewidth, 0, 1);
        vehicle.addWheel(options);

        options.chassisConnectionPointLocal.set(-axlewidth, 0, 1);
        vehicle.addWheel(options);

        vehicle.addToWorld(world);

        const wheelBodies = [];

        vehicle.wheelInfos.forEach(function (wheel) {
            const cylinderShape = new CANNON.Cylinder(wheel.radius, wheel.radius, wheel.radius / 2, 30);
            const wheelBody = new CANNON.Body({ mass: 1, material: wheelMaterial });
            const q = new CANNON.Quaternion();
            q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
            wheelBody.addShape(cylinderShape, new CANNON.Vec3(), q);
            wheelBodies.push(wheelBody);
            game.helper.addVisual(wheelBody, 'wheel');

        });

        world.addEventListener('postStep', function () {
            for (var i = 0; i < game.vehicle.wheelInfos.length; i++) {
                game.vehicle.updateWheelTransform(i);
                var t = game.vehicle.wheelInfos[i].worldTransform;
                wheelBodies[i].threemesh.position.copy(t.position);
                wheelBodies[i].threemesh.quaternion.copy(t.quaternion);
            }
        });

        this.vehicle = vehicle;
        // World
        let matrix = [];
        let sizeX = 64,
            sizeY = 64,
            slope = slopee,
            steep = 1;

        for (let i = 0; i < sizeX; i++) {
            matrix.push([]);
            for (var j = 0; j < sizeY; j++) {
                var height = Math.cos(i / sizeX * Math.PI * slope) * Math.sin(j / sizeY * Math.PI * slope) * steep + steep;
                //the outer 4 edges of the plane
                if (i === 0 || i === sizeX - 1 || j === 0 || j === sizeY - 1)
                    height = walls;
                matrix[i].push(height);
            }
        }

        var hfShape = new CANNON.Heightfield(matrix, {
            elementSize: 150 / sizeX
        });
        var hfBody = new CANNON.Body({ mass: 0 });
        hfBody.addShape(hfShape);
        hfBody.position.set(-sizeX * hfShape.elementSize / 2, -4, sizeY * hfShape.elementSize / 2);
        hfBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        world.add(hfBody);
        this.helper.addVisual(hfBody, 'landscape');
        this.animate();
    }


    joystickCallback(forward, turn) {
        this.js.forward = -forward;
        this.js.turn = -turn;
    }

    updateDrive(forward = this.js.forward, turn = this.js.turn) {
        const maxSteerVal = 0.6;
        const maxForce = 1000;
        const brakeForce = 10;
        const force = maxForce * forward;
        const steer = maxSteerVal * turn;
        if (forward != 0) {
            this.vehicle.setBrake(0, 0);
            this.vehicle.setBrake(0, 1);
            this.vehicle.setBrake(0, 2);
            this.vehicle.setBrake(0, 3);
            this.vehicle.applyEngineForce(force, 0);
            this.vehicle.applyEngineForce(force, 1);
        } else {
            this.vehicle.setBrake(brakeForce, 0);
            this.vehicle.setBrake(brakeForce, 1);
            this.vehicle.setBrake(brakeForce, 2);
            this.vehicle.setBrake(brakeForce, 3);
        }
        this.vehicle.setSteeringValue(steer, 2);
        this.vehicle.setSteeringValue(steer, 3);
    }
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    updateCamera() {
        this.camera.position.lerp(this.followCam.getWorldPosition(new THREE.Vector3()), 0.05);
        this.camera.lookAt(this.vehicle.chassisBody.threemesh.position);
        if (this.helper.sun != undefined) {
            this.helper.sun.position.copy(this.camera.position);
            this.helper.sun.position.y += 10;
        }
    }

    animate() {
        const game = this;
        requestAnimationFrame(function () { game.animate(); });
        const now = Date.now();
        if (this.lastTime === undefined) this.lastTime = now;
        const dt = (Date.now() - this.lastTime) / 1000.0;
        this.FPSFactor = dt;
        this.lastTime = now;
        this.world.step(this.fixedTimeStep, dt);
        this.helper.updateBodies(this.world);
        this.updateDrive();
        this.updateCamera();
        // window.addEventListener('resize', this.onWindowResize());
        this.renderer.render(this.scene, this.camera);
        if (this.stats != undefined) this.stats.update();
    }
}

class JoyStick {
    constructor(options) {
        const circle = document.createElement("div");
        circle.id = 'joyStick';
        circle.style.cssText = "position:absolute; bottom:35px; width:80px; height:80px; background:rgba(126, 126, 126, 0.5); border:#444 solid medium; border-radius:50%; left:50%; transform:translateX(-50%);";
        const thumb = document.createElement("div");
        thumb.style.cssText = "position: absolute; left: 20px; top: 20px; width: 40px; height: 40px; border-radius: 50%; background: #fff;";
        circle.appendChild(thumb);
        document.body.appendChild(circle);
        this.domElement = thumb;
        this.maxRadius = options.maxRadius || 40;
        this.maxRadiusSquared = this.maxRadius * this.maxRadius;
        this.onMove = options.onMove;
        this.game = options.game;
        this.origin = { left: this.domElement.offsetLeft, top: this.domElement.offsetTop };
        this.rotationDamping = options.rotationDamping || 0.06;
        this.moveDamping = options.moveDamping || 0.01;
        if (this.domElement != undefined) {
            const joystick = this;
            if ('ontouchstart' in window) {
                this.domElement.addEventListener('touchstart', function (evt) { joystick.tap(evt); });
            } else {
                this.domElement.addEventListener('mousedown', function (evt) { joystick.tap(evt); });
            }
        }
    }

    getMousePosition(evt) {
        let clientX = evt.targetTouches ? evt.targetTouches[0].pageX : evt.clientX;
        let clientY = evt.targetTouches ? evt.targetTouches[0].pageY : evt.clientY;
        return { x: clientX, y: clientY };
    }

    tap(evt) {
        evt = evt || window.event;
        this.offset = this.getMousePosition(evt);
        const joystick = this;
        if ('ontouchstart' in window) {
            document.ontouchmove = function (evt) { joystick.move(evt); };
            document.ontouchend = function (evt) { joystick.up(evt); };
        } else {
            document.onmousemove = function (evt) { joystick.move(evt); };
            document.onmouseup = function (evt) { joystick.up(evt); };
        }
    }

    move(evt) {
        evt = evt || window.event;
        const mouse = this.getMousePosition(evt);
        let left = mouse.x - this.offset.x;
        let top = mouse.y - this.offset.y;
        const sqMag = left * left + top * top;
        if (sqMag > this.maxRadiusSquared) {
            const magnitude = Math.sqrt(sqMag);
            left /= magnitude;
            top /= magnitude;
            left *= this.maxRadius;
            top *= this.maxRadius;
        }
        this.domElement.style.top = `${top + this.domElement.clientHeight / 2}px`;
        this.domElement.style.left = `${left + this.domElement.clientWidth / 2}px`;
        const forward = -(top - this.origin.top + this.domElement.clientHeight / 2) / this.maxRadius;
        const turn = (left - this.origin.left + this.domElement.clientWidth / 2) / this.maxRadius;
        if (this.onMove != undefined) this.onMove.call(this.game, forward, turn);
    }
    up(evt) {
        if ('ontouchstart' in window) {
            document.ontouchmove = null;
            document.touchend = null;
        } else {
            document.onmousemove = null;
            document.onmouseup = null;
        }
        this.domElement.style.top = `${this.origin.top}px`;
        this.domElement.style.left = `${this.origin.left}px`;
        this.onMove.call(this.game, 0, 0);
    }
}

class CannonHelper {
    constructor(scene) {
        this.scene = scene;
    }
    addSkyBox(renderer) {
        const loader = new THREE.TextureLoader();
        const texture = loader.load(
            'assets/skyline.jpg',
            () => {
                const rt = new THREE.WebGLCubeRenderTarget(texture.image.height);
                rt.fromEquirectangularTexture(renderer, texture);
                this.scene.background = rt.texture;
            });
    }

    addLights(renderer) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        const ambient = new THREE.AmbientLight(0x333333);
        this.scene.add(ambient);

        const light = new THREE.PointLight(0xdddddd, 1, 100);
        light.position.set(3, 10, 4);

        /* const light = new THREE.DirectionalLight(0xdddddd, 1, 100);
        light.position.set(3, 10, 4);
        light.target.position.set(0, 0, 0); */

        light.castShadow = true;
        const lightSize = 30;
        light.shadow.camera.near = 1;
        light.shadow.camera.far = 50;
        light.shadow.camera.left = light.shadow.camera.bottom = -lightSize;
        light.shadow.camera.right = light.shadow.camera.top = lightSize;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        this.sun = light;
        this.scene.add(light);
    }

    set shadowTarget(obj) {
        if (this.sun !== undefined) this.sun.target = obj;
    }

    createCannonTrimesh(geometry) {
        if (!geometry.isBufferGeometry) return null;
        const posAttr = geometry.attributes.position;
        const vertices = geometry.attributes.position.array;
        let indices = [];
        for (let i = 0; i < posAttr.count; i++) {
            indices.push(i);
        }
        return new CANNON.Trimesh(vertices, indices);
    }

    createCannonConvex(geometry) {
        if (!geometry.isBufferGeometry) return null;
        const posAttr = geometry.attributes.position;
        const floats = geometry.attributes.position.array;
        const vertices = [];
        const faces = [];
        let face = [];
        let index = 0;
        for (let i = 0; i < posAttr.count; i += 3) {
            vertices.push(new CANNON.Vec3(floats[i], floats[i + 1], floats[i + 2]));
            face.push(index++);
            if (face.length == 3) {
                faces.push(face);
                face = [];
            }
        }
        return new CANNON.ConvexPolyhedron(vertices, faces);
    }

    addVisual(body, name, castShadow = true, receiveShadow = true) {
        body.name = name;
        if (name === "wheel") this.currentMaterial = new THREE.MeshLambertMaterial({ color: 0x000, wireframe: false });
        if (name === "car") this.currentMaterial = new THREE.MeshLambertMaterial({ color: 0Xffff, wireframe: false });
        if (name === "landscape") this.currentMaterial = new THREE.MeshLambertMaterial({ color: 0X333333, opacity: 0.8, transparent: true, wireframe: wireFrame });
        if (name === "coin") this.currentMaterial = new THREE.MeshLambertMaterial({ color: 0Xf8ff2e, emissive: 0X000, wireframe: false });
        if (this.settings === undefined) {
            this.settings = {
                stepFrequency: 60,
                quatNormalizeSkip: 2,
                quatNormalizeFast: true,
                gx: 0,
                gy: 0,
                gz: 0,
                iterations: 3,
                tolerance: 0.0001,
                k: 1e6,
                d: 3,
                scene: 0,
                paused: false,
                rendermode: "solid",
                constraints: false,
                contacts: false,
                cm2contact: false,
                normals: false,
                axes: false,
                particleSize: 0.1,
                shadows: false,
                aabbs: false,
                profiling: false,
                maxSubSteps: 3
            }
            this.particleGeo = new THREE.SphereGeometry(1, 16, 8);
            this.particleMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        }

        let mesh;
        if (body instanceof CANNON.Body) mesh = this.shape2Mesh(body, castShadow, receiveShadow);
        if (mesh) {
            body.threemesh = mesh;
            mesh.castShadow = castShadow;
            mesh.receiveShadow = receiveShadow;
            this.scene.add(mesh);
        }
    }

    shape2Mesh(body, castShadow, receiveShadow) {
        const obj = new THREE.Object3D();
        const material = this.currentMaterial;
        const game = this;
        let index = 0;
        body.shapes.forEach(function (shape) {
            let mesh;
            let geometry;
            let v0, v1, v2;
            switch (shape.type) {
                case CANNON.Shape.types.SPHERE:
                    const sphere_geometry = new THREE.SphereGeometry(shape.radius, 8, 8);
                    mesh = new THREE.Mesh(sphere_geometry, material);
                    break;
                case CANNON.Shape.types.PARTICLE:
                    mesh = new THREE.Mesh(game.particleGeo, game.particleMaterial);
                    const s = this.settings;
                    mesh.scale.set(s.particleSize, s.particleSize, s.particleSize);
                    break;
                case CANNON.Shape.types.PLANE:
                    geometry = new THREE.PlaneGeometry(10, 10, 4, 4);
                    mesh = new THREE.Object3D();
                    const submesh = new THREE.Object3D();
                    const ground = new THREE.Mesh(geometry, material);
                    ground.scale.set(100, 100, 100);
                    submesh.add(ground);
                    mesh.add(submesh);
                    break;

                case CANNON.Shape.types.BOX:
                    const box_geometry = new THREE.BoxGeometry(shape.halfExtents.x * 2,
                        shape.halfExtents.y * 2,
                        shape.halfExtents.z * 2);
                    mesh = new THREE.Mesh(box_geometry, material);
                    break;

                case CANNON.Shape.types.CONVEXPOLYHEDRON:
                    const geo = new THREE.Geometry();
                    shape.vertices.forEach(function (v) {
                        geo.vertices.push(new THREE.Vector3(v.x, v.y, v.z));
                    });

                    shape.faces.forEach(function (face) {
                        const a = face[0];
                        for (let j = 1; j < face.length - 1; j++) {
                            const b = face[j];
                            const c = face[j + 1];
                            geo.faces.push(new THREE.Face3(a, b, c));
                        }
                    });
                    geo.computeBoundingSphere();
                    geo.computeFaceNormals();
                    mesh = new THREE.Mesh(geo, material);
                    break;

                case CANNON.Shape.types.HEIGHTFIELD:
                    geometry = new THREE.Geometry();
                    v0 = new CANNON.Vec3();
                    v1 = new CANNON.Vec3();
                    v2 = new CANNON.Vec3();
                    for (let xi = 0; xi < shape.data.length - 1; xi++) {
                        for (let yi = 0; yi < shape.data[xi].length - 1; yi++) {
                            for (let k = 0; k < 2; k++) {
                                shape.getConvexTrianglePillar(xi, yi, k === 0);
                                v0.copy(shape.pillarConvex.vertices[0]);
                                v1.copy(shape.pillarConvex.vertices[1]);
                                v2.copy(shape.pillarConvex.vertices[2]);
                                v0.vadd(shape.pillarOffset, v0);
                                v1.vadd(shape.pillarOffset, v1);
                                v2.vadd(shape.pillarOffset, v2);
                                geometry.vertices.push(
                                    new THREE.Vector3(v0.x, v0.y, v0.z),
                                    new THREE.Vector3(v1.x, v1.y, v1.z),
                                    new THREE.Vector3(v2.x, v2.y, v2.z)
                                );
                                var i = geometry.vertices.length - 3;
                                geometry.faces.push(new THREE.Face3(i, i + 1, i + 2));
                            }
                        }
                    }
                    geometry.computeBoundingSphere();
                    geometry.computeFaceNormals();
                    mesh = new THREE.Mesh(geometry, material);
                    break;

                case CANNON.Shape.types.TRIMESH:
                    geometry = new THREE.Geometry();
                    v0 = new CANNON.Vec3();
                    v1 = new CANNON.Vec3();
                    v2 = new CANNON.Vec3();
                    for (let i = 0; i < shape.indices.length / 3; i++) {
                        shape.getTriangleVertices(i, v0, v1, v2);
                        geometry.vertices.push(
                            new THREE.Vector3(v0.x, v0.y, v0.z),
                            new THREE.Vector3(v1.x, v1.y, v1.z),
                            new THREE.Vector3(v2.x, v2.y, v2.z)
                        );
                        var j = geometry.vertices.length - 3;
                        geometry.faces.push(new THREE.Face3(j, j + 1, j + 2));
                    }
                    geometry.computeBoundingSphere();
                    geometry.computeFaceNormals();
                    mesh = new THREE.Mesh(geometry, MutationRecordaterial);
                    break;
                default:
                    throw "Visual type not recognized: " + shape.type;
            }

            mesh.receiveShadow = receiveShadow;
            mesh.castShadow = castShadow;
            mesh.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = castShadow;
                    child.receiveShadow = receiveShadow;
                }
            });
            var o = body.shapeOffsets[index];
            var q = body.shapeOrientations[index++];
            mesh.position.set(o.x, o.y, o.z);
            mesh.quaternion.set(q.x, q.y, q.z, q.w);
            obj.add(mesh);
        });
        return obj;
    }

    updateBodies(world) {
        world.bodies.forEach(function (body) {
            if (body.threemesh != undefined) {
                body.threemesh.position.copy(body.position);
                body.threemesh.quaternion.copy(body.quaternion);
            }
        });
    }
}

document.getElementById('startBtn').addEventListener('click', start);
document.getElementById('startNextLevel').addEventListener('click', start);
document.getElementById('restart').addEventListener('click', restart);
document.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        restart();
    }
});
function start() {
    const counter = document.querySelector('.money');
    counter.innerHTML = numberOfCoin + ' left'
    runNextLevel = true;
    document.querySelector('.betweenLevels').style.display = 'none';
    document.querySelector('.introduction').style.display = 'none';
    document.querySelector('.stats').style.display = 'block'
    document.querySelector('.instructions').style.display = 'flex'
    const game = new Game();
}
function restart() {
    const counter = document.querySelector('.money');
    counter.innerHTML = '';
    const el = document.getElementById('scene');
    const joyStick = document.getElementById('joyStick');
    el.remove();
    joyStick.remove();
    const game = new Game();
}
function endGame() {
    const counter = document.querySelector('.money');
    counter.remove();
    const totalMoney = document.querySelector('.totalMoney');
    totalMoney.style.display = 'block';
    totalMoney.innerHTML = '2500 kr';
    const el = document.getElementById('scene');
    const joyStick = document.getElementById('joyStick');
    el.remove();
    joyStick.remove();
    document.querySelector('.endGame').style.display = 'flex';
    document.querySelector('.instructions').style.display = 'none'
}
function betweenLevels(level) {
    const el = document.getElementById('scene');
    const joyStick = document.getElementById('joyStick');
    el.remove();
    joyStick.remove();
    document.querySelector('.instructions').style.display = 'none'
    document.querySelector('.betweenLevels').style.display = 'flex';
    document.getElementById('completedLevel').innerHTML = ' You Completed level ' + level
    document.getElementById('startNextLevel').innerHTML = 'Click here to start level ' + (level + 1)
}
function newLevel() {
    if (level === 3) {
        endGame();
    }
    if (level === 2) {
        slopee = 10;
        numberOfCoin = 10;
        walls = 0;
        level += 1
        wireFrame = true;
        betweenLevels(2);
    }
    if (level === 1) {
        slopee = 2;
        numberOfCoin = 1;
        walls = 0;
        level += 1

        betweenLevels(1);
    }
}
