import { useEffect, useRef } from 'react';
import { xnew } from '@mulsense/xnew';

//----------------------------------------------------------------------------------------------------
// XReact — 任意の xnew コンポーネントを React の中へ埋め込む汎用ラッパ。
//
//   使い方:
//     <XReact Component={Main} props={{ ... }} />
//   （Main は xnew のコンポーネント関数 (unit, props) => defines）
//
//   役割（統合の境界はこの 1 つの div）:
//     - マウント : React が持つ空 div へ xnew(element, Component, props) を生成する。
//                  その div の中身は xnew が支配し、React は触らない（再描画と衝突しない）。
//     - 後始末   : unmount で unit.finalize()（owned な nest 要素のみ除去。host の div は React が管理）。
//     - 更新     : 再レンダーごとに最新 props を unit.setProps?.(props) へ流す（公開していれば）。
//                  これにより React → xnew のライブ更新（色や callback の差し替え）が効く。
//----------------------------------------------------------------------------------------------------

export interface XReactProps<P> {
    /** xnew のコンポーネント関数 (unit, props) => defines */
    Component: (unit: any, props: P) => any;
    /** Component へ渡す props（再レンダーで変われば setProps 経由で反映される） */
    props?: P;
    /** host となる div の className（任意） */
    className?: string;
}

export function XReact<P>({ Component, props, className }: XReactProps<P>) {
    const hostRef = useRef<HTMLDivElement>(null);
    const unitRef = useRef<any>(null);
    const propsRef = useRef(props);
    propsRef.current = props;   // マウント時に最新 props を読むための保持

    // マウント / finalize（Component が変わったら作り直す）
    useEffect(() => {
        const unit = xnew(hostRef.current!, Component as any, propsRef.current as any);
        unitRef.current = unit;
        return () => {
            unit.finalize();
            unitRef.current = null;
        };
    }, [Component]);

    // React → xnew: 再レンダーごとに最新 props を流す（setProps を公開していれば）
    useEffect(() => {
        unitRef.current?.setProps?.(props);
    });

    return <div ref={hostRef} className={className} style={{ width: '100%', height: '100%' }} />;
}
