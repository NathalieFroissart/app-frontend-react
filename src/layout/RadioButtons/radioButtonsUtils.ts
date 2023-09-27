import React, { useMemo } from 'react';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { useDelayedSavedState } from 'src/hooks/useDelayedSavedState';
import { useGetOptions } from 'src/hooks/useGetOptions';
import { useHasChangedIgnoreUndefined } from 'src/hooks/useHasChangedIgnoreUndefined';
import { getOptionLookupKey } from 'src/utils/options';
import type { IRadioButtonsContainerProps } from 'src/layout/RadioButtons/RadioButtonsContainerComponent';

export const useRadioButtons = ({ node, handleDataChange, formData }: IRadioButtonsContainerProps) => {
  const { optionsId, options, preselectedOptionIndex, mapping, queryParameters, source } = node.item;
  const apiOptions = useGetOptions({ optionsId, mapping, queryParameters, source, node });
  const _calculatedOptions = useMemo(() => apiOptions || options, [apiOptions, options]);
  const calculatedOptions = _calculatedOptions || [];
  const optionsHasChanged = useHasChangedIgnoreUndefined(apiOptions);
  const lookupKey = optionsId && getOptionLookupKey({ id: optionsId, mapping });
  const _fetchingOptions =
    useAppSelector((state) => lookupKey && state.optionState.options[lookupKey]?.loading) || undefined;
  const {
    value: selected,
    setValue,
    saveValue,
  } = useDelayedSavedState(handleDataChange, formData?.simpleBinding ?? '', 200);

  const shouldPreselectItem =
    !formData?.simpleBinding &&
    typeof preselectedOptionIndex !== 'undefined' &&
    preselectedOptionIndex >= 0 &&
    _calculatedOptions &&
    preselectedOptionIndex < _calculatedOptions.length;

  const fetchingOptions =
    _fetchingOptions ?? (_calculatedOptions === undefined ? true : shouldPreselectItem ? true : undefined);

  React.useEffect(() => {
    if (shouldPreselectItem) {
      const preSelectedValue = _calculatedOptions[preselectedOptionIndex].value;
      setValue(preSelectedValue, true);
    }
  }, [_calculatedOptions, setValue, preselectedOptionIndex, shouldPreselectItem]);

  React.useEffect(() => {
    if (optionsHasChanged && formData.simpleBinding) {
      // New options have been loaded, we have to reset form data.
      setValue(undefined, true);
    }
  }, [setValue, optionsHasChanged, formData]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  };

  const handleChangeRadioGroup = (value: string) => {
    setValue(value);
  };

  const handleBlur: React.FocusEventHandler = (event) => {
    // Only set value instantly if moving focus outside of the radio group
    if (!event.currentTarget.contains(event.relatedTarget)) {
      saveValue();
    }
  };
  return {
    handleChange,
    handleChangeRadioGroup,
    handleBlur,
    fetchingOptions,
    selected,
    calculatedOptions,
  };
};
