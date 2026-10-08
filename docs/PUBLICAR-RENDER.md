# Publicar RetroVaultPS2: Render gratuito + Supabase gratuito

O código está preparado; os serviços precisam ser criados nas suas contas. Não é necessário cartão para escolher o plano Free quando disponível na conta. Confira as condições apresentadas por cada serviço antes de confirmar. Os planos têm limites: o Render pode suspender o servidor ocioso, e o Supabase pode pausar projetos inativos. O primeiro acesso pode demorar. Nenhuma ISO/ROM será guardada nessas plataformas: os arquivos continuam no Drive.

## 1. Criar o Supabase

1. Entre em https://supabase.com/dashboard e crie um projeto gratuito dedicado ao RetroVaultPS2.
2. Escolha uma senha para o banco e aguarde o projeto iniciar. Essa senha não é a senha do admin do site.
3. Abra SQL Editor, crie uma consulta e cole todo o conteúdo de `supabase/setup.sql`; clique Run.
4. Obtenha a Project URL no diálogo Connect ou nas configurações do projeto.
5. Em Settings > API Keys, obtenha/crie uma Secret key, começando com `sb_secret_`. Ela ficará somente no servidor do Render. Não use a publishable key.

## 2. Enviar o código

Na pasta do projeto, abra `enviar-github.bat` e autentique se solicitado. Verifique no repositório https://github.com/gabri-silva/RetroVaultGames que `render.yaml`, `server/production.js` e `supabase/setup.sql` estão presentes na branch main. O arquivo .env.example contém apenas exemplos; não grave suas chaves nele.

## 3. Criar o serviço no Render

Conclua a verificação do e-mail da conta Render. No painel:

1. New > Blueprint, conecte o GitHub e selecione RetroVaultGames, branch main.
2. O arquivo render.yaml configura um Web Service Free, sem disco pago.
3. Preencha as variáveis solicitadas:
   - SUPABASE_URL: Project URL do projeto Supabase.
   - SUPABASE_SECRET_KEY: a Secret key privada.
   - RETRO_ADMIN_PASSWORD: sua senha inicial do painel, com 10 a 128 caracteres.
4. Confira que o plano é Free e crie o serviço. Aguarde o deploy terminar.

Se preferir New > Web Service, configure manualmente:

| Campo | Valor |
|---|---|
| Runtime | Node |
| Branch | main |
| Build Command | npm ci --omit=dev |
| Start Command | npm run start:render |
| Instance Type | Free |
| Health Check Path | /api/health |
| Environment | NODE_ENV=production, NODE_VERSION=22 e as três variáveis acima |

Não configure discos. Não use o iniciar.bat no Render. A URL pública fornecida pelo Render é reconhecida automaticamente. Para domínio personalizado, defina PUBLIC_URL com o endereço HTTPS do seu domínio e faça um novo deploy.

## 4. Primeiro acesso

Abra a URL pública e depois `/admin`. Entre com a senha de RETRO_ADMIN_PASSWORD. Ela é usada apenas para criar o admin quando o banco ainda não tem um; alterações posteriores são feitas no painel em Trocar senha. Depois do primeiro deploy bem-sucedido, pode remover RETRO_ADMIN_PASSWORD do Render: a senha com hash continua no Supabase. Alterar essa variável não redefine um admin existente.

Cadastre um jogo e sua capa, informe o link do Drive, publique e confirme no cliente. Reinicie o serviço Render e confirme que o jogo continua cadastrado. O login pode ser solicitado novamente após reinícios: sessões são locais ao processo, mas os jogos e credenciais persistem no Supabase.

## Dados existentes e backup

Os cadastros locais não são migrados automaticamente. Para poucos jogos, recadastre no admin online e envie as capas novamente. O programa local segue usando dados/ quando as variáveis Supabase não estão definidas; os acervos local e online são separados. Para muitos jogos, prepare uma migração antes de publicar; não envie dados/admin.txt ao GitHub.

Exporte os cadastros pelo painel e conserve cópias das capas. No modo Supabase, os arquivos .bak locais não são criados. O projeto usa uma única instância de servidor; não escale para várias instâncias sem revisar sessões e a concorrência das gravações.

## Problemas comuns

- “Falha no Supabase”: confira URL, Secret key e se setup.sql foi executado. A tabela deve estar no schema public e acessível pela Data API.
- “Configure RETRO_ADMIN_PASSWORD”: defina a senha inicial no Render, antes do primeiro deploy.
- “Origem não autorizada”: confira PUBLIC_URL. Deve ser o domínio exato pelo qual está acessando, sem caminho; não use um domínio de prévia diferente.
- Deploy falhou: abra Logs e confira as variáveis. Não compartilhe as chaves nas capturas ou no chat.
- Primeira página lenta: o plano gratuito pode estar retomando o servidor.

Referências: https://render.com/docs/free · https://render.com/docs/blueprint-spec · https://supabase.com/docs/guides/getting-started/api-keys

## Atualização do chat

Antes de publicar a versão com chat, execute `supabase/chat.sql` no SQL Editor. Isso cria a tabela de mensagens e preserva seu catálogo. Depois envie os commits e faça um novo deploy no Render. Nenhuma variável extra é necessária.
