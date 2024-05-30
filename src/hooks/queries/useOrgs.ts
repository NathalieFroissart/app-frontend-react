import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import type { IAltinnOrgs } from 'src/types/shared';

// Also used for prefetching @see appPrefetcher.ts
export function useOrgsQueryDef() {
  const { fetchOrgs } = useAppQueries();

  return {
    queryKey: ['fetchOrganizations'],
    queryFn: fetchOrgs,
  };
}

export const useOrgs = () => {
  const orgsQueryDef = useOrgsQueryDef();
  const result = useQuery({
    ...orgsQueryDef,
    select: (response: { orgs: IAltinnOrgs }): IAltinnOrgs => response.orgs,
    staleTime: 1000 * 60 * 60 * 24 * 30, // 30 days
    // retry: 3,
  });

  if (result.isError) {
    window.logError('Fetching organizations failed:\n', result.error);
  }

  return result;
};