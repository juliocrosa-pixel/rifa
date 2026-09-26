# Rifa Online

Site de rifa com grid de números, pagamento via PIX automático (Mercado Pago) e painel admin.

## O que o site faz

- Página pública com grid de números (1 a `RAFFLE_TOTAL_NUMBERS`), coloridos por status: disponível, reservado, vendido.
- Cliente seleciona números, preenche nome/WhatsApp/e-mail e gera um PIX automaticamente.
- Enquanto o PIX não é pago, os números ficam "reservados" por `RESERVE_MINUTES` minutos (padrão e mínimo 30, que é a validade mínima do PIX no Mercado Pago). Se não pagar, voltam a ficar disponíveis sozinhos assim que o tempo acaba, e a página se atualiza a cada 15 segundos.
- Quando o Mercado Pago confirma o pagamento (webhook), os números passam pra "vendido" automaticamente.
- Painel `/admin` (login/senha) mostra o resumo, lista todos os números, permite marcar como vendido/disponível manualmente (ex: venda no dinheiro) e exportar CSV.
- `/api/setup` cria a tabela do banco e popula os números direto pelo navegador — não precisa instalar nada no computador.

## Passo a passo completo (do zero, sem usar terminal)

### 1. Crie uma conta no GitHub

Vá em https://github.com e crie uma conta gratuita, se ainda não tiver.

### 2. Suba o código pro GitHub (pelo site, sem git)

1. No GitHub, clique em **New repository** (botão verde "New" na tela inicial).
2. Dê um nome, ex: `minha-rifa`, marque como **Private** (recomendado) e clique em **Create repository**.
3. Na página do repositório recém-criado, clique em **"uploading an existing file"** (ou **Add file → Upload files**).
4. No seu computador, **extraia o zip** `rifa-app.zip` que te enviei numa pasta.
5. Arraste **todo o conteúdo de dentro da pasta** `rifa-app` (não a pasta em si, o conteúdo dela: `app`, `components`, `lib`, `package.json`, etc.) pra área de upload do GitHub.
6. Role até embaixo, escreva uma mensagem tipo "primeira versão" e clique em **Commit changes**.

### 3. Crie uma conta no Mercado Pago Developers

1. Entre com sua conta Mercado Pago em https://www.mercadopago.com.br/developers/panel/app
2. Clique em **Criar aplicação** (nome qualquer, ex: "Rifa").
3. Dentro da aplicação, vá em **Credenciais de teste** e copie o **Access Token de teste** (começa com `TEST-`). Vamos usar ele primeiro pra testar sem dinheiro de verdade.
4. Depois que tudo estiver funcionando, você troca pelo **Access Token de produção** (nas "Credenciais de produção" da mesma aplicação) pra rifa valer de verdade.

### 4. Crie uma conta na Vercel e importe o projeto

1. Vá em https://vercel.com e clique em **Sign Up**, escolhendo **Continue with GitHub** (assim ela já enxerga seus repositórios).
2. No painel da Vercel, clique em **Add New → Project**.
3. Encontre o repositório `minha-rifa` que você criou e clique em **Import**.
4. Na tela de configuração, **antes de clicar em Deploy**, abra a seção **Environment Variables** e adicione (uma por linha, nome e valor):

   | Nome | Valor |
   |---|---|
   | `MP_ACCESS_TOKEN` | o Access Token de teste do Mercado Pago |
   | `RAFFLE_TITLE` | ex: `Rifa Beneficente` |
   | `RAFFLE_PRICE` | ex: `10` |
   | `RAFFLE_TOTAL_NUMBERS` | `1000` |
   | `RESERVE_MINUTES` | `30` |
   | `ADMIN_USER` | um usuário à sua escolha |
   | `ADMIN_PASSWORD` | uma senha forte à sua escolha |
   | `ADMIN_SECRET` | uma string longa e aleatória qualquer (só precisa ser difícil de adivinhar) |
   | `CRON_SECRET` | outra string longa e aleatória |
   | `SETUP_SECRET` | outra string longa e aleatória |

   (`DATABASE_URL`, `DIRECT_URL` e `BASE_URL` a gente completa no próximo passo — pode deixar sem por enquanto ou clicar em Deploy que vai falhar mesmo, tudo bem.)

