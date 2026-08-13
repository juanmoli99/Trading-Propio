export interface CorporateActionNameChange {
  readonly id: string;
  readonly symbol: string;
  readonly processDate: Date;
  readonly oldSymbol: string;
  readonly newSymbol: string;
  readonly oldName: string | null;
  readonly newName: string | null;
  readonly symbolChanged: boolean;
  readonly nameChanged: boolean;
}

export interface CorporateActionNameChangeQuery {
  readonly symbol: string;
  readonly start?: string;
  readonly end?: string;
}

export interface CorporateActionNameChangeResult {
  readonly symbol: string;
  readonly changes: readonly CorporateActionNameChange[];
}