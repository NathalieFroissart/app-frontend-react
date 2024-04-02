import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { useCurrentDataModelGuid, useCurrentDataModelName } from 'src/features/datamodel/useBindingSchema';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLaxInstance } from 'src/features/instance/InstanceContext';
import type { IPdfFormat } from 'src/features/pdf/types';

export const usePdfFormatQuery = (enabled: boolean): UseQueryResult<IPdfFormat> => {
  const { fetchPdfFormat } = useAppQueries();
  // TODO(Datamodels): Should we upgrade PDF format to support other data models? Or should we deprecate this functionality instead?
  const dataType = useCurrentDataModelName();
  const formData = FD.useDebounced(dataType!);

  const instanceId = useLaxInstance()?.instanceId;
  const dataGuid = useCurrentDataModelGuid();

  const ready = typeof dataGuid === 'string';
  const utils = useQuery({
    enabled: enabled && ready,
    queryKey: ['fetchPdfFormat', instanceId, dataGuid, formData],
    queryFn: () => fetchPdfFormat(instanceId!, dataGuid!),
  });

  useEffect(() => {
    utils.error && window.logError('Fetching PDF format failed:\n', utils.error);
  }, [utils.error]);

  return utils;
};
