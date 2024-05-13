import React from 'react';
import type { PropsWithChildren } from 'react';

import { Table } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { Caption } from 'src/components/form/Caption';
import { Description } from 'src/components/form/Description';
import { Fieldset } from 'src/components/form/Fieldset';
import { FullWidthWrapper } from 'src/components/form/FullWidthWrapper';
import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import { Label } from 'src/components/form/Label';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsMobile } from 'src/hooks/useIsMobile';
import { GenericComponent } from 'src/layout/GenericComponent';
import css from 'src/layout/Grid/Grid.module.css';
import { isGridCellLabelFrom, isGridCellText, isGridRowHidden, useNodesFromGrid } from 'src/layout/Grid/tools';
import { getColumnStyles } from 'src/utils/formComponentUtils';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import { isNodeRef } from 'src/utils/layout/nodeRef';
import { Hidden, useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { useNodeTraversal } from 'src/utils/layout/useNodeTraversal';
import type { NodeRef, PropsFromGenericComponent } from 'src/layout';
import type { ITableColumnFormatting, ITableColumnProperties } from 'src/layout/common.generated';
import type { GridRowInternal } from 'src/layout/Grid/types';
import type { ITextResourceBindings } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function RenderGrid(props: PropsFromGenericComponent<'Grid'>) {
  const { node } = props;
  const { rows, textResourceBindings, labelSettings } = useNodeItem(node);
  const { title, description, help } = textResourceBindings ?? {};
  const shouldHaveFullWidth = node.parent instanceof LayoutPage;
  const columnSettings: ITableColumnFormatting = {};
  const isMobile = useIsMobile();
  const isNested = node.parent instanceof BaseLayoutNode;

  if (isMobile) {
    return <MobileGrid {...props} />;
  }

  return (
    <ConditionalWrapper
      condition={shouldHaveFullWidth}
      wrapper={(child) => <FullWidthWrapper>{child}</FullWidthWrapper>}
    >
      <Table
        id={node.getId()}
        className={css.table}
      >
        {title && (
          <Caption
            className={cn({ [css.captionFullWidth]: shouldHaveFullWidth })}
            title={<Lang id={title} />}
            description={description && <Lang id={description} />}
            helpText={help}
            labelSettings={labelSettings}
          />
        )}
        {rows.map((row, rowIdx) => (
          <GridRowRenderer
            key={rowIdx}
            row={row}
            isNested={isNested}
            mutableColumnSettings={columnSettings}
            node={node}
          />
        ))}
      </Table>
    </ConditionalWrapper>
  );
}

interface GridRowProps {
  row: GridRowInternal;
  isNested: boolean;
  mutableColumnSettings: ITableColumnFormatting;
  node: LayoutNode;
}

export function GridRowRenderer({ row, isNested, mutableColumnSettings, node }: GridRowProps) {
  const isHiddenSelector = Hidden.useIsHiddenSelector();
  return isGridRowHidden(row, isHiddenSelector) ? null : (
    <InternalRow
      header={row.header}
      readOnly={row.readOnly}
    >
      {row.cells.map((cell, cellIdx) => {
        const isFirst = cellIdx === 0;
        const isLast = cellIdx === row.cells.length - 1;
        const className = cn({
          [css.fullWidthCellFirst]: isFirst && !isNested,
          [css.fullWidthCellLast]: isLast && !isNested,
        });

        if (row.header && cell && 'columnOptions' in cell && cell.columnOptions) {
          mutableColumnSettings[cellIdx] = cell.columnOptions;
        }

        if (isGridCellText(cell) || isGridCellLabelFrom(cell)) {
          let textCellSettings: ITableColumnProperties = mutableColumnSettings[cellIdx]
            ? structuredClone(mutableColumnSettings[cellIdx])
            : {};
          textCellSettings = { ...textCellSettings, ...cell };

          if (isGridCellText(cell)) {
            return (
              <CellWithText
                key={`${cell.text}/${cellIdx}`}
                className={className}
                help={cell?.help}
                isHeader={row.header}
                columnStyleOptions={textCellSettings}
              >
                <Lang
                  id={cell.text}
                  node={node}
                />
              </CellWithText>
            );
          }

          return (
            <CellWithLabel
              key={`${cell.labelFrom}/${cellIdx}`}
              className={className}
              isHeader={row.header}
              columnStyleOptions={textCellSettings}
              node={node}
              labelFrom={cell.labelFrom}
            />
          );
        }
        return (
          <CellWithComponent
            rowReadOnly={row.readOnly}
            key={`${cell?.nodeRef}/${cellIdx}`}
            target={isNodeRef(cell) ? cell : undefined}
            isHeader={row.header}
            className={className}
            columnStyleOptions={mutableColumnSettings[cellIdx]}
          />
        );
      })}
    </InternalRow>
  );
}

type InternalRowProps = PropsWithChildren<Pick<GridRowInternal, 'header' | 'readOnly'>>;

function InternalRow({ header, readOnly, children }: InternalRowProps) {
  const className = readOnly ? css.rowReadOnly : undefined;

  if (header) {
    return (
      <Table.Head>
        <Table.Row className={className}>{children}</Table.Row>
      </Table.Head>
    );
  }

  return (
    <Table.Body>
      <Table.Row className={className}>{children}</Table.Row>
    </Table.Body>
  );
}

interface CellProps {
  className?: string;
  columnStyleOptions?: ITableColumnProperties;
  isHeader?: boolean;
  rowReadOnly?: boolean;
}

interface CellWithComponentProps extends CellProps {
  target: NodeRef | undefined;
}

interface CellWithTextProps extends PropsWithChildren, CellProps {
  help?: string;
}

interface CellWithLabelProps extends CellProps {
  node: LayoutNode;
  labelFrom?: string;
}

function CellWithComponent({
  target,
  className,
  columnStyleOptions,
  isHeader = false,
  rowReadOnly,
}: CellWithComponentProps) {
  const node = useNode(target);
  const isHidden = Hidden.useIsHidden(node);
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;

  if (node && !isHidden) {
    const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
    return (
      <CellComponent
        className={cn(css.tableCellFormatting, className)}
        style={columnStyles}
      >
        <GenericComponent
          node={node}
          overrideDisplay={{
            renderLabel: false,
            renderLegend: false,
            renderedInTable: true,
            rowReadOnly,
          }}
        />
      </CellComponent>
    );
  }

  return <CellComponent className={className} />;
}

function CellWithText({ children, className, columnStyleOptions, help, isHeader = false }: CellWithTextProps) {
  const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
  const { elementAsString } = useLanguage();
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;

  return (
    <CellComponent
      className={cn(css.tableCellFormatting, className)}
      style={columnStyles}
    >
      <span className={help && css.textCell}>
        <span
          className={css.contentFormatting}
          style={columnStyles}
        >
          {children}
        </span>
        {help && (
          <HelpTextContainer
            title={elementAsString(children)}
            helpText={<Lang id={help} />}
          />
        )}
      </span>
    </CellComponent>
  );
}

function CellWithLabel({ className, columnStyleOptions, labelFrom, node, isHeader = false }: CellWithLabelProps) {
  const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
  const labelFromNode = useNodeTraversal((t) => t.flat().find((n) => n.getBaseId() === labelFrom), node);
  const refItem = useNodeItem(labelFromNode);
  const trb = (refItem && 'textResourceBindings' in refItem ? refItem.textResourceBindings : {}) as
    | ITextResourceBindings
    | undefined;
  const title = trb && 'title' in trb ? trb.title : undefined;
  const help = trb && 'help' in trb ? trb.help : undefined;
  const description = trb && 'description' in trb ? trb.description : undefined;
  const required = (refItem && 'required' in refItem && refItem.required) ?? false;
  const componentId = labelFromNode?.getId();

  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;

  return (
    <CellComponent
      className={cn(css.tableCellFormatting, className)}
      style={columnStyles}
    >
      {componentId && (
        <>
          <span className={css.textLabel}>
            <Label
              key={`label-${componentId}`}
              label={<Lang id={title} />}
              id={componentId}
              required={required}
              helpText={help && <Lang id={help} />}
            />
          </span>
          {description && (
            <Description
              id={componentId}
              description={<Lang id={description} />}
            />
          )}
        </>
      )}
    </CellComponent>
  );
}

function MobileGrid({ node }: PropsFromGenericComponent<'Grid'>) {
  const { textResourceBindings, id, labelSettings } = useNodeItem(node);
  const { title, description, help } = textResourceBindings ?? {};
  const nodes = useNodesFromGrid(node);
  const isHidden = Hidden.useIsHiddenSelector();

  return (
    <Fieldset
      id={id}
      legend={title && <Lang id={title} />}
      description={title && <Lang id={description} />}
      helpText={help}
      labelSettings={labelSettings}
      className={css.mobileFieldset}
    >
      {nodes
        .filter((child) => !isHidden({ node: child }))
        .map((child) => (
          <GenericComponent
            key={child.getId()}
            node={child}
          />
        ))}
    </Fieldset>
  );
}
