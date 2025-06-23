interface xnewtype$1 extends Function {
    [key: string]: any;
}

interface xnewtype extends xnewtype$1 {
    Screen: Function;
    UserEvent: Function;
    ResizeEvent: Function;
    Modal: Function;
}
declare namespace xnew {
    type Unit = InstanceType<typeof Unit>;
}
declare const xnew: xnewtype;

export { xnew as default };
