// import { xnew } from '../core/xnew';

// export function Accordion(self, { status = 'open', duration = 200, easing = 'ease-in-out' } = {}) {
//     const outer = xnew.nest({ style: { display: status === 'open' ? 'block' : 'none', overflow: 'hidden', }});
//     const inner = xnew.nest({ style: { padding: 0, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' } });
     
//     let transition = false;
//     return {
//         get status() {
//             return status;
//         },
//         open() {
//             if (transition === false) {
//                 transition = true;
//                 status = 'open';
//                 outer.style.display = 'block';
//                 xnew.transition((progress) => {
//                     outer.style.height = inner.offsetHeight * process(progress) + 'px';
//                     outer.style.opacity = process(progress);
//                     if (progress === 1) {
//                         outer.style.height = 'auto';
//                         transition = false;
//                     }
//                 }, duration);
//             }
//         },
//         close() {
//             if (transition === false) {
//                 transition = true;
//                 xnew.transition((progress) => {
//                     outer.style.height = inner.offsetHeight * (1 - process(progress)) + 'px';
//                     outer.style.opacity = 1 - process(progress);
//                     if (progress === 1) {
//                         status = 'closed';
//                         outer.style.display = 'none';
//                         outer.style.height = '0px';
//                         transition = false;
//                     }
//                 }, duration);
//             }
//         },
//         toggle() {
//             status === 'open' ? self.close() : self.open();
//         },
//     };
//     function process(progress) {
//         if (easing === 'ease-out') {
//             return Math.pow((1.0 - Math.pow((1.0 - progress), 2.0)), 0.5);
//         } else if (easing === 'ease-in') {
//             return Math.pow((1.0 - Math.pow((1.0 - progress), 0.5)), 2.0);
//         } else if (easing === 'ease-in-out') {
//             return - (Math.cos(progress * Math.PI) - 1.0) / 2.0;
//         } else {
//             return progress;
//         }
//     }
// }

