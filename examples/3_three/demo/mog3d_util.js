//--------------------------------------------------------------------------------
// Copyright (c) 2019-2020, sanko-shoko. All rights reserved.
//--------------------------------------------------------------------------------

EventTarget.prototype.addEventListenerEx = function(events, listener) {
    (events.split(" ")).forEach(e => this.addEventListener(e, listener, false));
};
EventTarget.prototype.removeEventListenerEx = function(events, listener) {
    (events.split(" ")).forEach(e => this.removeEventListener(e, listener));
};

// *reference eventdispatcher (https://github.com/mrdoob/eventdispatcher.js)
function EventDispatcher() { 
};
(function () {
    'use strict';

    EventDispatcher.prototype = {
        constructor: EventDispatcher,
        apply: function (object) {
            object._listeners = {};
            object.addEventListener    = EventDispatcher.prototype.addEventListener;
            object.hasEventListener    = EventDispatcher.prototype.hasEventListener;
            object.removeEventListener = EventDispatcher.prototype.removeEventListener;
            object.dispatchEvent       = EventDispatcher.prototype.dispatchEvent;
        },
        addEventListener: function (type, listener) {
            if (this._listeners === undefined) this._listeners = {};

            if (this._listeners[type] === undefined) {
                this._listeners[type] = [];
            }
            if (this.hasEventListener(type, listener) === false) {
                this._listeners[type].push(listener);
            }
        },
        hasEventListener: function (type, listener) {
            if (this._listeners === undefined) return false;
            return this._listeners[type] !== undefined && this._listeners[type].indexOf(listener) !== - 1;
        },
        removeEventListener: function (type, listener) {
            if (this.hasEventListener(type, listener) === true) {
                this._listeners[type].splice(index, 1);
            }
        },
        dispatchEvent: function (event) {
            if (this._listeners[event.type] !== undefined) {
                event.target = this;
                for (let i = 0; i < this._listeners[event.type].length; i++) {
                    const listener = this._listeners[event.type][i];
                    listener.call(this, event);
                }
            }
        },
    };
})();

_POSITION_START = 'pointerdown MSPointerDown touchstart mousedown';
_POSITION_MOVE  = 'pointermove MSPointerMove touchmove  mousemove';
_POSITION_END   = 'pointerup   MSPointerUp   touchend   mouseup';
_POSITION_WHEEL = 'wheel DOMMouseScroll mousewheel';

function EventControler(query) { 
    'use strict';

    const _getPositionEvent = function (event) {
        return (event.pointerId !== undefined) ? event : (event.changedTouches && event.changedTouches.length > 0) ? event.changedTouches[0] : null;
    };

    const controler = this;

    const dispather = new EventDispatcher();
    dispather.apply(controler);

    controler.stat = null;
    controler.move = null;
    controler.keys = {};

    let gesture = false;
    
    // getsture event
    {
        const on_gesturestart = function(event){
            gesture = true;

            event.preventDefault();
            event.stopPropagation();
            window.addEventListenerEx('gesturechange', on_gesturechange);
            window.addEventListenerEx('gestureend', on_gestureend);
            controler.dispatchEvent({ type: 'gesture', });
        };
        const on_gesturechange = function(event){
            event.preventDefault();
            event.stopPropagation();

            if (event.scale) {
                controler.dispatchEvent({ type: 'scale', scale: event.scale });
            }
        };
        const on_gestureend = function(event){
            gesture = false;

            event.stopPropagation();
            window.removeEventListenerEx('gesturechange', on_gesturechange);
            window.removeEventListenerEx('gestureend', on_gestureend);
        }
        query.addEventListenerEx('gesturestart', on_gesturestart);
        query.addEventListenerEx('gesturechange', on_gesturechange);
        query.addEventListenerEx('gestureend', on_gestureend);
    }

    // mouse event
    {
        const on_buttondown = function (event) {
            if (gesture === true) return;

            event.preventDefault();
            event.stopPropagation();

            const _event = _getPositionEvent(event);
            if (!_event) return;
            const b = _event.button ? _event.button : 0;

            controler.stat = { x: _event.clientX, y: _event.clientY, b: b };
            controler.move = null;

            controler.dispatchEvent({ type: 'active' });
            controler.dispatchEvent({ type: 'move' });

            window.addEventListenerEx(_POSITION_MOVE, on_buttonmove);
            window.addEventListenerEx(_POSITION_END, on_buttonup);
        };
        const on_buttonmove = function (event) {
            if (gesture === true) return;

            event.preventDefault();
            event.stopPropagation();

            const _event = _getPositionEvent(event);
            if (!_event) return;

            controler.move = { x: controler.stat.x - _event.clientX, y: controler.stat.y - _event.clientY };
            controler.stat = { x: _event.clientX, y: _event.clientY, b: controler.stat.b };

            controler.dispatchEvent({ type: 'move' });
        };
        const on_buttonup = function (event) {
            event.stopPropagation();

            controler.move = null;
            controler.stat = null;

            controler.dispatchEvent({ type: 'disactive' });
            window.removeEventListenerEx(_POSITION_MOVE, on_buttonmove);
            window.removeEventListenerEx(_POSITION_END, on_buttonup);
        };
        const on_wheel = function (event) {
            event.preventDefault();
            event.stopPropagation();

            let _event = event;
            if (!_event) return;

            controler.dispatchEvent({ type: 'wheel', wheel: (_event.deltaY > 0) ? +1 : -1 });
        };

        const on_contextmenu = function (event) {
            event.preventDefault();
            return false;
        };
        query.addEventListenerEx(_POSITION_START, on_buttondown);
        query.addEventListenerEx(_POSITION_WHEEL, on_wheel);
        query.addEventListenerEx('contextmenu', on_contextmenu);
    }

    // key event
    {
        document.addEventListener('keydown', function (event) {
            controler.keys[event.key] = 1;
        }, false);
        document.addEventListener('keyup', function (event) {
            controler.keys[event.key] = 0;
        }, false);
        document.addEventListener('focusout', function (event) {
            Object.keys(controler.keys).forEach(function (k) {
                controler.keys[k] = 0;
            });
        }, false);
    }
};

