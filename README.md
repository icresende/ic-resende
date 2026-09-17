# IC. Resende — Sistema

Frontend em Nuxt/Vue. Backend completo no Supabase (schema.sql + Edge Function `api`).

## Configuração
1. Rode `schema.sql` no SQL Editor do Supabase.
2. Publique a Edge Function `api` com o conteúdo de `api_index.ts`.
3. Crie um usuário em Authentication > Users e adicione o mesmo `id` na tabela `admins`.
4. No GitHub, em Settings > Secrets and variables > Actions, cadastre:
   `NUXT_PUBLIC_API_BASE`, `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_ANON_KEY`.

## Rotas
- `/` — tela inicial: Serviço/Manutenção ou Base Ministerial
- `/servico` — público: ficha do dia + estoque
- `/base` — Relatório, Casa Pastoral, Organograma, Administrador
- `/base/relatorio` — formulário público de relatório da celebração
- `/casa-pastoral` — ficha pastoral pública
- `/organograma` — organograma público
- `/admin` — painel administrativo (login obrigatório)
