import { getPrisma } from "../src/prisma.js";

async function main() {
  const prisma = getPrisma();
  const categories = ["Account and Access", "Hardware", "Software", "Network"];
  const relatedSystems = [
    "Student Portal",
    "Learning Management System",
    "Campus Wi-Fi",
    "University Email",
    "Library System",
    "Finance and Registration",
  ];
  const requesters = [
    { name: "Anan Student", email: "anan.student@example.test", active: true },
    { name: "Mali Student", email: "mali.student@example.test", active: true },
    { name: "Niran Student", email: "niran.student@example.test", active: true },
    { name: "Ploy Student", email: "ploy.student@example.test", active: true },
    {
      name: "Somchai Former Student",
      email: "somchai.former@example.test",
      active: false,
    },
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: { active: true },
      create: { name, active: true },
    });
  }

  for (const name of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: { active: true },
      create: { name, active: true },
    });
  }

  for (const requester of requesters) {
    await prisma.requesterUser.upsert({
      where: { email: requester.email },
      update: { name: requester.name, active: requester.active },
      create: requester,
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
