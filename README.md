# MarlimPay

MarlimPay é uma API RESTful para gerenciamento de usuários e transações financeiras, com suporte a idempotência, validação de dados, autenticação simulada e integração com Firestore.

---

## 📑 Índice

- <a href="https://marlimpay.web.app/docs/" target="_blank" rel="noopener noreferrer">📖 Documentação com swagger</a>

- [📦 Como rodar o projeto](#-como-rodar-o-projeto)
- [📁 Estrutura do Projeto](#-estrutura-do-projeto)
- [🔑 Idempotência](#-idempotência)
- [🚦 Rate Limit](#-rate-limit)
- [🗺️ Rotas Disponíveis](#-rotas-disponíveis)
- [🛠️ Funcionalidades](#-funcionalidades)
- [🚀 Tecnologias Utilizadas](#-tecnologias-utilizadas)

---

## 📦 Como rodar o projeto

O projeto pode ser testado diretamente do firebase através da url:

- ```
   https://us-central1-marlimpay.cloudfunctions.net/api
  ```

  ou localmente:

1. Navegue até o diretório functions:

   ```bash
    cd ./functions
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Rode a aplicação:

   ```bash
   npm run start:dev
   ```

4. Execute os testes:
   ```bash
   npm run test
   ```
5. Suba a documentação do swagge
   ```bash
   npm run start:docs
   ```

---

## 📁 Estrutura do Projeto

```
src/
│
├── errors/                # Classes e utilitários para tratamento de erros
│
├── handlers/              # Controllers/Handlers das rotas (Users, Transactions, Webhook)
│   └── tests/             # Testes dos handlers
│
├── logger/                # Configuração e instâncias do logger (Pino)
│
├── middlewares/           # Middlewares globais (auth, errorHandler, notFound, rateLimiter)
│
├── repositories/          # Repositórios de acesso ao Firestore
│   ├── Contracts/         # Interfaces dos repositórios
│
├── routes/                # Definição das rotas Express (Users, Transactions, Webhook)
│
├── schemas/               # Schemas de validação (Zod) e tipagens DTO
│   └── tests/             # Testes dos schemas
│
├── server/                # Inicialização do servidor Express e DI (tsyringe)
│
├── services/              # Regras de negócio (UserService, TransactionService, WebhookService)
│   └── tests/             # Testes dos services
│
└── index.ts               # Entry point da aplicação
```

## 🔑 Idempotência

A API MarlimPay implementa um mecanismo de idempotência para garantir que operações críticas, como a criação de transações, não sejam executadas múltiplas vezes acidentalmente.

### Como funciona

- Cada usuário pode gerar uma única chave de idempotência (`Idempotency-Key`) com status `active`.
- Se o usuário tentar gerar uma nova chave sem utilizar a anterior, a chave ativa existente será retornada — não é criada uma nova chave até que a anterior seja utilizada.
- Para criar uma transação, é obrigatório enviar a `Idempotency-Key` no header da requisição.
- Após a criação bem-sucedida de uma transação, a chave utilizada tem seu status atualizado para `finished`, permitindo que o usuário gere uma nova chave para futuras operações.
- Para gerar uma chave o usuário deve fazer uma requisição autenticada com algum dos tokens validos logo abaixo para

  ```bash
  POST: /transactions/idempotency
  ```

**Resumo do fluxo:**

1. Usuário solicita uma chave de idempotência (`POST: /transactions/idempotency`) → recebe uma chave `active`.
2. Usuário pode usar essa chave para criar uma transação.
3. Se tentar gerar outra chave sem usar a anterior, recebe a mesma chave `active`.
4. Após criar a transação, a chave é marcada como `finished`.
5. Agora, o usuário pode solicitar e receber uma nova chave de idempotência.

---

## 🚦 Rate Limit

A API MarlimPay utiliza um mecanismo de rate limiting para proteger o sistema contra abusos e garantir a estabilidade dos serviços.

### Como funciona

- A rota de criação de transações possui um limite de até **5 transações por minuto** por usuário.
- O controle é feito utilizando o middleware `express-rate-limit`.
- **Toda tentativa de criar uma transação conta para o limite**, independentemente de a transação ser bem-sucedida ou falhar.

**Resumo do fluxo:**

1. O usuário pode tentar criar até 5 transações em um intervalo de 1 minuto.
2. Se exceder esse limite, novas tentativas serão bloqueadas temporariamente.
3. Tentativas que resultam em erro também são contabilizadas no limite.

---

## 🗺️ Rotas Disponíveis

**_TODAS AS ROTAS SÃO AUTENTICADAS_** com `Bearer token`

- Autenticação mockada, use um dos seguintes token para testar localmente:
  - `user_token_01`
  - `user_token_02`
  - `user_token_03`
  - `user_token_04`
  - `user_token_05`
- **POST** `/users`
  - Cadastra um novo usuario
  - BODY:
  ```bash
  {
   "name": "string",
   "email": "string",
   "balance": "number positivo"
  }
  ```
- **GET** `/users/{user_id}`
  - Busca um usuario pelo seu id
- **PUT** `/users/{user_id}`
  - Atualiza os dados do usuario (somente name e email)
  - BODY:
  ```bash
   {
    "name": "string",
    "email": "string",
   }
  ```
- **GET** `/users/{user_id}/transactions`
  - Retorna todas as transações onde um usuario é `payer`ou `receiver`
- **POST** `/transactions/idempotency`
  - Rota responsável por criar e retornar o token de idempotencia;
- **POST** `/transactions`
  - Cria uma nova transação
  - BODY esperado:
  ```bash
   {
    "payer_id": "string",
    "receiver_id": "string",
    "amount": "number positivo"
   }
  ```
- **GET** `/transactions/{transaction_id}`
  - Retorna uma transation pelo seu id
- **POST** `/webhook/payment-gateway`
  - BODY esperado:
  ```bash
  {
   "transaction_id": "string",
   "status": "approved" | "failed"
  }
  ```
  - Atualiza o status de uma transação para `sucess`ou `failed`
  - Caso o status seja `failed` o valor e devolvido ao pagador
  - Logs salvos no `firestore`

## 🛠️ Funcionalidades

- Cadastro, atualização e consulta de usuários
- Criação e consulta de transações financeiras entre usuários
- Suporte a idempotência para transações
- Webhook para atualização de status de transações
- Validação de dados com Zod
- Middleware de autenticação (mock)
- Tratamento global de erros e logs estruturados
- Testes automatizados (unitários e integração)

## 🚀 Tecnologias Utilizadas

- **Node.js**
- **TypeScript**
- **Express**
- **Firebase Admin SDK**
- **Firebase Functions**
- **Zod** (validação de schemas)
- **tsyringe** (Injeção de dependência)
- **Pino** (logger)
- **express-rate-limit** (rate limiting)
- **Jest** (testes unitários e de integração)
- **supertest** (testes de rotas HTTP)
