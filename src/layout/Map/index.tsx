import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { MapDef } from 'src/layout/Map/config.def.generated';
import { MapComponent } from 'src/layout/Map/MapComponent';
import { MapComponentSummary } from 'src/layout/Map/MapComponentSummary';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { CompInternal } from 'src/layout/layout';
import type { ExprResolver, StoreFactoryProps, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Map extends MapDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Map'>>(
    function LayoutComponentMapRender(props, _): JSX.Element | null {
      return <MapComponent {...props} />;
    },
  );

  storeFactory(props: StoreFactoryProps<'Map'>) {
    return this.defaultStoreFactory(props);
  }

  evalExpressions({ item, evalTrb, evalCommon }: ExprResolver<'Map'>) {
    return {
      ...item,
      ...evalCommon(),
      ...evalTrb(),
    };
  }

  getDisplayData(node: LayoutNode<'Map'>, item: CompInternal<'Map'>, { formDataSelector }: DisplayDataProps): string {
    if (!item.dataModelBindings?.simpleBinding) {
      return '';
    }

    return node.getFormData(formDataSelector).simpleBinding ?? '';
  }

  renderSummary({ targetNode }: SummaryRendererProps<'Map'>): JSX.Element | null {
    return <MapComponentSummary targetNode={targetNode} />;
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'Map'>): string[] {
    return this.validateDataModelBindingsSimple(ctx);
  }
}
