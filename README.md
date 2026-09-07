# IC. Resende — Relatório de Celebrações

Frontend em Nuxt/Vue. Backend completo no Supabase (schema.sql + Edge Function api).

## Configuração
1. Rode `schema.sql` no SQL Editor do Supabase.
2. Publique a Edge Function `api` com o conteúdo de `api.index.ts`.
3. Crie um usuário em Authentication > Users e adicione o mesmo `id` na tabela `admins`.
4. Copie `.env.example` para `.env` e preencha com os dados do seu projeto Supabase.
5. No GitHub Pages/Netlify/Vercel, configure as mesmas variáveis de ambiente.

## Rotas
- `/` — formulário público (sem login)
- `/admin` — painel administrativo (login obrigatório)
