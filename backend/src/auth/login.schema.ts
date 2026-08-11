import { z } from 'zod';

const usernameSchema = z
  .string()
  .trim()
  .normalize()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9._-]+$/, 'Username contains unsupported characters');

export const loginSchema = z.strictObject({
  username: usernameSchema,
  password: z.string().min(1).max(256),
});

export type LoginInput = z.infer<typeof loginSchema>;
