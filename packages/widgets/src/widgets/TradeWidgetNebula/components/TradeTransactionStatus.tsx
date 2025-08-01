import { useContext, useEffect } from 'react';
import { useLingui } from '@lingui/react';
import { t } from '@lingui/core/macro';
import { getTokenDecimals, OrderQuoteResponse, Token } from '@jetstreamgg/hooks';
import { QuoteSource } from '../../../../../hooks/src/trade/constants';
import {
  WAD_PRECISION,
  formatBigInt,
  ExplorerName,
  getExplorerName,
  isL2ChainId,
  useIsSafeWallet
} from '@jetstreamgg/utils';
import { TxCardCopyText } from '@widgets/shared/types/txCardCopyText';
import { WidgetContext } from '@widgets/context/WidgetContext';
import { TransactionStatus } from '@widgets/shared/components/ui/transaction/TransactionStatus';
import {
  EthFlowTxStatus,
  TradeAction,
  TradeFlow,
  TradeScreen,
  TradeSide,
  ethFlowTradeDescription,
  ethFlowTradeLoadingButtonText,
  ethFlowTradeSubtitle,
  ethFlowTradeTitle,
  tradeApproveDescription,
  tradeApproveSubtitle,
  tradeApproveTitle,
  tradeDescription,
  tradeLoadingButtonText,
  tradeSubtitle,
  tradeTitle
} from '../lib/constants';
import { TxStatus, approveLoadingButtonText } from '@widgets/shared/constants';
import { formatUnits } from 'viem';
import { EthTxCardCopyText } from '../lib/types';
import { useChainId } from 'wagmi';
import { ExternalLink } from '@widgets/shared/components/ExternalLink';
import { Text } from '@widgets/shared/components/ui/Typography';

// Custom transaction detail component for NEAR Intents
const NearIntentsTransactionDetail = () => {
  return (
    <>
      <Text variant="medium" className="text-textSecondary mt-3 leading-4">
        You are signing a transfer function, which will deposit your token into NEAR intents and place a
        trade. Your trade will revert in case your tokens are not delivered to your wallet within 30 minutes.
        Read about NEAR intents{' '}
        <ExternalLink
          href="https://docs.near-intents.org/near-intents"
          className="text-textEmphasis underline"
          showIcon={false}
        >
          here
        </ExternalLink>
      </Text>
    </>
  );
};

