import { MapSet, MapMapMap } from './map';
type Unit = any;
interface Snapshot {
    unit: Unit | null;
    context: ContextData | null;
}
interface ContextData {
    previous: ContextData | null;
    key: string;
    value: any;
}
export declare class UnitScope {
    static current: Unit | null;
    static unitToContext: Map<Unit | null, ContextData>;
    static execute(snapshot: Snapshot, func: Function, ...args: any[]): any;
    static set(unit: Unit | null, context: ContextData): void;
    static get(unit: Unit | null): ContextData | undefined;
    static snapshot(unit?: Unit | null): Snapshot;
    static clear(unit: Unit): void;
    static push(key: string, value: any): void;
    static trace(key: string): any;
}
export declare class UnitComponent {
    static unitToComponents: MapSet<Unit | null, any>;
    static componentToUnits: MapSet<any, Unit | null>;
    static add(unit: Unit, component: any): void;
    static clear(unit: Unit): void;
    static find(component: any): any[];
}
export declare class UnitElement {
    static unitToElements: Map<Unit, Element[]>;
    static initialize(unit: Unit, baseElement: Element): void;
    static nest(unit: Unit, attributes: Record<string, any>): Element;
    static get(unit: Unit): Element;
    static clear(unit: Unit): void;
    static create(attributes: Record<string, any>, parentElement?: Element | null): Element;
}
export declare class UnitEvent {
    static event: {
        type: string | null;
    } | null;
    static typeToUnits: MapSet<string, Unit>;
    static unitToListeners: MapMapMap<Unit, string, Function, any>;
    static on(unit: Unit, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void;
    static off(unit: Unit, type?: string, listener?: Function): void;
    static emit(unit: Unit, type: string, ...args: any[]): void;
}
export declare class UnitPromise {
    private promise;
    constructor(executor: (resolve: (value: any) => void, reject: (reason?: any) => void) => void);
    then(callback: Function): UnitPromise;
    catch(callback: Function): UnitPromise;
    finally(callback: Function): UnitPromise;
    static unitToPromises: MapSet<Unit, Promise<any>>;
    static execute(promise: Promise<any>): UnitPromise;
}
export {};
