import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { useAppServicesContext } from 'src/contexts/appServiceContext';
import { InstanceDataActions } from 'src/features/instanceData/instanceDataSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { ISimpleInstance } from 'src/types';

enum ServerStateCacheKey {
  getActiveInstances = 'GET_ACTIVE_INSTANCES',
}

export const useActiveInstancesQuery = (
  partyId: string,
  enabled?: boolean,
): UseQueryResult<ISimpleInstance[], unknown> => {
  const dispatch = useAppDispatch();
  const { fetchActiveInstances } = useAppServicesContext();
  return useQuery([ServerStateCacheKey.getActiveInstances], () => fetchActiveInstances(partyId), {
    enabled,
    onSuccess: (instanceData) => {
      dispatch(InstanceDataActions.getFulfilled({ instanceData }));
    },
  });
};
