//----------------------------------------------------------------------------------------------------
// sync — server→client 状態同期エンジン（スコープ付きレジストリ）
//
// server ツリーの同期対象状態を SyncNode 列(state tree)として捕捉し、client ツリーへ
// 差分適用(create/update/remove)する。実ネットワークは扱わず、捕捉物の生成と再構成のみを担う。
//
// 同期対象の型は「各コンポーネントが自分の直接の子として登録した型」だけ。登録は Unit 単位で
// 保持し（_.syncRegistry）、ある unit の同期可否・登録名は「直接の親ユニットのレジストリ」で解決する。
//
// - SyncRegistry / registerOnUnit : ユニット単位の {name ⇄ Component} レジストリと追記
// - getSyncName        : unit が同期対象なら、直接の親のレジストリ上の登録名(最派生一致)を返す
// - captureStateTree   : server サブツリー → SyncNode[](全量)
// - applyStateTree     : SyncNode[] → client サブツリーへ差分適用。node.name は親ユニットの
//                        レジストリで解決し、create 前に Unit.injectedSlot へサーバー状態を注入
//----------------------------------------------------------------------------------------------------

import { Unit } from './unit';

export interface SyncNode { id: number; name: string; parentId: number | null; state: Record<string, any>; }
export type StateTree = SyncNode[];

export interface SyncRegistry {
    byName: Map<string, Function>;
    byComponent: Map<Function, string>;
}

/** 呼び出しユニットのレジストリへ {name: Component} を追記する（無ければ生成）。 */
export function registerOnUnit(unit: Unit, components: Record<string, Function>): void {
    if (unit._.syncRegistry === null) {
        unit._.syncRegistry = { byName: new Map(), byComponent: new Map() };
    }
    for (const [name, Component] of Object.entries(components)) {
        unit._.syncRegistry.byName.set(name, Component);
        unit._.syncRegistry.byComponent.set(Component, name);
    }
}

export function getSyncName(unit: Unit): string | undefined {
    // 同期可否・登録名は「直接の親ユニットのレジストリ」で決まる。
    // _.Components は [基底..., 実際にインスタンス化した Component] の順なので、最も派生した
    // （= 末尾側の）一致を採る（基底に化けない / extend は最派生名で 1 SyncNode）。
    const registry = unit._.parent?._.syncRegistry;
    if (registry === undefined || registry === null) {
        return undefined;
    }
    for (let i = unit._.Components.length - 1; i >= 0; i--) {
        const name = registry.byComponent.get(unit._.Components[i]);
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
            const parent = node.parentId === null ? root : map.get(node.parentId);
            if (parent === undefined) { continue; }
            const Component = parent._.syncRegistry?.byName.get(node.name);
            if (Component === undefined) { continue; }   // 親が許可していない型は無視
            Unit.injectedSlot = node.state;      // 本体実行前に注入（Unit 構築開始時に _.injected へ退避）
            const unit = new Unit(parent, Component);   // mode は親(client)を継承する
            Unit.injectedSlot = null;            // 退避されなかった場合の漏れ防止（保険）
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
