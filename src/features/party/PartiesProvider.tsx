import React, { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';

import { useAppMutations, useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { createContext } from 'src/core/contexts/context';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { NoValidPartiesError } from 'src/features/instantiate/containers/NoValidPartiesError';
import { useShouldFetchProfile } from 'src/features/profile/ProfileProvider';
import type { IParty } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

const usePartiesQuery = () => {
  const enabled = useShouldFetchProfile();

  const { fetchParties } = useAppQueries();
  const utils = useQuery({
    enabled,
    queryKey: ['fetchUseParties'],
    queryFn: () => fetchParties(),
  });

  useEffect(() => {
    utils.error && window.logError('Fetching parties failed:\n', utils.error);
  }, [utils.error]);

  return {
    ...utils,
    enabled,
  };
};

const useCurrentPartyQuery = (enabled: boolean) => {
  const { fetchCurrentParty } = useAppQueries();
  const utils = useQuery({
    enabled,
    queryKey: ['fetchUseCurrentParty'],
    queryFn: () => fetchCurrentParty(),
  });

  useEffect(() => {
    utils.error && window.logError('Fetching current party failed:\n', utils.error);
  }, [utils.error]);

  return utils;
};

const useSetCurrentPartyMutation = () => {
  const { doSetCurrentParty } = useAppMutations();
  return useMutation({
    mutationKey: ['doSetCurrentParty'],
    mutationFn: (party: IParty) => doSetCurrentParty(party.partyId),
    onError: (error: HttpClientError) => {
      window.logError('Setting current party failed:\n', error);
    },
  });
};

const { Provider: PartiesProvider, useCtx: usePartiesCtx } = delayedContext(() =>
  createQueryContext<IParty[] | undefined, false>({
    name: 'Parties',
    required: false,
    default: undefined,
    query: usePartiesQuery,
  }),
);

interface CurrentParty {
  party: IParty | undefined;
  validParties: IParty[] | undefined;
  currentIsValid: boolean | undefined;
  setParty: (party: IParty) => Promise<IParty | undefined>;
}

const { Provider: RealCurrentPartyProvider, useCtx: useCurrentPartyCtx } = createContext<CurrentParty>({
  name: 'CurrentParty',
  required: false,
  default: {
    party: undefined,
    validParties: undefined,
    currentIsValid: undefined,
    setParty: () => {
      throw new Error('CurrentPartyProvider not initialized');
    },
  },
});

const CurrentPartyProvider = ({ children }: PropsWithChildren) => {
  const validParties = usePartiesCtx() as IParty[];
  const [sentToMutation, setSentToMutation] = useState<IParty | undefined>(undefined);
  const { mutateAsync, data: dataFromMutation, error: errorFromMutation } = useSetCurrentPartyMutation();
  const { data: partyFromQuery, isLoading, error: errorFromQuery } = useCurrentPartyQuery(true);

  if (isLoading) {
    return <Loader reason={'current-party'} />;
  }

  const error = errorFromMutation || errorFromQuery;
  if (error) {
    return <DisplayError error={error} />;
  }

  if (!validParties.length) {
    return <NoValidPartiesError />;
  }

  const partyFromMutation = dataFromMutation === 'Party successfully updated' ? sentToMutation : undefined;
  const currentParty = partyFromMutation ?? partyFromQuery;
  const currentIsValid = currentParty && validParties.some((party) => party.partyId === currentParty.partyId);

  return (
    <RealCurrentPartyProvider
      value={{
        party: currentParty,
        validParties,
        currentIsValid,
        setParty: async (party) => {
          try {
            setSentToMutation(party);
            const result = await mutateAsync(party);
            if (result === 'Party successfully updated') {
              return party;
            }
            return undefined;
          } catch (error) {
            // Ignoring error here, as it's handled by this provider
          }
        },
      }}
    >
      {children}
    </RealCurrentPartyProvider>
  );
};

export function PartyProvider({ children }: PropsWithChildren) {
  const shouldFetchProfile = useShouldFetchProfile();

  if (!shouldFetchProfile) {
    return <>{children}</>;
  }

  return (
    <PartiesProvider>
      <CurrentPartyProvider>{children}</CurrentPartyProvider>
    </PartiesProvider>
  );
}

export const useParties = () => usePartiesCtx();

/**
 * Returns the current party, or the custom selected current party if one is set.
 * Please note that the current party might not be allowed to instantiate, so you should
 * check the `canInstantiate` property as well.
 */
export const useCurrentParty = () => useCurrentPartyCtx().party;
export const useCurrentPartyIsValid = () => useCurrentPartyCtx().currentIsValid;
export const useSetCurrentParty = () => useCurrentPartyCtx().setParty;

export const useValidParties = () => useCurrentPartyCtx().validParties;
