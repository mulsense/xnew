import { Unit } from './core/unit';
interface xnew extends Function {
    [key: string]: any;
}
export declare namespace xnew {
    type Unit = InstanceType<typeof Unit>;
}
declare const xnew: xnew;
export default xnew;
