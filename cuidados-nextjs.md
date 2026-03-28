# CLAUDE.md

## Projeto

CRM construído com Next.js 16, deployado na Vercel.

## Stack

- **Framework**: Next.js 16 (App Router)
- **Bundler**: Turbopack (padrão no Next.js 16)
- **Deploy**: Vercel
- **Runtime**: Node.js >= 20.9.0

## Regras obrigatórias do Next.js 16

### Async params e searchParams

Acesso síncrono a `params` e `searchParams` foi REMOVIDO. Sempre usar `await`:

```tsx
// CORRETO
export default async function Page(props: PageProps<'/clientes/[id]'>) {
  const { id } = await props.params
  const query = await props.searchParams
}

// ERRADO — vai quebrar
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params // ❌ não funciona mais
}
```

### proxy.ts (antigo middleware.ts)

- O arquivo `middleware.ts` foi substituído por `proxy.ts`
- A função exportada deve se chamar `proxy`, não `middleware`
- O runtime é sempre Node.js (Edge runtime NÃO é suportado em proxy.ts)
- Se precisar de Edge runtime, manter `middleware.ts` até orientação oficial

```ts
// proxy.ts
export function proxy(request: NextRequest) {
  // lógica de autenticação, redirecionamento, etc.
}
```

### Caching explícito

- No Next.js 16, NADA é cacheado por padrão — tudo é dinâmico
- Use `use cache` e Cache Components para opt-in de cache onde fizer sentido
- A flag `experimental.ppr` foi removida; usar configuração de Cache Components
- `revalidateTag()` agora exige um perfil `cacheLife` como segundo argumento

### React Compiler

- Suporte estável no Next.js 16
- Habilitar com `reactCompiler: true` no `next.config.ts`
- Aumenta tempo de build mas reduz re-renders automaticamente
- Não usar `React.memo()`, `useMemo()` ou `useCallback()` manualmente quando o compiler estiver habilitado — ele faz isso automaticamente

## Convenções do projeto

### Estrutura de pastas

```
src/
├── app/
│   ├── (auth)/           # rotas públicas (login, registro)
│   ├── (dashboard)/      # rotas protegidas do CRM
│   │   ├── clientes/
│   │   ├── deals/
│   │   ├── atividades/
│   │   └── relatorios/
│   ├── api/              # route handlers
│   └── layout.tsx
├── components/
│   ├── ui/               # componentes base (button, input, etc.)
│   └── modules/          # componentes de domínio (ClienteCard, DealKanban, etc.)
├── lib/                  # utilitários, clients de banco, helpers
├── hooks/                # custom hooks
└── types/                # tipos TypeScript
```

### Nomenclatura

- Arquivos de componente: PascalCase (`ClienteForm.tsx`)
- Arquivos utilitários: camelCase (`formatCurrency.ts`)
- Rotas e pastas do App Router: kebab-case
- Tipos/interfaces: prefixo descritivo, sem `I` (`ClienteFormProps`, não `IClienteFormProps`)

### Padrões de código

- TypeScript strict mode — nunca usar `any`
- Server Components por padrão; usar `'use client'` somente quando necessário (interatividade, hooks de browser)
- Validação de dados com Zod nos route handlers e formulários
- Tratar erros com `error.tsx` em cada segmento de rota relevante
- Loading states com `loading.tsx` ou `<Suspense>` em cada página

## Cuidados com a Vercel

### Limites

- Serverless Functions: timeout de 10s (free) ou 60s (Pro)
- Não fazer operações pesadas em route handlers (importação em massa, relatórios grandes)
- Usar filas/background jobs para tarefas longas
- Payload máximo de request/response: 4.5MB (free/Pro)

### Variáveis de ambiente

- Configurar em TODOS os ambientes (Production, Preview, Development)
- Variáveis com prefixo `NEXT_PUBLIC_` são expostas ao client — NUNCA colocar secrets com esse prefixo
- Banco de dados, API keys, secrets: sem prefixo `NEXT_PUBLIC_`

### Deploy

- Branch `main` → produção
- Pull requests geram preview deployments automaticamente
- Sempre testar no preview antes de mergear
- Monitorar performance após cada deploy (latência, cold starts)

### Região

- Configurar Serverless Functions na região mais próxima do Brasil (GRU — São Paulo, se disponível)
- Banco de dados deve estar na mesma região para minimizar latência

## Segurança

- Manter Next.js atualizado (>= 16.1) — CVEs críticas de RCE foram corrigidas na 16.1
- Nunca expor connection strings ou secrets no client
- Validar e sanitizar TODA entrada do usuário (params, searchParams, body)
- Usar CSRF protection em mutações
- Autenticação deve ser verificada tanto no proxy.ts quanto nos route handlers
- Rate limiting nas API routes públicas

## Comandos

```bash
npm run dev          # servidor de desenvolvimento (Turbopack)
npm run build        # build de produção
npm run start        # servir build local
npm run lint         # linting
npm run type-check   # verificação de tipos
```

## O que NÃO fazer

- NÃO usar `getServerSideProps` ou `getStaticProps` (são do Pages Router)
- NÃO acessar `params`/`searchParams` de forma síncrona
- NÃO usar Edge runtime no `proxy.ts`
- NÃO colocar lógica de negócio pesada em Serverless Functions (usar serviços externos)
- NÃO ignorar erros de TypeScript para "resolver depois"
- NÃO fazer fetch para a própria API (`/api/...`) dentro de Server Components — acessar o banco/serviço diretamente
- NÃO usar `localStorage`/`sessionStorage` em Server Components