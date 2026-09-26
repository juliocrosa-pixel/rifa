// Popula a tabela RaffleNumber com os números da rifa (1 até RAFFLE_TOTAL_NUMBERS).
// Rode com: npm run db:seed
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const total = parseInt(process.env.RAFFLE_TOTAL_NUMBERS || "1000", 10);

  const existing = await prisma.raffleNumber.count();
  if (existing > 0) {
    console.log(`Já existem ${existing} números no banco. Nada foi criado.`);
    return;
  }

  const data = Array.from({ length: total }, (_, i) => ({ id: i + 1 }));

  // createMany em lotes de 500 pra não estourar limite de alguns provedores
  const chunkSize = 500;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await prisma.raffleNumber.createMany({ data: chunk });
  }

  console.log(`Criados ${total} números (1 a ${total}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
