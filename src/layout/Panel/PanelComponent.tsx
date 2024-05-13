import React from 'react';

import { Panel } from '@altinn/altinn-design-system';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { FullWidthWrapper } from 'src/components/form/FullWidthWrapper';
import { getVariant } from 'src/components/form/Panel';
import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/Panel/Panel.module.css';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { useNodeTraversal } from 'src/utils/layout/useNodeTraversal';
import type { PropsFromGenericComponent } from 'src/layout';
type IPanelProps = PropsFromGenericComponent<'Panel'>;

export const PanelComponent = ({ node }: IPanelProps) => {
  const { textResourceBindings, variant, showIcon, grid } = useNodeItem(node);
  const fullWidth = !grid && node.parent instanceof LayoutPage;

  const { isOnBottom, isOnTop } = useNodeTraversal((t) => {
    const parent = t.parents()[0];
    const children = t.with(parent).children();
    const isOnBottom = children.indexOf(node) === children.length - 1;
    const isOnTop = children.indexOf(node) === 0;
    return { isOnBottom, isOnTop };
  }, node);

  if (!textResourceBindings) {
    return null;
  }

  return (
    <ConditionalWrapper
      condition={fullWidth}
      wrapper={(child) => (
        <FullWidthWrapper
          className={classes.panelPadding}
          isOnBottom={isOnBottom}
          isOnTop={isOnTop}
        >
          {child}
        </FullWidthWrapper>
      )}
    >
      <Panel
        title={<Lang id={textResourceBindings.title} />}
        showIcon={showIcon}
        variant={getVariant({ variant })}
        forceMobileLayout={!fullWidth}
      >
        <Lang id={textResourceBindings.body} />
      </Panel>
    </ConditionalWrapper>
  );
};
