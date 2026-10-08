# RetroVaultPS2 — especificação v2

Cliente com grade de jogos, busca, filtros por console e gênero, favoritos, detalhes, download externo e atualização automática. Admin com login, senha própria, cadastro, edição, capas, rascunhos, publicação e exportação.

## Armazenamento

Local: Node.js atende o site em loopback e salva texto JSON em dados/, com cópia .bak anterior. Online: Render executa uma instância Node.js e usa a Data API do Supabase para metadados e hash da senha, e Storage para capas. RLS e permissões bloqueiam acesso direto de visitantes à tabela. As ROMs continuam no Drive. Nenhuma chave secreta é enviada ao frontend.

## Publicação

render.yaml configura serviço Free, Node.js 22 e start:render. A produção escuta a porta definida pelo Render em 0.0.0.0, verifica a origem HTTPS e usa cookies Secure. O admin inicial é criado pela variável RETRO_ADMIN_PASSWORD; a configuração pública de senha é bloqueada em produção. Sessões expiram em oito horas e se encerram ao reiniciar. Configuração incompleta do Supabase impede a inicialização em produção, evitando perda de dados por fallback ao disco temporário.

## Limites

Uma instância por acervo, sem OAuth de Drive, upload de ISOs, importação pela interface ou migração automática dos cadastros locais. Os planos gratuitos têm cotas e podem suspender serviços ociosos. Consulte docs/PUBLICAR-RENDER.md.
