// Integração com a API de Orders do Mercado Pago (a que substitui a antiga API de Payments
// para novas aplicações "Checkout Transparente via Orders").
// Docs: https://www.mercadopago.com.br/developers/en/docs/checkout-api-orders/payment-integration/pix

function getAccessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    console.warn("MP_ACCESS_TOKEN não configurado.");
  }
  return token || "";
}

export function getRafflePrice(): number {
  return parseFloat(process.env.RAFFLE_PRICE || "10");
}

export function getTotalNumbers(): number {
  return parseInt(process.env.RAFFLE_TOTAL_NUMBERS || "1000", 10);
}

export function getReserveMinutes(): number {
  return parseInt(process.env.RESERVE_MINUTES || "15", 10);
}

type CreateOrderParams = {
  amount: number;
  description: string;
  payerEmail: string;
  externalReference: string;
};

type MpOrderPayment = {
  id: string;
  status: string;
  status_detail?: string;
  payment_method?: {
    id: string;
    type: string;
    qr_code?: string;
    qr_code_base64?: string;
    ticket_url?: string;
  };
};

export type MpOrder = {
  id: string;
  status: string;
  status_detail?: string;
  transactions?: {
    payments?: MpOrderPayment[];
  };
};

// Cria uma "order" com um pagamento PIX associado. Retorna o objeto completo da ordem,
// de onde tiramos o QR code e o id pra rastrear o pagamento.
export async function createMpOrder({
  amount,
  description,
  payerEmail,
  externalReference,
}: CreateOrderParams): Promise<MpOrder> {
  const res = await fetch("https://api.mercadopago.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
      "X-Idempotency-Key": externalReference,
    },
    body: JSON.stringify({
      type: "online",
      total_amount: amount.toFixed(2),
      external_reference: externalReference,
      description,
      processing_mode: "automatic",
      transactions: {
        payments: [
          {
            amount: amount.toFixed(2),
            payment_method: { id: "pix", type: "bank_transfer" },
          },
        ],
      },
      payer: { email: payerEmail },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.message || "Erro ao criar order no Mercado Pago");
    (err as any).mpResponse = data;
    throw err;
  }
  return data as MpOrder;
}

// Busca o status atual de uma order (usado pelo webhook para confirmar o status
// em vez de confiar cegamente no corpo da notificação).
export async function getMpOrder(orderId: string): Promise<MpOrder> {
  const res = await fetch(`https://api.mercadopago.com/v1/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Erro ao consultar order no Mercado Pago");
  }
  return data as MpOrder;
}
