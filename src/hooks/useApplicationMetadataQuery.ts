import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { useAppServicesContext } from 'src/contexts/appServiceContext';
import { ApplicationMetadataActions } from 'src/features/applicationMetadata/applicationMetadataSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';

enum ServerStateCacheKey {
  ApplicationMetadata = 'ApplicationMetadata',
}

export const useApplicationMetadataQuery = (): UseQueryResult<IApplicationMetadata, unknown> => {
  const dispatch = useAppDispatch();
  const { fetchApplicationMetadata } = useAppServicesContext();
  return useQuery([ServerStateCacheKey.ApplicationMetadata], fetchApplicationMetadata, {
    onSuccess: (applicationMetadata) => {
      dispatch(ApplicationMetadataActions.getFulfilled({ applicationMetadata }));
    },
  });
};
