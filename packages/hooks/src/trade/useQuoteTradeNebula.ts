/* eslint-disable @typescript-eslint/no-unused-vars */
import { useQuery } from '@tanstack/react-query';
import { useAccount, useChainId } from 'wagmi';
import { ReadHook } from '../hooks';
import { TRUST_LEVELS, TrustLevelEnum, ZERO_ADDRESS } from '../constants';
import {
  ETH_FLOW_QUOTE_PARAMS,
  OrderBalance,
  OrderQuoteSideKind,
  QuoteSource,
  cowApiClient,
  nebulaApiClient
} from './constants';
import { OrderQuoteResponse, OrderQuoteSide } from './trade';
import { verifySlippageAndDeadline } from './helpers';
import type { components } from './nebulaApiSchema';
type CowswapQuote = components['schemas']['CowswapQuote'];
type NearIntentsQuote = components['schemas']['NearIntentsQuote'];
type QuoteResponseModel = components['schemas']['QuoteResponseModel'];

type GetTradeQuoteParams = {
  chainId: number;
  sellToken: `0x${string}`;
  buyToken: `0x${string}`;
  address: `0x${string}`;
  amount: bigint;
  kind: OrderQuoteSideKind;
  slippage: number;
  ttl: number;
  isEthFlow: boolean;
  isSmartContractWallet: boolean;
};

const mapChainIdToKey = (chain: number) => {
  switch (chain) {
    case 1:
      return 'eth';
    case 100:
      return 'gnosis';
    case 8453:
      return 'base';
    case 42161:
      return 'arb';
    default:
      return '';
  }
};

const getTradeQuote = async ({
  chainId,
  sellToken,
  buyToken,
  address = ZERO_ADDRESS,
  kind,
  amount,
  slippage,
  ttl,
  isEthFlow,
  isSmartContractWallet
}: GetTradeQuoteParams) => {
  // const side: OrderQuoteSide =
  //   kind === OrderQuoteSideKind.BUY
  //     ? { kind: OrderQuoteSideKind.BUY, buyAmountAfterFee: amount.toString() }
  //     : { kind: OrderQuoteSideKind.SELL, sellAmountBeforeFee: amount.toString() };

  const {
    data: quoteData,
    response,
    error
  } = await nebulaApiClient.POST('/quote', {
    body: {
      amountFrom: amount.toString(),
      accountFrom: address,
      accountTo: address,
      chainFrom: mapChainIdToKey(chainId),
      chainTo: mapChainIdToKey(chainId),
      tokenFrom: sellToken,
      tokenTo: buyToken
    }
  });

  // if (error) {
  //   throw new Error((error as { errorType: string } | undefined)?.errorType);
  // }

  const quote = quoteData as QuoteResponseModel;

  switch (quote.quoteSource) {
    case 'COWSWAP':
      return createCowswapQuote(quote.originalQuote as CowswapQuote, slippage);
    default:
      return createNearIntentsQuote(quote.originalQuote as NearIntentsQuote, slippage);
  }
};

const createCowswapQuote = async (quote: CowswapQuote, slippage: number) => {
  const sellAmountBeforeFee = BigInt(quote.quote.sellAmount);
  const sellAmountAfterFee = BigInt(quote.quote.sellAmount) + BigInt(quote.quote.feeAmount);
  const buyAmountBeforeFee = BigInt(quote.quote.buyAmount);
  const buyAmountAfterFee = (buyAmountBeforeFee * sellAmountAfterFee) / sellAmountBeforeFee;
  const feeAmountInBuyToken = buyAmountAfterFee - buyAmountBeforeFee;

  const sellAmountToSign =
    quote.quote.kind === OrderQuoteSideKind.SELL
      ? sellAmountAfterFee
      : (sellAmountAfterFee * BigInt(Math.round((1 + slippage / 100) * 10000))) / 10000n;

  const buyAmountToSign =
    quote.quote.kind === OrderQuoteSideKind.SELL
      ? (buyAmountBeforeFee * BigInt(Math.round((1 - slippage / 100) * 10000))) / 10000n
      : buyAmountBeforeFee;

  return {
    ...quote,
    quoteSource: QuoteSource.COWSWAP,
    quote: {
      sellAmount: BigInt(quote.quote.sellAmount),
      buyAmount: BigInt(quote.quote.buyAmount),
      feeAmount: BigInt(quote.quote.feeAmount),
      sellAmountBeforeFee,
      sellAmountAfterFee,
      buyAmountBeforeFee,
      buyAmountAfterFee,
      feeAmountInBuyToken,
      slippageTolerance: slippage,
      sellAmountToSign,
      buyAmountToSign
    }
  } as OrderQuoteResponse;
};

