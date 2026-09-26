import { prisma } from "@/lib/prisma";
import RaffleClient from "@/components/RaffleClient";
import { getRafflePrice, getTotalNumbers } from "@/lib/mercadopago";

export const dynamic = "force-dynamic";

export default async function Home() {
  const numbers = await prisma.raffleNumber.findMany({
    orderBy: { id: "asc" },
    select: { id: true, status: true },
  });

  const price = getRafflePrice();
  const title = process.env.RAFFLE_TITLE || "Rifa Online";

  return (
    <RaffleClient
      initialNumbers={numbers}
      price={price}
      title={title}
      totalNumbers={getTotalNumbers()}
    />
  );
}
