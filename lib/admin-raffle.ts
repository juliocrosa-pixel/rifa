import { parsePriceToCents } from "@/lib/format";
import { MAX_NUMBERS_PER_RAFFLE } from "@/lib/raffles";

export type RaffleInput = {
  title: string;
  prize: string;
  description: string;
  rules: string;
  priceCents: number;
  totalNumbers: number;
  drawDate: Date | null;
  drawMethod: string;
};

// Valida o formulário de rifa vindo do painel. Retorna os dados limpos ou uma mensagem de erro.
export function parseRaffleInput(body: any): { data?: RaffleInput; error?: string } {
  const title = String(body?.title || "").trim().slice(0, 120);
  const prize = String(body?.prize || "").trim().slice(0, 200);
  const description = String(body?.description || "").trim().slice(0, 5000);
  const rules = String(body?.rules || "").trim().slice(0, 10000);
  const drawMethod = String(body?.drawMethod || "").trim().slice(0, 300);
  const priceCents = parsePriceToCents(body?.price ?? "");
  const totalNumbers = parseInt(String(body?.totalNumbers || ""), 10);

  let drawDate: Date | null = null;
  if (body?.drawDate) {
    const d = new Date(String(body.drawDate));
    if (isNaN(d.getTime())) return { error: "Data do sorteio inválida." };
    drawDate = d;
  }

  if (title.length < 3) return { error: "Dê um nome para a rifa (mínimo 3 letras)." };
  if (!priceCents) return { error: "Preço inválido. Ex: 10,00" };
  if (!Number.isInteger(totalNumbers) || totalNumbers < 10 || totalNumbers > MAX_NUMBERS_PER_RAFFLE) {
    return { error: `Quantidade de números deve ser entre 10 e ${MAX_NUMBERS_PER_RAFFLE}.` };
  }

  return {
    data: { title, prize, description, rules, priceCents, totalNumbers, drawDate, drawMethod },
  };
}
