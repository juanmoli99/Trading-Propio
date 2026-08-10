export interface StartupCheckResult {
  name: string;
  critical: boolean;
  success: boolean;
  reason?: string;
}