const createNearIntentsQuote = async (quote: NearIntentsQuote, slippage: number) => {
  const sellAmountBeforeFee = BigInt(quote.quote.amountIn);
  const sellAmountAfterFee = BigInt(quote.quote.amountIn) + BigInt(0);
  const buyAmountBeforeFee = BigInt(quote.quote.amountOut);
  const buyAmountAfterFee = (buyAmountBeforeFee * sellAmountAfterFee) / sellAmountBeforeFee;
  const feeAmountInBuyToken = buyAmountAfterFee - buyAmountBeforeFee;

  const sellAmountToSign = sellAmountAfterFee;
  // quote.quote.kind === OrderQuoteSideKind.SELL
  //   ? sellAmountAfterFee
  //   : (sellAmountAfterFee * BigInt(Math.round((1 + slippage / 100) * 10000))) / 10000n;

  const buyAmountToSign = buyAmountBeforeFee;
  // quote.quote.kind === OrderQuoteSideKind.SELL
  //   ? (buyAmountBeforeFee * BigInt(Math.round((1 - slippage / 100) * 10000))) / 10000n
  //   : buyAmountBeforeFee;

  return {
    expiration: quote.quote.deadline,
    from: '0x00000',
    quoteSource: QuoteSource.NEARINTENTS,
    id: 12312,
    verified: true,
    quote: {
      sellAmount: BigInt(quote.quote.amountIn),
      buyAmount: BigInt(quote.quote.amountOut),
      feeAmount: BigInt(0),
      sellAmountBeforeFee,
      sellAmountAfterFee,
      buyAmountBeforeFee,
      buyAmountAfterFee,
      feeAmountInBuyToken,
      slippageTolerance: slippage,
      sellAmountToSign,
      buyAmountToSign,
      receiver: '0xaaaa',
      appData: '0xaaa',
      appDataHash: '0xaaa',
      buyTokenBalance: OrderBalance.ERC20,
      kind: OrderQuoteSideKind.BUY,
      partiallyFillable: false,
      sellToken: '0xxx',
      sellTokenBalance: OrderBalance.ERC20,
      signingScheme: 'eip712',
      validTo: 12312312,
      buyToken: '0xxads',
      depositAddress: quote.quote.depositAddress
    }
  } as OrderQuoteResponse;
};

export const useQuoteTradeNebula = ({
  sellToken,
  buyToken,
  amount,
  kind,
  isEthFlow = false,
  isSmartContractWallet,
  slippage: paramSlippage,
  enabled: paramEnabled = true
}: {
  sellToken: `0x${string}` | undefined;
  buyToken: `0x${string}` | undefined;
  amount: bigint | undefined;
  kind: OrderQuoteSideKind;
  isEthFlow?: boolean;
  isSmartContractWallet: boolean;
  slippage: string;
  enabled?: boolean;
}): ReadHook & { data: OrderQuoteResponse | undefined | null } => {
  const chainId = useChainId();
  const { address } = useAccount();

  const enabled = paramEnabled && !!sellToken && !!buyToken && !!amount;
  const { slippage, ttl } = verifySlippageAndDeadline({
    slippage: paramSlippage,
    isEthFlow
  });

  const {
    data: quoteData,
    isLoading: isQuoteLoading,
    error: quoteError,
    refetch: mutateQuote
  } = useQuery({
    enabled,
    queryKey: [
      'quote-nebula-trade',
      sellToken,
      buyToken,
      chainId,
      amount?.toString(),
      kind,
      address,
      slippage,
      isEthFlow
    ],
    queryFn: () =>
      getTradeQuote({
        chainId,
        sellToken: sellToken!,
        buyToken: buyToken!,
        amount: amount!,
        kind,
        address: address!,
        ttl,
        slippage,
        isEthFlow,
        isSmartContractWallet
      }),
    refetchOnWindowFocus: false,
    // Invalidate quote after 2 minutes, which matches the expiration time of the quote
    gcTime: 2 * 60 * 1000,
    retry: (failureCount: number, error: Error) => {
      //don't retry if the error is because the sell amount does not cover the fee
      if (error.message?.includes('SellAmountDoesNotCoverFee')) {
        return false;
      }
      return failureCount < 2;
    }
  });

  return {
    data: quoteData,
    isLoading: isQuoteLoading,
    error: quoteError,
    mutate: mutateQuote,
    dataSources: [
      {
        title: 'CoW Protocol Order book API',
        href: 'https://docs.cow.fi/cow-protocol/reference/apis/orderbook',
        onChain: false,
        trustLevel: TRUST_LEVELS[TrustLevelEnum.TWO]
      }
    ]
  };
};
