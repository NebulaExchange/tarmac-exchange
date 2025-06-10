import { mainnet, sepolia } from 'wagmi/chains';
import createClient from 'openapi-fetch';
import { paths as cowPaths } from './cowApiSchema';
import { paths as nebulaPaths } from './nebulaApiSchema';

export enum TradeSide {
  IN = 'IN',
  OUT = 'OUT'
}

const COW_API_ENDPOINT = {
  [mainnet.id]: 'https://api.cow.fi/mainnet',
  [sepolia.id]: 'https://api.cow.fi/sepolia'
} as const;

const NEBULA_API_ENDPOINT = 'https://nebula-exchange-api-prod-cudfc6ejhfg4debe.westus2-01.azurewebsites.net/';

export enum OrderQuoteSideKind {
  BUY = 'buy',
  SELL = 'sell'
}

export enum QuoteSource {
  COWSWAP = 'cowswap',
  NEARINTENTS = 'nearintents'
}

export enum OrderBalance {
  ERC20 = 'erc20',
  INTERNAL = 'internal',
  EXTERNAL = 'external'
}

export enum OrderStatus {
  presignaturePending = 'presignaturePending',
  open = 'open',
  fulfilled = 'fulfilled',
  cancelled = 'cancelled',
  expired = 'expired'
}

export const ORDER_TYPE_FIELDS = [
  { name: 'sellToken', type: 'address' },
  { name: 'buyToken', type: 'address' },
  { name: 'receiver', type: 'address' },
  { name: 'sellAmount', type: 'uint256' },
  { name: 'buyAmount', type: 'uint256' },
  { name: 'validTo', type: 'uint32' },
  { name: 'appData', type: 'bytes32' },
  { name: 'feeAmount', type: 'uint256' },
  { name: 'kind', type: 'string' },
  { name: 'partiallyFillable', type: 'bool' },
  { name: 'sellTokenBalance', type: 'string' },
  { name: 'buyTokenBalance', type: 'string' }
] as const;

export const ETH_FLOW_QUOTE_PARAMS = {
  signingScheme: 'eip1271',
  onchainOrder: true,
  verificationGasLimit: 0
} as const;

export const gpv2VaultRelayerAddress = {
  [mainnet.id]: '0xC92E8bdf79f0507f65a392b0ab4667716BFE0110',
  [sepolia.id]: '0xC92E8bdf79f0507f65a392b0ab4667716BFE0110'
} as const;

export const cowApiClient = {
  [mainnet.id]: createClient<cowPaths>({ baseUrl: COW_API_ENDPOINT[mainnet.id] }),
  [sepolia.id]: createClient<cowPaths>({ baseUrl: COW_API_ENDPOINT[sepolia.id] })
} as const;

export const nebulaApiClient = createClient<nebulaPaths>({ baseUrl: NEBULA_API_ENDPOINT });
