import { useQuery } from '@tanstack/react-query';
import { ReadHook } from '../hooks';
import { TRUST_LEVELS, TrustLevelEnum } from '../constants';
import { nebulaApiClient } from './constants';
import type { components } from './nebulaApiSchema';
type SwapStatusModel = components['schemas']['SwapStatusModel'];

const getSwapStatus = async (id: string): Promise<string | null> => {
  const { data, error } = await nebulaApiClient.GET('/swap/status/{id}', {
    params: {
      path: { id }
    }
  });

  if (error) {
    throw new Error('Error retrieving swap status from Nebula');
  }

  const statusData = data as SwapStatusModel;

  return statusData.status;
};

export const useSwapStatusNebula = ({
  id,
  enabled = true
}: {
  id: string | undefined;
  enabled?: boolean;
}): ReadHook & { data: string | null | undefined } => {
  const {
    data: statusData,
    isLoading: isStatusLoading,
    error: statusError,
    refetch: mutateStatus
  } = useQuery({
    enabled: enabled && !!id,
    queryKey: ['swap-status-nebula', id],
    queryFn: () => getSwapStatus(id!),
    refetchOnWindowFocus: false,
    // Poll every 5 seconds until we get a processor hash
    refetchInterval: () => {
      return 5 * 1000; // 5 seconds
    },
    retry: (failureCount: number, error: Error) => {
      // Don't retry if the swap is not found (404)
      if (error.message?.includes('404')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  return {
    data: statusData,
    isLoading: isStatusLoading,
    error: statusError,
    mutate: mutateStatus,
    dataSources: [
      {
        title: 'Nebula Exchange API',
        href: 'https://nebula-exchange-api-prod-cudfc6ejhfg4debe.westus2-01.azurewebsites.net/',
        onChain: false,
        trustLevel: TRUST_LEVELS[TrustLevelEnum.TWO]
      }
    ]
  };
};
