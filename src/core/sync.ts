//----------------------------------------------------------------------------------------------------
// sync — server→client 状態同期エンジン
//
// server ツリーの同期対象状態を SyncNode 列(state tree)として捕捉し、client ツリーへ
// 差分適用(create/update/remove)する。実ネットワークは扱わず、捕捉物の生成と再構成のみを担う。
//
// - registerComponent / getRegisteredName / getRegisteredComponent / resetRegistry : 同期エンティティ型のレジストリ
// - getSyncName        : unit が同期対象なら登録名(最初の一致)を返す
// - captureStateTree   : server サブツリー → SyncNode[](全量)
// - applyStateTree     : SyncNode[] → client サブツリーへ差分適用
// - takeInjectedState  : apply の create 中に注入されたサーバー状態を一度だけ取り出す（xnew.sync.state が消費）
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
                state: { ...(unit._.state ?? {}) },
            });
            parentForChildren = unit._.syncId;
        }
        unit._.children.forEach((child) => walk(child, parentForChildren));
    };

    walk(root, null);
    return nodes;
}

/**
 * apply の create 中だけ非 null になる、本体実行前に渡すサーバー状態の一時スロット。
 * xnew.sync.state が takeInjectedState で「一度だけ」消費し、クライアント側はこの注入値で
 * 初期化する（ローカルの初期値は使わない）。read-once なので親の注入値が子へ漏れない。
 */
let injectedState: Record<string, any> | null = null;

/** 注入されたサーバー状態を取り出して消費する（無ければ null）。xnew.sync.state から呼ばれる。 */
export function takeInjectedState(): Record<string, any> | null {
    const state = injectedState;
    injectedState = null;
    return state;
}

/** client ルートごとに id→Unit のマップを保持する。Unit を汚染しないよう WeakMap に格納する。 */
const reconcileMaps: WeakMap<Unit, Map<number, Unit>> = new WeakMap();

/**
 * Applies a state tree to a client subtree, reconciling create/update/remove.
 * @param root - root unit of the client subtree (owned by the caller)
 * @param tree - state tree captured from the server side (pre-order: parents before children)
 */
export function applyStateTree(root: Unit, tree: StateTree): void {
    let map = reconcileMaps.get(root);
    if (map === undefined) {
        map = new Map();
        reconcileMaps.set(root, map);
    }

    const incoming = new Set<number>(tree.map((node) => node.id));

    // create / update（tree は pre-order なので親が先に存在する）
    for (const node of tree) {
        const existing = map.get(node.id);
        if (existing === undefined) {
            // create
            const Component = getRegisteredComponent(node.name);
            if (Component === undefined) { continue; }
            const parent = node.parentId === null ? root : map.get(node.parentId);
            if (parent === undefined) { continue; }
            injectedState = node.state;          // 本体実行前に注入（xnew.sync.state が消費）
            const unit = new Unit(parent, Component);   // mode は親(client)を継承する
            injectedState = null;                // 本体が消費しなかった場合の漏れ防止
            unit._.syncId = node.id;
            if (unit._.state === null) { unit._.state = {}; }
            Object.assign(unit._.state, node.state);   // 状態を宣言しない型・欠落キーへの保険
            map.set(node.id, unit);
        } else {
            // update（変更フィールドのみ書き換え）
            // 不変条件: 一度入ったキーは削除されない。capture は全フィールドを毎回送るため、
            // サーバー側で state からキーを「消す」運用をすると client に残り続ける（v1 の割り切り）。
            if (existing._.state === null) { existing._.state = {}; }
            for (const key of Object.keys(node.state)) {
                if (existing._.state[key] !== node.state[key]) {
                    existing._.state[key] = node.state[key];
                }
            }
        }
    }

    // remove（incoming に存在しない id を finalize して map から除去）
    for (const [id, unit] of [...map.entries()]) {
        if (incoming.has(id) === false) {
            unit.finalize();
            map.delete(id);
        }
    }
}
