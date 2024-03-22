import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import type { NodeRef, PropsFromGenericComponent } from '..';

import { ButtonGroupComponent } from 'src/layout/ButtonGroup/ButtonGroupComponent';
import { ButtonGroupDef } from 'src/layout/ButtonGroup/config.def.generated';
import { DefaultNodeGenerator } from 'src/utils/layout/DefaultNodeGenerator';
import type { DisplayData } from 'src/features/displayData';
import type {
  ChildClaimerProps,
  ExprResolver,
  NodeGeneratorProps,
  StoreFactoryProps,
} from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class ButtonGroup extends ButtonGroupDef implements DisplayData<'ButtonGroup'> {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'ButtonGroup'>>(
    function LayoutComponentButtonGroupRender(props, _): JSX.Element | null {
      return <ButtonGroupComponent {...props} />;
    },
  );

  claimChildren({ claimChild, getProto, item }: ChildClaimerProps<'ButtonGroup'>): void {
    for (const childId of item.children) {
      if (!childId) {
        continue;
      }
      const proto = getProto(childId);
      if (!proto) {
        continue;
      }
      if (!proto.def.canRenderInButtonGroup()) {
        window.logWarn(
          `ButtonGroup component included a component '${childId}', which ` +
            `is a '${proto.type}' and cannot be rendered in a ButtonGroup.`,
        );
        continue;
      }
      claimChild(childId);
    }
  }

  renderNodeGenerator(props: NodeGeneratorProps<'ButtonGroup'>): JSX.Element | null {
    // TODO: Implement custom node generator
    return <DefaultNodeGenerator {...props} />;
  }

  storeFactory(props: StoreFactoryProps<'ButtonGroup'>) {
    return this.defaultStoreFactory(props);
  }

  evalExpressions({ item, evalTrb, evalCommon }: ExprResolver<'ButtonGroup'>) {
    return {
      ...item,
      ...evalCommon(),
      ...evalTrb(),

      // TODO: Implement
      childComponents: [] as NodeRef[],
    };
  }

  shouldRenderInAutomaticPDF() {
    return false;
  }

  getDisplayData(_node: LayoutNode<'ButtonGroup'>): string {
    return '';
  }

  renderSummary(): JSX.Element | null {
    return null;
  }

  validateDataModelBindings(): string[] {
    return [];
  }
}
