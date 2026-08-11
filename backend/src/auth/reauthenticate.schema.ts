import { z } from 'zod';

export const reauthenticateSchema = z.strictObject({
  password: z.string().min(1).max(256),
});

export type ReauthenticateInput = z.infer<typeof reauthenticateSchema>;
