# Rifa Online — várias rifas

Site de rifas com PIX automático (Mercado Pago), painel admin para criar/gerenciar rifas e página pública bonita.

## O que tem

**Site (público)**
- Página da rifa ativa: fotos do prêmio, descrição, preço, barra de progresso, data do sorteio com contagem regressiva, "como funciona", regulamento.
- Grade de números com busca, filtro "só disponíveis" e botões de escolha aleatória (+1, +5, +10).
- Compra com PIX: números ficam reservados por 30 min (validade mínima do PIX no Mercado Pago), com contagem regressiva. Se não pagar, os números voltam sozinhos.
- Confirmação automática (webhook + consulta direta ao Mercado Pago como garantia).
- Depois de pagar: botão "Salvar no meu WhatsApp" com os números.
- `/meus-numeros`: comprador consulta os números pelo WhatsApp ou e-mail.
- `/ganhadores`: histórico de rifas sorteadas.
- A página se atualiza sozinha a cada 15 segundos.

**Painel `/admin`**
- Criar rifa (nome, prêmio, descrição, preço, quantidade de números, data e forma do sorteio, regulamento).
- Enviar fotos (reduzidas automaticamente, guardadas no banco).
- Colocar à venda / pausar (só uma rifa à venda por vez).
- Ver compradores, buscar, vender manualmente (dinheiro), liberar número, baixar planilha.
- Encerrar a rifa informando o número sorteado.
- Configurar nome do site, WhatsApp e Instagram de contato.

## Variáveis de ambiente (Vercel)

| Nome | Para quê |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Banco Postgres (Neon) |
| `MP_ACCESS_TOKEN` | Access Token do Mercado Pago (produção começa com `APP_USR-`) |
| `ADMIN_USER`, `ADMIN_PASSWORD` | Login do painel |
| `ADMIN_SECRET` | Texto longo aleatório (protege o login) |
| `SETUP_SECRET` | Texto aleatório pra rodar o `/api/setup` |
| `CRON_SECRET` | Texto aleatório (protege a limpeza diária) |
| `RESERVE_MINUTES` | Opcional. Minutos pra pagar (mínimo e padrão: 30) |

`RAFFLE_TITLE`, `RAFFLE_PRICE` e `RAFFLE_TOTAL_NUMBERS` não são mais usados (só na migração da primeira rifa). Agora tudo é configurado pelo painel.

## Depois de cada atualização grande

Abra uma vez: `https://SEU-SITE.vercel.app/api/setup?secret=SEU_SETUP_SECRET`

Ele cria as tabelas que faltarem. Na primeira vez, traz a rifa antiga para o sistema novo. Pode abrir de novo sem medo.

## Webhook do Mercado Pago

URL: `https://SEU-SITE.vercel.app/api/webhook/mercadopago` — evento **Order (Mercado Pago)**, no modo de produção.
