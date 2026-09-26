// Integração com a API de Orders do Mercado Pago (PIX).
// Docs: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/pix

function getAccessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) console.warn("MP_ACCESS_TOKEN não configurado.");
  return token || "";
}

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
  external_reference?: string;
  transactions?: { payments?: MpOrderPayment[] };
};

type CreateOrderParams = {
  amountCents: number;
  description: string;
  payerEmail: string;
  externalReference: string;
  expirationMinutes: number;
};

// Cria uma "order" com um pagamento PIX. O PIX vence em expirationMinutes (mínimo 30 no Mercado Pago).
export async function createMpOrder(p: CreateOrderParams): Promise<MpOrder> {
  const amount = (p.amountCents / 100).toFixed(2);
  const res = await fetch("https://api.mercadopago.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
      "X-Idempotency-Key": p.externalReference,
    },
    body: JSON.stringify({
      type: "online",
      total_amount: amount,
      external_reference: p.externalReference,
      description: p.description.slice(0, 250),
      processing_mode: "automatic",
      transactions: {
        payments: [
          {
            amount,
            payment_method: { id: "pix", type: "bank_transfer" },
            expiration_time: `PT${p.expirationMinutes}M`,
          },
        ],
      },
      payer: { email: p.payerEmail },
    }),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || "Erro ao criar order no Mercado Pago");
    (err as any).mpResponse = data;
    throw err;
  }
  return data as MpOrder;
}

export async function getMpOrder(orderId: string): Promise<MpOrder> {
  const res = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || "Erro ao consultar order no Mercado Pago");
  }
  return data as MpOrder;
}

// Cancela um PIX que não vai mais ser usado (ex: deu erro depois de criar). Falha silenciosa.
export async function cancelMpOrder(orderId: string): Promise<void> {
  try {
    await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
        "X-Idempotency-Key": `cancel-${orderId}`,
      },
      cache: "no-store",
    });
  } catch (e) {
    console.error("Não consegui cancelar a order", orderId, e);
  }
}

export function isOrderPaid(order: MpOrder): boolean {
  return order.status === "processed";
}

export function isOrderDead(order: MpOrder): boolean {
  return ["canceled", "cancelled", "expired", "failed", "refunded"].includes(order.status);
}
