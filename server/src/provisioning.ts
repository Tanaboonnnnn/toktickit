import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "./password.js";

export interface InitialCredential {
  email: string;
  password: string;
}

export interface ProvisioningOptions {
  generatePassword?: () => string;
  onCredential?: (credential: InitialCredential) => void;
}

export function generateInitialPassword(): string {
  return randomBytes(18).toString("base64url");
}

export async function provisionMigratedRequesters(
  prisma: PrismaClient,
  options: ProvisioningOptions = {},
): Promise<number> {
  const generatePassword = options.generatePassword ?? generateInitialPassword;
  const onCredential = options.onCredential ?? (() => undefined);
  const users = await prisma.user.findMany({
    where: { role: "REQUESTER", passwordHash: null },
    orderBy: { id: "asc" },
    select: { id: true, email: true },
  });

  let provisioned = 0;
  for (const user of users) {
    const password = generatePassword();
    const passwordHash = await hashPassword(password);
    const result = await prisma.user.updateMany({
      where: { id: user.id, role: "REQUESTER", passwordHash: null },
      data: { passwordHash, mustChangePassword: true },
    });
    if (result.count === 1) {
      provisioned += 1;
      onCredential({ email: user.email, password });
    }
  }
  return provisioned;
}
