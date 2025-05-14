export interface UnitType {
    _: { [key: string]: any };

    readonly element: Element | null;
    
    start: () => void;
    stop: () => void;
    finalize: () => void;
    reboot: () => void;
    on: any;
    off: any;
}

export interface UnitContext {
    unit: UnitType | null;
    data: UnitData | null;
}

export interface UnitData {
    stack: UnitData | null;
    key: string;
    value: any;
}
