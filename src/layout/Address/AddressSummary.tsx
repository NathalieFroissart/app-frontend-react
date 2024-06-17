import React from 'react';

import { Label, Paragraph } from '@digdir/designsystemet-react';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/Summary2/CommonSummaryComponents/SingleFieldSummary.module.css';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface AddressSummaryProps {
  componentNode: LayoutNode<'Address'>;
}

export function AddressSummary({ componentNode }: AddressSummaryProps) {
  const textResourceBindings = componentNode.item.textResourceBindings;
  const { title, zipCodeTitle, postPlaceTitle } = textResourceBindings ?? {};
  const { formData } = useDataModelBindings(componentNode.item.dataModelBindings);
  const { address, careOf, postPlace, zipCode, houseNumber } = formData;

  return (
    <div>
      <Label weight={'regular'}>
        <Lang id={title}></Lang>
      </Label>
      <Paragraph className={classes.formValue}>{address}</Paragraph>
      <div>
        <Label weight={'regular'}>
          <Lang id={zipCodeTitle}></Lang>
        </Label>
        <Paragraph className={classes.formValue}>{zipCode}</Paragraph>
        <Label weight={'regular'}>
          <Lang id={postPlaceTitle}></Lang>
        </Label>
        <Paragraph className={classes.formValue}>{postPlace}</Paragraph>
      </div>
    </div>
  );
}