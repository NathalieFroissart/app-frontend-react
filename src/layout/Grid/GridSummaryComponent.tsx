import React from 'react';

import { useNodesFromGrid } from 'src/layout/Grid/tools';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

export function GridSummaryComponent({
  targetNode,
  summaryNode,
  overrides,
}: SummaryRendererProps<'Grid'>): JSX.Element | null {
  const nodes = useNodesFromGrid(targetNode).filter((node) => 'renderSummary' in node.def);

  return (
    <>
      {nodes.map((node, idx) => (
        <SummaryComponent
          key={node.getId()}
          summaryNode={summaryNode}
          overrides={{
            targetNode: node,
            ...overrides,
            display: {
              hideBottomBorder: idx === nodes.length - 1,
              ...overrides?.display,
            },
          }}
        />
      ))}
    </>
  );
}
