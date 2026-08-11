export interface AlpacaFillActivity {
  readonly id: string;
  readonly activityType: 'FILL';
  readonly orderId: string;
  readonly symbol: string;
  readonly side: string;
  readonly type: string;

  readonly quantity: string;
  readonly price: string;
  readonly cumulativeQuantity: string;
  readonly leavesQuantity: string;

  readonly transactionTime: Date;
}
