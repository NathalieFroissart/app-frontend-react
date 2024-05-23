import React from 'react';

import { Heading } from '@digdir/designsystemet-react';
import { Grid } from '@material-ui/core';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { OrganisationLogo } from 'src/components/presentation/OrganisationLogo/OrganisationLogo';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsPayment } from 'src/features/payment/utils';
import classes from 'src/features/pdf/PDFView.module.css';
import { usePdfPage } from 'src/hooks/usePdfPage';
import { CompCategory } from 'src/layout/common';
import { GenericComponent } from 'src/layout/GenericComponent';
import { GroupComponent } from 'src/layout/Group/GroupComponent';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import { useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { useNodeTraversal } from 'src/utils/layout/useNodeTraversal';
import type { NodeRef } from 'src/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

const PDFComponentFromRef = ({ ref }: { ref: NodeRef }) => {
  const node = useNode(ref);
  return (
    <PDFComponent
      key={ref.nodeRef}
      node={node}
    />
  );
};

const PDFComponent = ({ node }: { node: LayoutNode }) => {
  const item = useNodeItem(node);
  if (item.type === 'Summary' || ('renderAsSummary' in item && item.renderAsSummary)) {
    return (
      <SummaryComponent
        summaryNode={node as LayoutNode<'Summary'>}
        overrides={{
          display: { hideChangeButton: true, hideValidationMessages: true },
        }}
      />
    );
  } else if (node.isType('Group')) {
    // Support grouping of summary components
    return (
      <GroupComponent
        groupNode={node}
        renderLayoutNode={(ref) => (
          <PDFComponentFromRef
            key={ref.nodeRef}
            ref={ref}
          />
        )}
      />
    );
  } else if (node.isCategory(CompCategory.Presentation)) {
    return (
      <GenericComponent
        node={node}
        overrideItemProps={{
          grid: { xs: 12 },
        }}
      />
    );
  } else {
    window.logWarnOnce(`Component type: "${node.getType()}" is not allowed in PDF. Component id: "${node.getId()}"`);
    return null;
  }
};

export const PDFView = () => {
  const pdfPage = usePdfPage();
  const appName = useAppName();
  const appOwner = useAppOwner();
  const { langAsString } = useLanguage();

  const isPayment = useIsPayment();
  const enableOrgLogo = Boolean(useApplicationMetadata().logo);
  const topLevelChildren = useNodeTraversal((t) => (!pdfPage || t.targetIsRoot() ? [] : t.children()), pdfPage);

  if (!pdfPage) {
    return null;
  }

  return (
    <div
      id='pdfView'
      className={classes['pdf-wrapper']}
    >
      {appOwner && <span role='doc-subtitle'>{appOwner}</span>}

      <ConditionalWrapper
        condition={isPayment && enableOrgLogo}
        wrapper={(children) => (
          <div className={classes.paymentTitleContainer}>
            {children} <OrganisationLogo></OrganisationLogo>
          </div>
        )}
      >
        <Heading
          spacing={true}
          level={1}
          size='large'
        >
          {isPayment ? `${appName} - ${langAsString('payment.receipt.title')}` : appName}
        </Heading>
      </ConditionalWrapper>

      <Grid
        container={true}
        spacing={3}
        alignItems='flex-start'
      >
        {topLevelChildren.map((node) => (
          <PDFComponent
            key={node.getId()}
            node={node}
          />
        ))}
      </Grid>
      <ReadyForPrint />
    </div>
  );
};
