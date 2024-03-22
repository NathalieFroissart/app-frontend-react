import React, { forwardRef } from 'react';

import { InstantiationButtonDef } from 'src/layout/InstantiationButton/config.def.generated';
import { InstantiationButtonComponent } from 'src/layout/InstantiationButton/InstantiationButtonComponent';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ExprResolver, StoreFactoryProps } from 'src/layout/LayoutComponent';

export class InstantiationButton extends InstantiationButtonDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'InstantiationButton'>>(
    function LayoutComponentInstantiationButtonRender(props, _): JSX.Element | null {
      return <InstantiationButtonComponent {...props} />;
    },
  );

  storeFactory(props: StoreFactoryProps<'InstantiationButton'>) {
    return this.defaultStoreFactory(props);
  }

  evalExpressions({ item, evalTrb, evalCommon }: ExprResolver<'InstantiationButton'>) {
    return {
      ...item,
      ...evalCommon(),
      ...evalTrb(),
    };
  }
}
