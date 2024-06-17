import type { NodesContext, NodesStoreFull } from 'src/utils/layout/NodesContext';

export interface NodeDataPluginConfig {
  extraFunctions?: Record<string, (...args: any[]) => any>;
  extraHooks?: Record<string, (...args: any[]) => any>;
}

export type NodeDataPluginSetState<T> = (fn: (state: T) => Partial<T>) => void;
export type ConfigFromNodeDataPlugin<C extends NodeDataPlugin<any>> =
  C extends NodeDataPlugin<infer Config> ? Config : never;

export abstract class NodeDataPlugin<Config extends NodeDataPluginConfig> {
  abstract extraFunctions(set: NodeDataPluginSetState<NodesContext>): Config['extraFunctions'];
  abstract extraHooks(store: NodesStoreFull): Config['extraHooks'];
}
