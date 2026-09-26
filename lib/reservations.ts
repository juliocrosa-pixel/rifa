import { prisma } from "@/lib/prisma";
import { getReserveMinutes } from "@/lib/mercadopago";

// Margem extra depois do vencimento do PIX, pra dar tempo de um pagamento feito
// no último minuto chegar pelo webhook antes de o número ser liberado.
const GRACE_MINUTES = 2;

// Libera (volta pra "available") os números reservados cujo PIX já venceu.
// É chamada sempre que alguém abre o site, atualiza a lista, tenta comprar
// ou consulta o status — então a liberação acontece na hora, sem depender do cron.
export async function releaseExpiredReservations(): Promise<number> {
  const minutes = getReserveMinutes() + GRACE_MINUTES;
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);

  const result = await prisma.raffleNumber.updateMany({
    where: {
      status: "reserved",
      reservedAt: { lt: cutoff },
    },
    data: {
      status: "available",
      buyerName: null,
      buyerPhone: null,
      buyerEmail: null,
      paymentId: null,
      reservedAt: null,
    },
  });

  return result.count;
}
