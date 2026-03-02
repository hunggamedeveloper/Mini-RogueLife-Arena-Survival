// ============================================================
// ObjectPool.ts — Generic typed object pool wrapping NodePool.
// Nodes are parented to a dedicated container (off render tree)
// while idle to reduce rendering overhead.
// ============================================================

import { Node, NodePool, Prefab, instantiate, Component } from 'cc';
import { IPoolable } from '../../../shared/scripts/types/GameTypes';

export class ObjectPool<T extends Component & IPoolable> {
    private _pool: NodePool;
    private _prefab: Prefab;
    private _container: Node;
    private _activeSet: Set<Node> = new Set();
    private _growSize: number;
    private _componentName: string;

    constructor(prefab: Prefab, container: Node, preWarmSize: number, growSize: number = 10, componentName?: string) {
        this._prefab = prefab;
        this._container = container;
        this._growSize = growSize;
        this._componentName = componentName ?? prefab.name;
        this._pool = new NodePool();

        for (let i = 0; i < preWarmSize; i++) {
            this._pool.put(this._createNode());
        }
    }

    get(parent: Node): T {
        let node = this._pool.get();
        if (!node) {
            // Pool exhausted — grow
            for (let i = 0; i < this._growSize - 1; i++) {
                this._pool.put(this._createNode());
            }
            node = this._createNode();
        }

        node.setParent(parent);
        node.active = true;

        this._activeSet.add(node);
        const comp = node.getComponent(this._componentName) as T;
        comp?.onGetFromPool();
        return comp;
    }

    put(comp: T): void {
        const node = comp.node;
        if (!this._activeSet.has(node)) return;

        comp.onReturnToPool();
        node.active = false;
        node.setParent(this._container);
        this._activeSet.delete(node);
        this._pool.put(node);
    }

    get activeCount(): number { return this._activeSet.size; }
    get freeCount(): number { return this._pool.size(); }
    get activeNodes(): ReadonlySet<Node> { return this._activeSet; }

    clear(): void {
        this._pool.clear();
        this._activeSet.clear();
    }

    private _createNode(): Node {
        const node = instantiate(this._prefab);
        node.active = false;
        node.setParent(this._container);
        return node;
    }
}

