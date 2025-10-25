import { xnew } from '../core/xnew';

// export function NavigationMenuButton(self: xnew.Unit) {
//     let isActive = false;

//     // Apply styles helper
//     function applyStyles(element, styles) {
//         Object.assign(element.style, styles);
//     }

//     // Create hamburger button
//     const hamburger = xnew('<div>');
//     const hamburgerStyles = {
//         position: 'fixed',
//         top: '20px',
//         right: '20px',
//         width: '50px',
//         height: '50px',
//         background: '#333',
//         borderRadius: '8px',
//         cursor: 'pointer',
//         zIndex: '1001',
//         display: 'flex',
//         flexDirection: 'column',
//         justifyContent: 'center',
//         alignItems: 'center',
//         gap: '6px',
//         transition: 'background 0.3s ease'
//     };
//     applyStyles(hamburger.element, hamburgerStyles);

//     // Create 3 hamburger lines
//     const lines = [];
//     for (let i = 0; i < 3; i++) {
//         const line = xnew(hamburger, '<div>');
//         const lineStyles = {
//             width: '30px',
//             height: '3px',
//             background: 'white',
//             borderRadius: '2px',
//             transition: 'all 0.3s ease'
//         };
//         applyStyles(line.element, lineStyles);
//         lines.push(line);
//     }

//     // Toggle function
//     function toggle() {
//         isActive = !isActive;

//         if (isActive) {
//             // Transform to X
//             lines[0].element.style.transform = 'translateY(9px) rotate(45deg)';
//             lines[1].element.style.opacity = '0';
//             lines[1].element.style.transform = 'translateX(-20px)';
//             lines[2].element.style.transform = 'translateY(-9px) rotate(-45deg)';
//             hamburger.element.style.background = '#667eea';
//             console.log('Hamburger menu opened');
//         } else {
//             // Transform back to hamburger
//             lines[0].element.style.transform = '';
//             lines[1].element.style.opacity = '1';
//             lines[1].element.style.transform = '';
//             lines[2].element.style.transform = '';
//             hamburger.element.style.background = '#333';
//             console.log('Hamburger menu closed');
//         }
//     }

//     // Hover effect
//     hamburger.on('mouseenter', () => {
//         if (!isActive) {
//             hamburger.element.style.background = '#555';
//         }
//     });

//     hamburger.on('mouseleave', () => {
//         if (!isActive) {
//             hamburger.element.style.background = '#333';
//         }
//     });

//     // Click event
//     hamburger.on('click', toggle);
// }