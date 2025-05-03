import xnew from '@mulsense/xnew';
import xthree from '@mulsense/xnew/addons/xthree';
import * as THREE from 'three';

const perspective = 500;
const offset = { rx: 0, ry: 11, rz: 0, tx: 120, ty: 0, tz: 0 };
const transform = { rx: 0, ry: 0, rz: 0, tx: 0, ty: 0, tz: 0 };
const state = { id: 0, moving: false };

xnew('#main', Main);

function Main(self) {
  xnew(HtmlMain);
  xnew(ThreeMain);
  xnew(Event);
}

function HtmlMain(self) {
  const targets = xnew('#targets');
  targets.element.style.display = 'block';

  document.querySelectorAll('.target').forEach((element, index) => {
    xnew(element, Plane, index);
  });
}

function Plane(self, id) {
  let opacity = id === state.id ? 0.80 : 0.20;
  self.on('+planefade', () => {
    xnew.transition(({ progress }) => {
      opacity = id === state.id ? Math.max(opacity, 0.20 + progress * 0.60) : Math.min(opacity, 0.80 - progress * 0.60);
    }, 700);
  });

  return {
    update() {
      self.element.style.opacity = opacity;
      self.element.style.transform = `
            translateZ(${perspective}px) 
            translateX(${(transform.tx + offset.tx)}px) translateY(${(transform.ty + offset.ty)}px)
            rotateX(${transform.rx + offset.rx}deg) rotateY(${transform.ry + offset.ry + id * 90}deg) 
            translateZ(${-perspective}px)
          `;
    }
  }
}

function Event(self) {
  xnew('.button.left', Button, +1);
  xnew('.button.right', Button, -1);

  function Button(self, direction) {
    self.on('click', () => {
      if (state.moving === false) {
        state.id = (state.id + direction + 4) % 4;
        state.moving = true;
        const backup = { ...transform };
        xnew.transition(({ progress }) => {
          const p = (1.0 - Math.cos(progress * Math.PI)) * 0.5;
          transform.ry = backup.ry - direction * 90 * p;
          transform.ty = backup.ty * (1.0 - p);
          if (progress === 1.0) state.moving = false;
        }, 700);
        xnew.emit('+planefade');
      }
    });
  }

  self.on('wheel', (event) => {
    event.preventDefault();
    transform.ty = Math.max(-300, Math.min(+300, transform.ty + event.wheelDeltaY * 0.2));
  }, { passive: false });

  // xnew(xnew.DragEvent).on('move', (event, { position, delta }) => {
  //   transform.ry -= delta.x * 0.2;
  //   transform.rx += delta.y * 0.2;
  // });
}

function ThreeMain(self) {
  const screen = xnew('#screen', xnew.Screen, { width: 1200, height: 800, fit: 'cover' });
  xthree.setup();

  xnew(xnew.ResizeEvent).on('-resize', () => {
    xthree.camera.fov = fov();
    xthree.camera.updateProjectionMatrix();
  });

  function fov() {
    return Math.atan2(screen.canvas.getBoundingClientRect().height / 2, perspective) * 2 * 180 / Math.PI;
  }

  xnew(ThreeContents);
  xnew(() => {
    return {
      update() {
        xthree.scene.rotation.x = -(transform.rx + offset.rx) * Math.PI / 180;
        xthree.scene.rotation.y = +(transform.ry + offset.ry) * Math.PI / 180;
        xthree.camera.position.x = -(transform.tx + offset.tx);
        xthree.camera.position.y = +(transform.ty + offset.ty);
      },
    }
  });
}

function ThreeContents(self) {
  xnew(DirectionaLight, 20, -50, 50, 0.1);
  xnew(DirectionaLight, 20, 50, -10, 0.1);
  xnew(AmbientLight, 0.05);
  xnew(Room);
}

function DirectionaLight(self, x, y, z, value) {
  const object = xthree.nest(new THREE.DirectionalLight(0xFFFFFF, value));
  object.position.set(x, y, z);
}

function AmbientLight(self, value) {
  const object = xthree.nest(new THREE.AmbientLight(0xFFFFFF, value));
}

function Room(self) {
  const size = perspective;
  const geometry = new THREE.BoxGeometry(size * 2, size * 2, size * 2);
  const material = new THREE.MeshStandardMaterial({
    color: 0xF8F8FF, side: THREE.BackSide,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
  });
  const object = xthree.nest(new THREE.Mesh(geometry, material));

  xnew(Grid, { tz: +size, rx: 90 });
  xnew(Grid, { tz: -size, rx: 90 });
  xnew(Grid, { tx: +size, rz: 90 });
  xnew(Grid, { tx: -size, rz: 90 });
  xnew(Grid, { ty: +size });
  xnew(Grid, { ty: -size });
}

function Grid(self, { tx = 0, ty = 0, tz = 0, rx = 0, ry = 0, rz = 0 }) {
  const object = xthree.nest(new THREE.GridHelper(1100, 10, 0x444466, 0x444466));
  object.rotation.set(rx * Math.PI / 180, ry * Math.PI / 180, rz * Math.PI / 180);
  object.position.set(tx, ty, tz);
}