// *reference virtualInput (https://github.com/yomotsu/virtualInput/virtualInput.js)
function VirtualInput(query, params) {
    const _getPositionEvent = function (event) {
        return (event.pointerId !== undefined) ? event : (event.changedTouches && event.changedTouches.length > 0) ? event.changedTouches[0] : null;
    };

    const controler = this;
    controler.js = {};
    controler.bp = {};
    controler.bm = {};

    const dispather = new EventDispatcher();
    dispather.apply(controler.js);
    dispather.apply(controler.bp);
    dispather.apply(controler.bm);

    const td1 = document.createElement('td');
    const td2 = document.createElement('td');
    {
        const table = document.createElement('table');
        table.style.width = "100%";
        table.style.height = "100%";
        query.appendChild(table);

        const tr = document.createElement('tr');
        tr.style.width = "100%";
        tr.style.height = "100%";
        table.appendChild(tr);

        td1.style.width = "25%";
        td1.style.height = "100%";
        td2.style.width = "75%";
        td2.style.height = "100%";
        tr.appendChild(td1);
        tr.appendChild(td2);
    }

    {
        const joystick = document.createElement('div');
        joystick.className = 'vi_joystick';
        joystick.innerHTML = [
            '<svg class="vi_joystick_frame absolute_fit" viewbox="0 0 64 64">',
            '<polygon class="vi_joystick_arrow" points="32 11 36 16 28 16"></polygon>',
            '<polygon class="vi_joystick_arrow" points="32 53 36 48 28 48"></polygon>',
            '<polygon class="vi_joystick_arrow" points="11 32 16 36 16 28"></polygon>',
            '<polygon class="vi_joystick_arrow" points="53 32 48 36 48 28"></polygon>',
            '<circle  class="vi_joystick_circle" cx="32" cy="32" r="24" stroke-width="3"></circle>',
            '</svg>',
            '<div class="vi_joystick_button">',
            '<div class="vi_joystick_button_inner">',
            '</div>',
            '</div>',
        ].join('');
        td2.appendChild(joystick);

        const button = joystick.querySelector('.vi_joystick_button');

        controler.js.stat = null;

        const update = function (x, y) {
            const fsize = joystick.clientWidth;
            const bsize = button.clientWidth;

            const s = 1.3;
            const v = Math.sqrt(x * x + y * y) / s;
            const a = (y != 0 || x != 0) ? Math.atan2(y, x) : 0;
            controler.js.stat = { x: x, y: y, v: v, a: a };

            const p = (v <= 1) ? [x, y] : [Math.cos(a) * s, Math.sin(a) * s];
            button.style.top  = ((fsize - bsize) / 2 + p[1] * bsize / 2) + 'px';
            button.style.left = ((fsize - bsize) / 2 + p[0] * bsize / 2) + 'px';
        };

        update(0, 0);
        window.addEventListener('resize', function(){
            update(0, 0);
        });

        function getCoordinate(event) {
            const fsize = joystick.clientWidth;
            const bsize = button.clientWidth;

            const _event = _getPositionEvent(event);
            if (!_event) return false;

            const rect = joystick.getBoundingClientRect();
            var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const x = ((_event.pageX - rect.left) - fsize / 2) / (bsize / 2);
            const y = ((_event.pageY - rect.top - scrollTop) - fsize / 2) / (bsize / 2);
            return { x: x, y: y };
        };

        const on_buttondown = function (event) {
            event.preventDefault();
            event.stopPropagation();

            const coord = getCoordinate(event);
            if (!coord) return;
            update(coord.x, coord.y);

            controler.js.dispatchEvent({ type: 'active' });

            window.addEventListenerEx(_POSITION_MOVE, on_buttonmove);
            window.addEventListenerEx(_POSITION_END, on_buttonup);
        };

        const on_buttonmove = function (event) {
            event.preventDefault();
            event.stopPropagation();

            const coord = getCoordinate(event);
            if (!coord) return;
            update(coord.x, coord.y);
            controler.js.dispatchEvent({ type: 'move' });
        };

        const on_buttonup = function (event) {
            event.stopPropagation();

            let _event = _getPositionEvent(event, controler.pointerId);
            if (!_event) return;

            update(0, 0);
            controler.js.stat = null;

            controler.js.dispatchEvent({ type: 'disactive' });
            window.removeEventListenerEx(_POSITION_MOVE, on_buttonmove);
            window.removeEventListenerEx(_POSITION_END, on_buttonup);
        };

        joystick.addEventListenerEx(_POSITION_START, on_buttondown);
    }

    {
        const pmbutton = document.createElement('div');;
        pmbutton.className = 'vi_pmbutton';
        pmbutton.innerHTML = [
            '<div style="position: relative; width: 100%; height: 100%; user-select: none;">',
            '<div class="vi_pmbutton_x vi_pmbutton_p"><div class="vi_character" style="top: 50%; left: 50%;">+</div></div>',
            '<div class="vi_pmbutton_x vi_pmbutton_m"><div class="vi_character" style="top: 50%; left: 50%;">-</div></div>',
            '</div>'
        ].join('');
        td1.appendChild(pmbutton);

        function setEvent(b, button) {
            b.pressed = false;
            const on_buttondown = function (event) {
                event.preventDefault();
                event.stopPropagation();

                b.pressed = true;
                b.dispatchEvent({ type: 'active' });
                window.addEventListenerEx(_POSITION_END, on_buttonup);
            };

            const on_buttonup = function (event) {
                event.stopPropagation();

                b.pressed = false;
                b.dispatchEvent({ type: 'disactive' });
                window.removeEventListenerEx(_POSITION_END, on_buttonup);
            };
            button.addEventListenerEx(_POSITION_START, on_buttondown);
        };
        setEvent(controler.bp, pmbutton.querySelector('.vi_pmbutton_p'));
        setEvent(controler.bm, pmbutton.querySelector('.vi_pmbutton_m'));

    }
};

