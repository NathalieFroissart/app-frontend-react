import React from 'react';

import { Checkbox } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useGetOptions } from 'src/features/options/useGetOptions';
import classes from 'src/layout/Checkboxes/CheckboxesContainerComponent.module.css';
import { WrappedCheckbox } from 'src/layout/Checkboxes/WrappedCheckbox';
import { LabelContent } from 'src/layout/LabelContent';
import { shouldUseRowLayout } from 'src/utils/layout';
import type { PropsFromGenericComponent } from 'src/layout';

export type ICheckboxContainerProps = PropsFromGenericComponent<'Checkboxes'>;

export const CheckboxContainerComponent = ({ node, isValid, overrideDisplay }: ICheckboxContainerProps) => {
  const { id, layout, readOnly, textResourceBindings, required, labelSettings, alertOnChange } = node.item;
  const { langAsString } = useLanguage();

  const {
    options: calculatedOptions,
    isFetching,
    setData,
    selectedValues,
  } = useGetOptions({
    ...node.item,
    valueType: 'multi',
    node,
  });

  const labelTextGroup = (
    <LabelContent
      label={node.item.textResourceBindings?.title}
      description={node.item.textResourceBindings?.description}
      readOnly={readOnly}
      required={required}
      helpText={node.item.textResourceBindings?.help}
      labelSettings={labelSettings}
    />
  );

  const horizontal = shouldUseRowLayout({
    layout,
    optionsCount: calculatedOptions.length,
  });
  const hideLabel = overrideDisplay?.renderedInTable === true && calculatedOptions.length === 1;
  const ariaLabel = overrideDisplay?.renderedInTable ? langAsString(textResourceBindings?.title) : undefined;

  return isFetching ? (
    <AltinnSpinner />
  ) : (
    <div
      id={id}
      key={`checkboxes_group_${id}`}
    >
      <Checkbox.Group
        className={cn({ [classes.horizontal]: horizontal }, classes.checkboxGroup)}
        legend={labelTextGroup}
        description={textResourceBindings?.description && <Lang id={textResourceBindings?.description} />}
        readOnly={readOnly}
        hideLegend={overrideDisplay?.renderLegend === false}
        error={!isValid}
        aria-label={ariaLabel}
        value={selectedValues}
        data-testid='checkboxes-fieldset'
      >
        {calculatedOptions.map((option) => (
          <WrappedCheckbox
            key={option.value}
            id={id}
            option={option}
            hideLabel={hideLabel}
            alertOnChange={alertOnChange}
            checked={selectedValues.includes(option.value)}
            setChecked={(isChecked) => {
              const newData = isChecked
                ? [...selectedValues, option.value]
                : selectedValues.filter((o) => o !== option.value);
              setData(newData);
            }}
          />
        ))}
      </Checkbox.Group>
    </div>
  );
};
