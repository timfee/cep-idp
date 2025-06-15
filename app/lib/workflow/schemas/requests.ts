import { z } from "zod";

export const CreateUserBodySchema = z.object({
  primaryEmail: z.string().email(),
  name: z.object({
    givenName: z.string(),
    familyName: z.string()
  }),
  password: z.string().min(8),
  orgUnitPath: z.string().optional()
});

export type CreateUserBody = z.infer<typeof CreateUserBodySchema>;