function _setecon(viewer){
    const econ = new EventControler(viewer.canvas);
    econ.addEventListener('move', function (event) {
        if (!this.move || !this.stat) return;
        if (this.stat.b === 0) {
            viewer.roll = false;
            viewer.gl.scene.rotation.x -= this.move.y * 0.01;
            viewer.gl.scene.rotation.y -= this.move.x * 0.01;
        }
        if (this.stat.b === 1) {
            viewer.roll = false;
            const rate = viewer.gl.camera.position.z * 0.002;
            viewer.gl.camera.position.x = Math.max(-viewer.union.msize * 2, Math.min(+viewer.union.msize * 2, viewer.gl.camera.position.x + this.move.x * rate));
            viewer.gl.camera.position.y = Math.max(-viewer.union.msize * 2, Math.min(+viewer.union.msize * 2, viewer.gl.camera.position.y - this.move.y * rate));
        }
    });
    econ.addEventListener('wheel', function (event) {
        viewer.roll = false;
        viewer.gl.camera.position.z += viewer.gl.camera.position.z * event.wheel * 0.1;
    });
    econ.addEventListener('gesture', function (event) {
        econ.basez = viewer.gl.camera.position.z;
    });
    econ.addEventListener('scale', function (event) {
        viewer.gl.camera.position.z = econ.basez / event.scale;
    });
}

function _getpng(canvas, union, param) {
    const gl = new mog.gl(canvas, {preserveDrawingBuffer: true, fov: param.fov, move: false });

    function reset(){
        gl.scene.rotation.x = +25 / 180 * Math.PI;
        gl.scene.rotation.y = -40 / 180 * Math.PI;
        gl.scene.rotation.z = 0;
        gl.camera.position.set(0.0, 0.0, 1.1 * union.msize);
        
        if (param.gl) {
            gl.camera.position.x = param.gl.camera.position.x;
            gl.camera.position.y = param.gl.camera.position.y;
            gl.camera.position.z = param.gl.camera.position.z;
            gl.scene.rotation.x = param.gl.scene.rotation.x;
            gl.scene.rotation.y = param.gl.scene.rotation.y;
            gl.scene.rotation.z = param.gl.scene.rotation.z;
        }
    }
    {
        const dome = gl.mkDome(union.msize * 5.0, { map: mog.tex.stddome, });
        const ground = gl.mkGround(union.msize * 10.0, { color: 0xEEEEF2, transparent: true, });

        gl.layers[0].position.y -= (union.bbox.pos[1].y + 4.0) / 2.0;

        gl.layers[0].add(dome.object);
        gl.layers[0].add(ground.object);
        gl.layers[0].add(union.object.clone());
    }
    reset();

    gl.render();
    return gl.capture('image/jpeg'); 
}
