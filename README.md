# 🛡️ Nonhande: Linguística, Gamificação & Inteligência Artificial
> **Arquitetura de Preservação e Ensino da Língua Nhaneca-Humbe via NLP e Gamificação Contextual.**

A Nonhande não é apenas uma aplicação de línguas; é um ecossistema de inteligência linguística projetado para digitalizar, preservar e ensinar línguas ancestrais angolanas. O sistema utiliza uma arquitetura escalável preparada para comercialização de APIs (B2B) e ensino personalizado (B2C).

---

## 🏗️ Arquitetura do Sistema

A aplicação está construída sobre uma infraestrutura moderna, separando a lógica de negócio da camada de inteligência artificial, permitindo escalabilidade horizontal.



### 1. Camada de Dados (Persistence Layer)
Utilizamos **MongoDB** com **Prisma ORM** para suportar a natureza flexível e extensível dos dados linguísticos.
* **User Engine**: Gere o estado global do aluno (XP, Streak, Hearts).
* **Curriculum Engine**: Estrutura de grafos para `Level -> Unit -> Lesson -> Activity`.
* **Dictionary Engine**: Acervo lexical com metadados culturais, fonéticos e relacionamentos semânticos entre exemplos.

### 2. Metodologia Pedagógica: Teoria-Prática
O motor de jogo foi reestruturado para evitar a "aprendizagem por tentativa e erro".
1.  **Exposição (THEORY)**: Blocos de conteúdo explicativo (Markdown/Imagens/Áudio) que não penalizam o utilizador.
2.  **Desafio (CHALLENGE)**: Testes de validação (Múltipla escolha, tradução, ordenação).
3.  **Reforço Visual**: Suporte a atividades de comparação de imagens (Certa vs Errada) com integração direta via **Supabase Storage**.

---

## 👥 Modelo de Governança e Roles (RBAC)

O sistema implementa um controlo de acesso baseado em funções (Role-Based Access Control) para garantir a integridade dos dados.

| Role | Escopo de Atuação | Funcionalidades Chave |
| :--- | :--- | :--- |
| **ADMIN** | Infraestrutura & Negócio | Monitorização de Quotas, Gestão de API Keys Enterprise, Logs de Erro. |
| **TEACHER** | Curadoria de Conteúdo | Upload de mídias para Supabase, Gestão do Dicionário, Criação de Atividades. |
| **STUDENT** | Utilizador Final | Progressão no mapa, Pesquisa no Dicionário, Consumo de Conteúdo. |

---

## 💰 Estratégia Comercial (Tiering & Monetização)

O backend utiliza middlewares de validação para aplicar restrições de uso conforme o plano do utilizador:

### 🥉 Freemium (MVP)
* Acesso aos Módulos introdutórios (até Módulo 1).
* **Quota de Dicionário**: Máximo de 10 pesquisas diárias.
* **Mídia**: Acesso limitado a 2 audições de áudio/dia.

### 🥈 Premium (B2C)
* Acesso ilimitado a todos os Módulos (incluindo Módulo 2 com IA de Voz).
* Ferramentas de Voz: Integração com **Whisper** para análise de pronúncia.
* Dicionário sem restrições e offline-ready.

### 🥇 Enterprise (B2B / API)
* **API Commercial Access**: Endpoints para integração em sistemas de terceiros.
* **Doc Generation**: Geração de documentos oficiais e entrepasses via **LlamaIndex** e **Hugging Face**.
* **Custom Models**: Acesso a modelos de Chatbot treinados em corpora específicos da região.

---

## 🛠️ Stack Tecnológica & IA

* **Runtime**: Node.js / Next.js (Serverless Functions).
* **Database**: MongoDB (via Prisma).
* **Storage**: Supabase Storage (Mídias auditadas).
* **AI Engine (Fase 2)**:
    * **Whisper**: Processamento de áudio em tempo real para o Módulo 2.
    * **LlamaIndex**: Indexação de conhecimento para RAG (Retrieval-Augmented Generation).
    * **Hugging Face**: Modelos de tradução e sumarização.

---

## 📂 Estrutura de Pastas (Clean Architecture)

```bash
├── prisma/                 # Schema, enums e definições de banco de dados
├── src/
│   ├── api/
│   │   ├── middleware/     # Guardas de Autenticação e Rate-Limiting (Quotas)
│   │   ├── controllers/    # Lógica de Gamificação (XP, Hearts update)
│   │   └── services/       # Integrações (Supabase, Whisper, LLMs)
│   ├── modules/
│   │   ├── dictionary/     # Lógica de pesquisa e hiperlinks de exemplos
│   │   ├── gamification/   # Motor de progresso Teoria-Desafio
│   │   └── ai-hub/         # Conexão com LlamaIndex e Hugging Face
│   └── lib/
│       ├── prisma.ts       # Singleton do Prisma Client
│       └── supabase.ts     # SDK para Upload Direto (Teacher Role)
└── README.md
