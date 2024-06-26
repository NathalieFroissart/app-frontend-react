import { useEffect } from 'react';

import { skipToken, useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { cleanLayout } from 'src/features/form/layout/cleanLayout';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useCurrentLayoutSetId } from 'src/features/form/layoutSets/useCurrentLayoutSetId';
import { useHasInstance } from 'src/features/instance/InstanceContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useNavigationParam } from 'src/features/routing/AppRoutingContext';
import type { QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import type { ILayoutCollection, ILayouts } from 'src/layout/layout';
import type { IExpandedWidthLayouts, IHiddenLayoutsExternal } from 'src/types';

export interface LayoutContextValue {
  layouts: ILayouts;
  hiddenLayoutsExpressions: IHiddenLayoutsExternal;
  expandedWidthLayouts: IExpandedWidthLayouts;
}

// Also used for prefetching @see formPrefetcher.ts
export function useLayoutQueryDef(enabled: boolean, layoutSetId?: string): QueryDefinition<LayoutContextValue> {
  const { fetchLayouts } = useAppQueries();
  return {
    queryKey: ['formLayouts', layoutSetId, enabled],
    queryFn: layoutSetId ? () => fetchLayouts(layoutSetId).then(processLayouts) : skipToken,
    enabled: enabled && !!layoutSetId,
  };
}

function useLayoutQuery() {
  const hasInstance = useHasInstance();
  const process = useLaxProcessData();
  const currentLayoutSetId = useLayoutSetId();

  // Waiting to fetch layouts until we have an instance, if we're supposed to have one
  // We don't want to fetch form layouts for a process step which we are currently not on
  const utils = useQuery(useLayoutQueryDef(hasInstance ? !!process : true, currentLayoutSetId));

  useEffect(() => {
    utils.error && window.logError('Fetching form layout failed:\n', utils.error);
  }, [utils.error]);

  return utils;
}
const { Provider, useCtx } = delayedContext(() =>
  createQueryContext({
    name: 'LayoutsContext',
    required: true,
    query: useLayoutQuery,
  }),
);

export function useLayoutSetId() {
  const layoutSets = useLayoutSets();
  const currentProcessLayoutSetId = useCurrentLayoutSetId();
  const taskId = useNavigationParam('taskId');

  const layoutSetId = taskId != null ? layoutSets?.sets.find((set) => set.tasks?.includes(taskId))?.id : undefined;

  return layoutSetId ?? currentProcessLayoutSetId;
}
export const LayoutsProvider = Provider;
export const useLayouts = () => useCtx().layouts;

export const useHiddenLayoutsExpressions = () => useCtx().hiddenLayoutsExpressions;

export const useExpandedWidthLayouts = () => useCtx().expandedWidthLayouts;

function processLayouts(input: ILayoutCollection): LayoutContextValue {
  const layouts: ILayouts = {};
  const hiddenLayoutsExpressions: IHiddenLayoutsExternal = {};
  const expandedWidthLayouts: IExpandedWidthLayouts = {};
  for (const key of Object.keys(input)) {
    const file = input[key];
    layouts[key] = cleanLayout(file.data.layout);
    hiddenLayoutsExpressions[key] = file.data.hidden;
    expandedWidthLayouts[key] = file.data.expandedWidth;
  }

  return {
    layouts,
    hiddenLayoutsExpressions,
    expandedWidthLayouts,
  };
}
