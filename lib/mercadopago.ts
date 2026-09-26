import { MercadoPagoConfig, Payment } from "mercadopago";

const accessToken = process.env.MP_ACCESS_TOKEN;

if (!accessToken) {
  // Não derruba o build, mas vai falhar em runtime se a env var não estiver setada.
  console.warn("MP_ACCESS_TOKEN não configurado.");
}

export const mpClient = new MercadoPagoConfig({
  accessToken: accessToken || "",
});

export const mpPayment = new Payment(mpClient);

export function getRafflePrice(): number {
  return parseFloat(process.env.RAFFLE_PRICE || "10");
}

export function getTotalNumbers(): number {
  return parseInt(process.env.RAFFLE_TOTAL_NUMBERS || "1000", 10);
}

export function getReserveMinutes(): number {
  return parseInt(process.env.RESERVE_MINUTES || "15", 10);
}
