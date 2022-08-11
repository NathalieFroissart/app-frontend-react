import { useContext, useMemo } from 'react';

import { useAppSelector } from 'src/common/hooks';
import { FormComponentContext } from 'src/components';
import {
  asLayoutExpression,
  evalExpr,
} from 'src/features/form/layout/expressions/expressions';
import { useLayoutsAsNodes } from 'src/utils/layout/useLayoutsAsNodes';
import type {
  ILayoutExpression,
  ILayoutExpressionRunnerLookups,
} from 'src/features/form/layout/expressions/types';
import type { LayoutNode } from 'src/utils/layout/hierarchy';

type ResolveDistributive<T> = T extends any
  ? T extends object
    ? ResolvedLayoutExpression<T>
    : T
  : never;

/**
 * This magic type removes all layout expressions from the input type
 * @see https://stackoverflow.com/a/54487392
 */
export type ResolvedLayoutExpression<T> = Exclude<
  { [P in keyof T]: ResolveDistributive<T[P]> },
  ILayoutExpression
>;

/**
 * React hook used to resolve layout expressions from a component layout definitions. This
 * should be used inside a form component context.
 *
 * @param input Any input, object, value from the layout definitions, possibly containing layout expressions somewhere.
 *  This hook will look through the input (and recurse through objects), looking for layout expressions and resolve
 *  them to provide you with the base out value for the current component context.
 * @param componentId The component ID for the current component context. Usually optional, as it will be fetched from
 *  the FormComponentContext if not given.
 */
export function useLayoutExpression<T>(
  input: T,
  componentId?: string,
): ResolvedLayoutExpression<T> {
  const component = useContext(FormComponentContext);
  const nodes = useLayoutsAsNodes();
  const formData = useAppSelector((state) => state.formData.formData);
  const id = componentId || component.id;

  const getLookups: (context: LayoutNode) => ILayoutExpressionRunnerLookups =
    useMemo(
      () => (context: LayoutNode) => ({
        instanceContext: () => {
          // TODO: Implement
          return 'test';
        },
        applicationSettings: () => {
          // TODO: Implement
          return 'test';
        },
        component: () => {
          // TODO: Implement this. In order to implement this correctly. Some components may not always have a
          // simpleBinding - how do we compare these? Or do we just support simpleBinding for now?
          return 'test';
        },
        dataModel: (path) => {
          const newPath = context.transposeDataModel(path);
          return formData[newPath] || null;
        },
      }),
      [formData],
    );

  return useMemo(() => {
    if (!input) {
      return input;
    }

    const node = nodes.findComponentById(id);
    if (!node) {
      console.error(
        'Unable to resolve layout expressions in context of the',
        id,
        'component (it could not be found)',
      );
      return input;
    }

    const lookups = getLookups(node);

    /**
     * Recurse through an input, finds layout expressions and evaluates them
     */
    const recurse = (obj: any) => {
      if (typeof obj !== 'object') {
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map(recurse);
      }

      const expression = asLayoutExpression(obj);
      if (expression) {
        return evalExpr(expression, lookups);
      }

      const out = {};
      for (const key of Object.keys(obj)) {
        out[key] = recurse(obj[key]);
      }

      return out;
    };

    return recurse(input);
  }, [input, nodes, id, getLookups]) as ResolvedLayoutExpression<T>;
}