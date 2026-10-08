# RetroVault — especificação simples v1

## Cliente
Catálogo por console, busca em título e descrição, filtro por gênero, ordenação, paginação, favoritos locais, detalhes do jogo, botão para download externo e atualização automática. Layout nostálgico responsivo com artes vetoriais originais.

## Administrador
Primeira configuração de senha, login/logout, troca de senha, cadastro e edição de metadados, capas por upload ou URL HTTPS, rascunhos, publicação, destaque, exclusão, busca e exportação dos cadastros.

## Dados e arquitetura
Um servidor local Node.js com módulos nativos atende ambas as interfaces. O cliente consulta apenas os jogos publicados. Escritas autenticadas, verificadas por origem e serializadas usam arquivos temporários, backup anterior e revisão para evitar sobrescritas. Metadados e credenciais são privados; apenas capas são públicas. Links de ROMs/ISOs permanecem nos serviços de arquivos. Nenhum banco de dados foi configurado.

## Limites
Servidor em loopback; nenhuma publicação externa nesta versão. Sem OAuth de Drive, upload de ISOs, importação pela interface, estatísticas de downloads ou contas de visitantes. Recursos do Drive dependem de compartilhamento e disponibilidade. Capas externas dependem do provedor. Capas removidas de um cadastro permanecem em dados/covers para não perder arquivos de backups.
