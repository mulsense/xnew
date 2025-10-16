import { xnew } from '../core/xnew';

export function ControlPanel(self: xnew.Unit, {} = {}) {
    return {
        group(name: string) {
        },
        button(name: string, component: Function, props?: any) {
        },
        range(name: string, component: Function, props?: any) {
        },
        select(name: string) {
           
        }
    }
}