5. Clique em **Deploy**. Não tem problema se esse primeiro deploy der erro — ainda falta o banco de dados.

### 5. Crie o banco de dados (Postgres) na Vercel

1. Dentro do seu projeto na Vercel, vá na aba **Storage** → **Create Database** → escolha **Postgres** (Neon) → **Create**.
2. Depois de criado, a Vercel pergunta em quais ambientes conectar — deixe marcado **Production** (e Preview/Development se quiser) e confirme. Isso já adiciona automaticamente as variáveis do banco (`DATABASE_URL`, `DIRECT_URL` ou `POSTGRES_URL`/`POSTGRES_URL_NON_POOLING`) nas Environment Variables do projeto.
3. Se a Vercel criou com nomes diferentes (`POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`), vá em **Settings → Environment Variables** e crie mais duas variáveis `DATABASE_URL` e `DIRECT_URL` copiando os mesmos valores.

### 6. Preencha o BASE_URL e refaça o deploy

1. Vá em **Settings → Domains** e copie a URL do seu site (ex: `https://minha-rifa.vercel.app`).
2. Em **Settings → Environment Variables**, adicione `BASE_URL` com essa URL.
3. Vá na aba **Deployments**, abra os "⋯" do último deploy e clique em **Redeploy** (assim ele já sobe com todas as variáveis certas).

### 7. Crie a tabela e os números (pelo navegador)

Depois que o redeploy terminar (fica verde), acesse no navegador:

```
https://SEU-SITE.vercel.app/api/setup?secret=O_VALOR_QUE_VOCE_POS_EM_SETUP_SECRET
```

Deve aparecer algo como `{"ok":true,"steps":[...]}`. Pronto, o banco está criado e populado. Você pode acessar esse link de novo a qualquer momento sem medo — ele não duplica nada.

### 8. Cadastre o webhook no Mercado Pago

1. Volte em https://www.mercadopago.com.br/developers/panel/app, entre na sua aplicação.
2. Vá em **Webhooks** → **Configurar notificações**.
3. Cole a URL: `https://SEU-SITE.vercel.app/api/webhook/mercadopago`
4. Marque o evento **Pagamentos**.

### 9. Teste tudo

1. Acesse `https://SEU-SITE.vercel.app`, selecione um número, preencha os dados e gere o PIX (ainda com o Access Token de **teste**, o pagamento não é de verdade — o Mercado Pago tem usuários de teste pra simular pagamento, ou você pode simplesmente marcar manualmente pelo painel admin).
2. Acesse `https://SEU-SITE.vercel.app/admin`, entre com o `ADMIN_USER`/`ADMIN_PASSWORD` e confira o painel.
3. Quando estiver tudo certo, troque `MP_ACCESS_TOKEN` pelo **Access Token de produção**, salve e clique em **Redeploy** de novo. Aí sim os pagamentos passam a ser reais.

## Resumo do que você precisa ter em mãos

- Conta GitHub
- Conta Vercel (pode entrar com o GitHub)
- Conta Mercado Pago com aplicação criada (Access Token)
- Um usuário/senha pro painel admin (escolhidos por você)

## Observações importantes

- O cron que libera números reservados expirados (`vercel.json`) já ativa sozinho no deploy.
- O `RAFFLE_PRICE` e o `RAFFLE_TOTAL_NUMBERS` só afetam o cálculo de preço e o texto da página — os números em si só são criados uma vez, no `/api/setup`.
- Se quiser mudar a quantidade de números depois de já ter rodado o setup, vai precisar ajustar o banco manualmente.
- Guarde `ADMIN_PASSWORD`, `ADMIN_SECRET`, `CRON_SECRET` e `SETUP_SECRET` em local seguro.

## Alternativa: rodando localmente com terminal (opcional, pra quem já programa)

```bash
npm install
cp .env.example .env
# edite o .env com suas credenciais
npm run db:push
npm run db:seed
npm run dev
```
