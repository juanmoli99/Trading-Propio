export interface AuthenticatedPrincipal {
  id: string;
  username: string;
  displayName: string;
}

export const AUTHENTICATED_PRINCIPAL = Symbol('authenticated-principal');
