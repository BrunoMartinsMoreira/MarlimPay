import { z } from 'zod';

export const createUserSchema = z.object({
  name: z
    .string({ required_error: 'Nome é obrigatório' })
    .min(1, 'Nome é obrigatório'),
  email: z
    .string({ required_error: 'Email é obrigatório' })
    .email('Email deve ser um email válido'),
  balance: z
    .number({ required_error: 'Balance é obrigatório' })
    .positive('Balance deve ser maior que zero'),
});

export const updateUserSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email deve ser um email válido'),
});

export const userParamsSchema = z.object({
  user_id: z.string().min(1, 'user_id é um parametro obrigatorio'),
});

export type CreateUserDTO = z.infer<typeof createUserSchema>;
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;
export type User = CreateUserDTO & { user_id: string };
