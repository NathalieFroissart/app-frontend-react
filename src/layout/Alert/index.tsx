import React, { forwardRef } from 'react';

import { Alert as AlertComponent } from 'src/layout/Alert/Alert';
import { AlertDef } from 'src/layout/Alert/config.def.generated';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ExprResolver, StoreFactoryProps } from 'src/layout/LayoutComponent';

export class Alert extends AlertDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Alert'>>(
    function LayoutComponentAlertRender(props, _): JSX.Element | null {
      return <AlertComponent {...props} />;
    },
  );

  storeFactory(props: StoreFactoryProps<'Alert'>) {
    return this.defaultStoreFactory(props);
  }

  evalExpressions({ item, evalTrb, evalCommon }: ExprResolver<'Alert'>) {
    return {
      ...item,
      ...evalCommon(),
      ...evalTrb(),
    };
  }
}
