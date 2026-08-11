export interface AlpacaClock {
  readonly timestamp: Date;
  readonly isOpen: boolean;
  readonly nextOpen: Date;
  readonly nextClose: Date;
}
