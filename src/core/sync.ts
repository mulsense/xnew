//----------------------------------------------------------------------------------------------------
// sync — server→client 状態同期エンジン
//
// authoritative ツリーの同期対象状態を SyncNode 列(state tree)として捕捉し、replica ツリーへ
// 差分適用(create/update/remove)する。実ネットワークは扱わず、捕捉物の生成と再構成のみを担う。
//
// - registerComponent / getRegisteredName / getRegisteredComponent / resetRegistry : 同期エンティティ型のレジストリ
// - getSyncName        : unit が同期対象なら登録名(最初の一致)を返す
// - captureStateTree   : authoritative サブツリー → SyncNode[](全量)
// - applyStateTree     : SyncNode[] → replica サブツリーへ差分適用       ※Task 5 で追加
//----------------------------------------------------------------------------------------------------

import { Unit } from './unit';

export interface SyncNode { id: number; name: string; parentId: number | null; state: Record<string, any>; }
export type StateTree = SyncNode[];

const nameToComponent: Map<string, Function> = new Map();
const componentToName: Map<Function, string> = new Map();

export function registerComponent(name: string, Component: Function): void {
    nameToComponent.set(name, Component);
    componentToName.set(Component, name);
}

export function getRegisteredName(Component: Function): string | undefined {
    return componentToName.get(Component);
}

export function getRegisteredComponent(name: string): Function | undefined {
    return nameToComponent.get(name);
}

export function resetRegistry(): void {
    nameToComponent.clear();
    componentToName.clear();
}

export function getSyncName(unit: Unit): string | undefined {
    for (const Component of unit._.Components) {
        const name = getRegisteredName(Component);
        if (name !== undefined) {
            return name;
        }
    }
    return undefined;
}

export function captureStateTree(root: Unit): StateTree {
    const nodes: StateTree = [];

    const walk = (unit: Unit, nearestSyncedId: number | null): void => {
        let parentForChildren = nearestSyncedId;
        const name = getSyncName(unit);
        if (name !== undefined) {
            if (unit._.syncId === null) {
                unit._.syncId = Unit.syncIdCounter++;
            }
            nodes.push({
                id: unit._.syncId,
                name,
                parentId: nearestSyncedId,
                state: { ...(unit._.syncState ?? {}) },
            });
            parentForChildren = unit._.syncId;
        }
        unit._.children.forEach((child) => walk(child, parentForChildren));
    };

    walk(root, null);
    return nodes;
}
