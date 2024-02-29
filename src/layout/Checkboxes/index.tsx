import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { useLanguage } from 'src/features/language/useLanguage';
import { getCommaSeparatedOptionsToText } from 'src/features/options/getCommaSeparatedOptionsToText';
import { useAllOptions } from 'src/features/options/useAllOptions';
import { CheckboxContainerComponent } from 'src/layout/Checkboxes/CheckboxesContainerComponent';
import { CheckboxesDef } from 'src/layout/Checkboxes/config.def.generated';
import { MultipleChoiceSummary } from 'src/layout/Checkboxes/MultipleChoiceSummary';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { AllOptionsMap } from 'src/features/options/useAllOptions';
import type { FormDataSelector, PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Checkboxes extends CheckboxesDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Checkboxes'>>(
    function LayoutComponentCheckboxesRender(props, _): JSX.Element | null {
      return <CheckboxContainerComponent {...props} />;
    },
  );

  private getSummaryData(
    node: LayoutNode<'Checkboxes'>,
    langTools: IUseLanguage,
    options: AllOptionsMap,
    formDataSelector: FormDataSelector,
  ): { [key: string]: string } {
    const value = node.getFormData(formDataSelector).simpleBinding ?? '';
    const optionList = options[node.item.id] || [];
    return getCommaSeparatedOptionsToText(value, optionList, langTools);
  }

  getDisplayData(node: LayoutNode<'Checkboxes'>, { langTools, options, formDataSelector }: DisplayDataProps): string {
    return Object.values(this.getSummaryData(node, langTools, options, formDataSelector)).join(', ');
  }

  renderSummary({ targetNode, formDataSelector }: SummaryRendererProps<'Checkboxes'>): JSX.Element | null {
    const langTools = useLanguage();
    const options = useAllOptions();
    const summaryData = this.getSummaryData(targetNode, langTools, options, formDataSelector);
    return <MultipleChoiceSummary formData={summaryData} />;
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'Checkboxes'>): string[] {
    return this.validateDataModelBindingsSimple(ctx);
  }
}
