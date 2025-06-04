import { useChainId } from 'wagmi';
import { erc20Abi } from 'viem';
import { WriteHook, WriteHookParams } from '../hooks';
import { useAccount } from 'wagmi';
import { usdtAbi, usdtAddress, usdtSepoliaAddress } from '../generated';
import { useWriteContractFlow } from '../shared/useWriteContractFlow';
import { sepolia } from 'viem/chains';
import { useNativeTransferFlow } from '../shared/useNativeTransferFlow';

// Returns the tx hash
type TransferHookParams = WriteHookParams & {
  contractAddress?: `0x${string}` | undefined;
  to: `0x${string}`;
  amount?: bigint;
};
export function useTransferToken({
  contractAddress,
  onSuccess = () => null,
  onError = () => null,
  onStart = () => null,
  to,
  amount,
  gas,
  enabled: paramEnabled = true
}: TransferHookParams): WriteHook {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const isUsdt =
    chainId === sepolia.id
      ? contractAddress === usdtSepoliaAddress[chainId as keyof typeof usdtSepoliaAddress]
      : contractAddress === usdtAddress[chainId as keyof typeof usdtAddress];

  const enabled = isConnected && !!to && !!amount && paramEnabled;

  if (!contractAddress)
    return useNativeTransferFlow({
      to,
      value: amount!,
      enabled,
      chainId,
      onSuccess,
      onError,
      onStart
    });

  return useWriteContractFlow({
    // Token contract address
    address: contractAddress,
    // USDT's ABI slightly differs from the standard ERC20 ABI, using the ERC20 one causes the simulation to fail
    abi: isUsdt ? usdtAbi : erc20Abi,
    functionName: 'transfer',
    args: [to!, amount!],
    gas,
    enabled,
    scopeKey: `${contractAddress}-transfer-${to}-${amount}-${chainId}`,
    chainId,
    onSuccess,
    onError,
    onStart
  });
}