// TX Status wrapper to update copy
export const TradeTransactionStatus = ({
  quoteData,
  originToken,
  originAmount,
  targetToken,
  targetAmount,
  lastUpdated,
  isEthFlow,
  ethFlowTxStatus = EthFlowTxStatus.IDLE,
  onExternalLinkClicked
}: {
  quoteData?: OrderQuoteResponse | null | undefined;
  originToken?: Token;
  originAmount: bigint;
  targetToken?: Token;
  targetAmount: bigint;
  lastUpdated?: TradeSide;
  isEthFlow: boolean;
  ethFlowTxStatus?: EthFlowTxStatus;
  onExternalLinkClicked?: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
}) => {
  const { i18n } = useLingui();
  const chainId = useChainId();
  const isSafeWallet = useIsSafeWallet();
  const {
    setTxTitle,
    setTxSubtitle,
    setTxDescription,
    setLoadingText,
    txStatus,
    widgetState,
    setStep,
    setStepTwoTitle,
    setOriginToken,
    setOriginAmount,
    setTargetToken,
    setTargetAmount
  } = useContext(WidgetContext);
  if (!originToken || !targetToken) return null;

  const { flow, action, screen } = widgetState;

  const exactInput = lastUpdated === TradeSide.IN;

  const inputAmount =
    txStatus === TxStatus.SUCCESS
      ? originAmount
      : exactInput
        ? quoteData?.quote.sellAmountAfterFee
        : quoteData?.quote.sellAmountBeforeFee;
  const outputAmount =
    txStatus === TxStatus.SUCCESS
      ? targetAmount
      : exactInput
        ? quoteData?.quote.buyAmountAfterFee
        : quoteData?.quote.buyAmountBeforeFee;

  const executionPrice =
    inputAmount && outputAmount
      ? (
          +formatUnits(inputAmount, getTokenDecimals(originToken, chainId) || WAD_PRECISION) /
          +formatUnits(outputAmount, getTokenDecimals(targetToken, chainId) || WAD_PRECISION)
        ).toString()
      : undefined;

  const isL2 = isL2ChainId(chainId);
  const chainExplorerName = getExplorerName(chainId, isSafeWallet);

  useEffect(() => {
    setOriginToken(originToken);
    setOriginAmount(originAmount);
    setTargetToken(targetToken);
    setTargetAmount(targetAmount);
  }, [originToken, originAmount, targetToken, targetAmount]);

  // Sets the title and subtitle of the card
  useEffect(() => {
    // Handle NEAR Intents trades specifically
    if (
      quoteData?.quoteSource === QuoteSource.NEARINTENTS &&
      flow === TradeFlow.TRADE &&
      action === TradeAction.TRANSFER &&
      screen === TradeScreen.TRANSACTION
    ) {
      if (txStatus === TxStatus.LOADING) {
        setTxTitle(t`Processing transaction`);
        setTxSubtitle(t`Processing transaction`);
        setTxDescription(t`Processing transaction`);
        setLoadingText(t`Processing...`);
      } else if (txStatus === TxStatus.SUCCESS) {
        setTxTitle(t`Trade successful`);
        setTxSubtitle(t`Trade successful`);
        setTxDescription(t`Trade successful`);
        setLoadingText(t`Trade completed`);
      } else if (txStatus === TxStatus.ERROR) {
        setTxTitle(t`Trade failed`);
        setTxSubtitle(t`Trade failed`);
        setTxDescription(t`Trade failed`);
        setLoadingText(t`Try again`);
      }
      return;
    }

    if (isEthFlow) {
      setTxTitle(i18n._(ethFlowTradeTitle[ethFlowTxStatus as keyof EthTxCardCopyText]));
      setTxSubtitle(
        i18n._(
          ethFlowTradeSubtitle({
            ethFlowTxStatus,
            originToken,
            originAmount: formatBigInt(originAmount, {
              unit: originToken ? getTokenDecimals(originToken, chainId) : 18
            }),
            targetToken,
            targetAmount: formatBigInt(targetAmount, {
              unit: targetToken ? getTokenDecimals(targetToken, chainId) : 18
            })
          })
        )
      );
      setTxDescription(
        i18n._(ethFlowTradeDescription({ originToken, targetToken, ethFlowTxStatus, executionPrice }))
      );
      setLoadingText(i18n._(ethFlowTradeLoadingButtonText({ ethFlowTxStatus })));
    } else {
      // Handle NEAR Intents trades - no step indicator needed
      if (
        quoteData?.quoteSource === QuoteSource.NEARINTENTS &&
        flow === TradeFlow.TRADE &&
        action === TradeAction.TRANSFER
      ) {
        // Don't set step titles for NEAR Intents - single step UX
        return;
      }

      if (flow === TradeFlow.TRADE) setStepTwoTitle(t`Trade`);
      if (flow === TradeFlow.TRADE && action === TradeAction.APPROVE && screen === TradeScreen.TRANSACTION) {
        setStep(1);
        setLoadingText(i18n._(approveLoadingButtonText[txStatus as keyof TxCardCopyText]));
        setTxTitle(i18n._(tradeApproveTitle[txStatus as keyof TxCardCopyText]));
        setTxSubtitle(i18n._(tradeApproveSubtitle(txStatus, originToken.symbol)));
        setTxDescription(
          i18n._(
            tradeApproveDescription({
              originToken,
              targetToken
            })
          )
        );
      } else if (
        flow === TradeFlow.TRADE &&
        action === TradeAction.TRADE &&
        screen === TradeScreen.TRANSACTION
      ) {
        setStep(2);
        setTxTitle(i18n._(tradeTitle[txStatus as keyof TxCardCopyText]));
        setTxSubtitle(
          i18n._(
            tradeSubtitle({
              txStatus,
              originToken,
              originAmount: formatBigInt(originAmount, {
                unit: originToken ? getTokenDecimals(originToken, chainId) : 18
              }),
              targetToken,
              targetAmount: formatBigInt(targetAmount, {
                unit: targetToken ? getTokenDecimals(targetToken, chainId) : 18
              })
            })
          )
        );
        setTxDescription(i18n._(tradeDescription({ originToken, targetToken, txStatus, executionPrice })));
        setLoadingText(i18n._(tradeLoadingButtonText({ txStatus })));
      }
    }
  }, [txStatus, flow, action, screen, i18n.locale, isEthFlow, ethFlowTxStatus, quoteData?.quoteSource]);
  // Determine the explorer name based on quote source
  const getExplorerDisplayName = () => {
    // If it's a NEAR Intents quote, show NEAR Intents Explorer
    if (quoteData?.quoteSource === QuoteSource.NEARINTENTS) {
      return ExplorerName.NEAR_INTENTS_EXPLORER;
    }

    // For CoW Protocol quotes, use the existing logic
    if (action === TradeAction.APPROVE || isL2) {
      return chainExplorerName;
    }

    if (
      isEthFlow &&
      (ethFlowTxStatus === EthFlowTxStatus.SENDING_ETH || ethFlowTxStatus === EthFlowTxStatus.CREATING_ORDER)
    ) {
      return chainExplorerName;
    }

    return ExplorerName.COW_EXPLORER;
  };

  return (
    <TransactionStatus
      explorerName={getExplorerDisplayName()}
      onExternalLinkClicked={onExternalLinkClicked}
      // Hide step indicator for NEAR Intents trades
      showStepIndicator={quoteData?.quoteSource !== QuoteSource.NEARINTENTS}
      transactionDetail={
        quoteData?.quoteSource === QuoteSource.NEARINTENTS && txStatus === TxStatus.INITIALIZED ? (
          <NearIntentsTransactionDetail />
        ) : null
      }
    />
  );
};
