# MarlimPay

MarlimPay é uma API RESTful para gerenciamento de usuários e transações financeiras, com suporte a idempotência, validação de dados, autenticação simulada e integração com Firestore.

---

---

## 📦 Como rodar o projeto

1. Navegue até o diretório functions:

```bash
   cd functions
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

---

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

## 📚 Rotas Disponíveis

**_TODAS AS ROTAS SÃO AUTENTICADAS_** com `Bearer token`

- Autenticação mockada, use um dos seguintes token para testar localmente:
  - `user_token_01`
  - `user_token_02`
  - `user_token_03`
  - `user_token_04`
  - `user_token_05`
- **POST** `/users`
  - Cadastra um novo usuario
- **GET** `/users/{user_id}`
  - Busca um usuario pelo seu id
- **PUT** `/users/{user_id}`
  - Atualiza os dados do usuario (somente name e email)
- **GET** `/users/{user_id}/transactions`
  - Retorna todas as transações onde um usuario é `payer`ou `receiver`
- **POST** `/transactions/idempotency`
  - Rota responsável por criar o fluxo de idempotencia:
  - Usuario gera uma `Idempotency-Key` com status `active`, e cada usuario só pode ter uma chave `active`;
  - Caso o usuario tente gerar novamente uma nova chave ser usar a anterior e retornada a chave ativa que ele possui e não é criada outra;
  - Para criar uma transação deve ser enviado nos headers a `Idempotency-Key` gerada;
  - Apos a criação com sucesso de uma transação a chave utilizada é atualizada para status `finished` e o usuário pode solicitar outra
- **POST** `/transactions`
  - Rota com rate-limit usando `express-rate-limiter`:
  - Usuario pode fazer no maximo 5 transações por minuto;
  - Caso uma transação falhe ainda sim é considerado como uma tentativa válida
- **GET** `/transactions/{transaction_id}`
  - Retorna uma transation pelo seu id
- **POST** `/webhook`
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
