import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { Summary2Def } from 'src/layout/Summary2/config.def.generated';
import { SummaryHierarchyGenerator } from 'src/layout/Summary2/hierarchy';
import { SummaryComponent2 } from 'src/layout/Summary2/SummaryComponent2';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';

export class Summary2 extends Summary2Def {
  private _hierarchyGenerator = new SummaryHierarchyGenerator();

  hierarchyGenerator(): ComponentHierarchyGenerator<'Summary2'> {
    return this._hierarchyGenerator;
  }

  directRender(): boolean {
    return true;
  }

  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Summary2'>>(
    function LayoutComponentSummaryRender(props, _): JSX.Element | null {
      return (
        <SummaryComponent2
          summaryNode={props.node}
          overrides={props.overrideItemProps}
          ref={props.containerDivRef}
        />
      );
    },
  );

  renderSummary(): JSX.Element | null {
    // If the code ever ends up with a Summary component referencing another Summary component, we should not end up
    // in an infinite loop by rendering them all. This is usually stopped early in <SummaryComponent />.
    return null;
  }

  shouldRenderInAutomaticPDF() {
    return false;
  }

  getDisplayData(): string {
    return '';
  }

  validateDataModelBindings(): string[] {
    return [];
  }
}