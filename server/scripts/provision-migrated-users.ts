import { getPrisma } from "../src/prisma.js";
import { provisionMigratedRequesters } from "../src/provisioning.js";

async function main(): Promise<void> {
  const prisma = getPrisma();
  const count = await provisionMigratedRequesters(prisma, {
    onCredential: ({ email, password }) => {
      console.log(`[local-only initial credential] ${email} ${password}`);
    },
  });
  console.log(`Provisioned ${count} migrated Requester account(s).`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Unable to provision migrated Requesters");
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
