import { CG } from 'src/codegen/CG';
import { NodeDefPlugin } from 'src/utils/layout/plugins/NodeDefPlugin';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';
import type { IDataModelBindingsLikert } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type {
  DefPluginChildClaimerProps,
  DefPluginExtraInItem,
  DefPluginState,
  DefPluginStateFactoryProps,
  NodeDefChildrenPlugin,
} from 'src/utils/layout/plugins/NodeDefPlugin';
import type { BaseRow } from 'src/utils/layout/types';
import type { TraversalRestriction } from 'src/utils/layout/useNodeTraversal';

interface LikertRow extends BaseRow {
  itemNode: LayoutNode<'LikertItem'>;
}

interface Config {
  componentType: 'Likert';
  expectedFromExternal: {
    dataModelBindings: IDataModelBindingsLikert;
  };
  extraInItem: {
    rows: LikertRow[];
  };
}

export class LikertRowsPlugin extends NodeDefPlugin<Config> implements NodeDefChildrenPlugin<Config> {
  makeImport() {
    return new CG.import({
      import: 'LikertRowsPlugin',
      from: 'src/layout/Likert/Generator/LikertRowsPlugin',
    });
  }

  addToComponent(_component: ComponentConfig): void {}

  extraNodeGeneratorChildren(): string {
    const LikertGeneratorChildren = new CG.import({
      import: 'LikertGeneratorChildren',
      from: 'src/layout/Likert/Generator/LikertGeneratorChildren',
    });
    return `<${LikertGeneratorChildren} />`;
  }

  itemFactory(_props: DefPluginStateFactoryProps<Config>) {
    // Likert will have exactly _zero_ rows to begin with. We can't rely on addChild() being called when there are
    // no children, so to start off we'll have to initialize it all with no rows to avoid later code crashing
    // when there's no array of rows yet.
    return {
      rows: [],
    } as DefPluginExtraInItem<Config>;
  }

  claimChildren(_props: DefPluginChildClaimerProps<Config>) {}

  pickDirectChildren(state: DefPluginState<Config>, _restriction?: TraversalRestriction | undefined): LayoutNode[] {
    return state.item?.rows.map((row) => row.itemNode) || [];
  }

  addChild(state: DefPluginState<Config>, childNode: LayoutNode): Partial<DefPluginState<Config>> {
    if (!childNode.isType('LikertItem')) {
      throw new Error(`Child node of Likert component must be of type 'LikertItem'`);
    }

    const row = childNode.row;
    if (!row) {
      throw new Error(`Child node of Likert component missing 'row' property`);
    }
    const i = state.item as any;
    const rows = (i && 'rows' in i ? [...i.rows] : []) as LikertRow[];
    const existingRowIndex = rows.findIndex((r) => r.uuid === row.uuid);

    if (existingRowIndex === -1) {
      rows.push({ ...(rows[existingRowIndex] || {}), ...row, itemNode: childNode });
    } else {
      rows[existingRowIndex] = { ...(rows[existingRowIndex] || {}), ...row, itemNode: childNode };
    }

    return {
      item: {
        ...state.item,
        rows,
      },
    } as Partial<DefPluginState<Config>>;
  }
}
