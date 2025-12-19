import { z } from 'zod';

// Login form schema
export const loginSchema = z.object({
  username: z
    .string()
    .min(3, 'ユーザー名は3文字以上で入力してください')
    .max(50, 'ユーザー名は50文字以下で入力してください')
    .regex(/^[a-zA-Z0-9_-]+$/, 'ユーザー名は英数字、ハイフン、アンダースコアのみ使用できます'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(128, 'パスワードは128文字以下で入力してください'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// User profile schema
export const userSchema = z.object({
  username: z.string(),
  email: z.string().email().optional(),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  idToken: z.string().optional(),
});

export type UserData = z.infer<typeof userSchema>;

// Cognito config schema
export const cognitoConfigSchema = z.object({
  userPoolId: z.string().min(1, 'User Pool ID は必須です'),
  clientId: z.string().min(1, 'Client ID は必須です'),
  region: z.string().min(1, 'リージョンは必須です'),
});

export type CognitoConfigData = z.infer<typeof cognitoConfigSchema>;
