import { useAccount, useWaitForTransactionReceipt, useSendTransaction, useEstimateGas } from 'wagmi';
import { isRevertedError } from '../helpers';
import { useEffect, useMemo } from 'react';
import type { WriteHook } from '../hooks';
import { Config, ResolvedRegister } from '@wagmi/core';
import { SAFE_CONNECTOR_ID } from './constants';
import { useWaitForSafeTxHash } from './useWaitForSafeTxHash';

type UseNativeTransferFlowParameters<
  config extends Config = Config,
  chainId extends config['chains'][number]['id'] | undefined = undefined
> = {
  to: `0x${string}`;
  value: bigint;
  enabled: boolean;
  gcTime?: number;
  chainId?: chainId;
  onStart?: (hash: string) => void;
  onSuccess?: (hash: string) => void;
  onError?: (error: Error, hash: string) => void;
};

export function useNativeTransferFlow<
  config extends Config = ResolvedRegister['config'],
  chainId extends config['chains'][number]['id'] | undefined = undefined
>(parameters: UseNativeTransferFlowParameters<config, chainId>): WriteHook {
  const {
    to,
    value,
    enabled,
    gcTime,
    chainId,
    onSuccess = () => null,
    onError = () => null,
    onStart = () => null
  } = parameters;

  // Prepare transaction data
  const transactionRequest = useMemo(() => {
    if (!enabled || !to || !value) return undefined;

    try {
      return {
        to,
        value: value,
        data: '0x' as const, // Empty data for native transfer
        chainId
      };
    } catch (error) {
      console.error('Error parsing transfer amount:', error);
      return undefined;
    }
  }, [to, value, enabled, chainId]);

  // Estimate gas for the transaction
  const {
    data: gasEstimate,
    refetch: refetchGasEstimate,
    isLoading: isGasEstimateLoading,
    error: gasEstimateError
  } = useEstimateGas({
    ...transactionRequest,
    query: {
      enabled: enabled && !!transactionRequest,
      gcTime: gcTime || 30000
    }
  });

  const {
    sendTransaction,
    error: sendError,
    data: mutationHash
  } = useSendTransaction({
    mutation: {
      onSuccess: (hash: `0x${string}`) => {
        if (onStart) {
          onStart(hash);
        }
      },
      onError: (err: Error) => {
        if (onError) {
          onError(err, mutationHash || '');
        }
      }
    }
  });

  // Workaround to get `txHash` from Safe connector
  const { connector } = useAccount();
  const isSafeConnector = connector?.id === SAFE_CONNECTOR_ID;

  const eventHash = useWaitForSafeTxHash({
    chainId: parameters.chainId,
    safeTxHash: mutationHash,
    isSafeConnector
  });

  // If the user is currently connected through the Safe connector, the txHash will only
  // be populated after we get it from the Safe wallet contract event, if they're connected
  // to any other connector, the txHash will be the one we get from the mutation
  const txHash = useMemo(
    () => (isSafeConnector ? eventHash : mutationHash),
    [eventHash, mutationHash, isSafeConnector]
  );

  // Monitor tx
  const {
    isLoading: isMining,
    isSuccess,
    error: miningError,
    failureReason
  } = useWaitForTransactionReceipt({
    hash: txHash
  });
  const txReverted = isRevertedError(failureReason);

  useEffect(() => {
    if (txHash) {
      if (isSuccess) {
        onSuccess(txHash);
      } else if (miningError) {
        onError(miningError, txHash);
      } else if (failureReason && txReverted) {
        onError(failureReason, txHash);
      }
    }
  }, [isSuccess, miningError, failureReason, txHash, txReverted]);

  return {
    execute: () => {
      if (transactionRequest && gasEstimate) {
        sendTransaction({
          ...transactionRequest,
          gas: gasEstimate
        });
      } else {
        console.log(`ERROR: the native transfer was triggered before the transaction was ready.
          to: ${to}
          value: ${value}
          isGasEstimateLoading: ${isGasEstimateLoading}
          gasEstimateError: ${gasEstimateError}
          enabled: ${enabled}`);
      }
    },
    data: txHash,
    isLoading: isGasEstimateLoading || (isMining && !txReverted),
    error: sendError || miningError,
    prepareError: gasEstimateError,
    prepared: !!transactionRequest && !!gasEstimate,
    retryPrepare: refetchGasEstimate
  };
}
