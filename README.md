# RetroVaultPS2

Catálogo retrô com duas interfaces: cliente público e painel administrativo protegido por senha. HTML, CSS, JavaScript, Bootstrap local e servidor Node.js sem dependências externas.

## Repositório GitHub

Repositório configurado: https://github.com/gabri-silva/RetroVaultGames.git, branch `main`. Para enviar o commit preparado, clique duas vezes em `enviar-github.bat` e autentique no GitHub quando solicitado. Esse iniciador envia commits existentes; alterações futuras precisam de um novo commit antes do envio. A pasta `dados`, com credenciais, cadastros e capas pessoais, está fora do Git.

## Como abrir

Clique duas vezes em `iniciar.bat`. O navegador abre depois da verificação do servidor. Mantenha a janela aberta; Ctrl+C encerra. O endereço inicial é http://127.0.0.1:4320; quando ocupado, escolhe outra porta até 4340. Use o endereço mostrado na janela. Alternativamente, execute `npm start` nesta pasta. No PC, requer Node.js 20+; no Render, a configuração utiliza Node.js 22.

## Primeiro cadastro

1. No cliente, clique em Área admin.
2. Crie sua senha de administrador, com pelo menos 10 caracteres. Não há senha padrão.
3. Preencha título, console, gênero, ano e os demais dados.
4. Envie uma capa PNG/JPG/WebP de até 3 MB ou informe uma URL HTTPS.
5. Envie o arquivo ROM/ISO ao seu Drive e copie seu link compartilhado no campo de download. Configure o compartilhamento para os visitantes pretendidos.
6. Marque Publicar no catálogo e salve. Sem essa marca, o cadastro fica como rascunho.

O catálogo cliente atualiza a cada 15 segundos ou quando a aba ganha foco. Também pode recarregar imediatamente. Os downloads apontam para o Drive, não para este computador. Links individuais do Google Drive são convertidos para o endereço de download, preservando a resource key quando houver. Arquivos grandes ou com acesso restrito podem exigir confirmação ou login no Drive. Links HTTPS de outros serviços também são aceitos. Não há integração OAuth ou envio automático dos arquivos ao Drive.

## Organização

- `public/index.html`: cliente.
- `public/admin.html`: administrador.
- `public/css/`: visual responsivo.
- `public/js/`: busca, filtros, favoritos, detalhes e administração.
- `public/assets/`: artes vetoriais originais das prévias.
- `public/vendor/`: Bootstrap e licença.
- `server/server.js`: API, sessões, validação e arquivos.
- `server/iniciar.js`: inicialização, porta livre e navegador.
- `dados/catalogo.txt`: metadados em texto JSON, criado ao salvar o primeiro jogo.
- `dados/admin.txt`: senha com salt e hash scrypt; nunca salva senha em texto puro.
- `dados/covers/`: capas enviadas.
- `tests/`: testes de autenticação e publicação.
- `docs/ESPECIFICACAO.md`: escopo do projeto.

O servidor conserva o arquivo `.bak` anterior. Para um backup completo, copie a pasta `dados` com o servidor fechado; a exportação pelo painel contém apenas os cadastros. Para restaurar, feche o servidor e substitua a pasta `dados` pela cópia. Não compartilhe admin.txt nem seus backups. Para redefinir uma senha esquecida, com o servidor fechado, renomeie admin.txt e admin.txt.bak; reinicie e crie uma senha nova. O catálogo é preservado.

Favoritos ficam neste navegador. Rascunhos não são retornados pela API pública. A senha inicial só pode ser criada neste PC. Sessões expiram em 8 horas e são encerradas quando o servidor reinicia. Mudanças concorrentes são detectadas para evitar sobrescrever o acervo de outra aba.

## Prévia e uso

Enquanto não houver jogos publicados, o cliente mostra seis jogos fictícios como prévia visual, sem downloads. Eles não são cadastros reais. Publicar o primeiro jogo substitui a prévia pelo seu catálogo.

O projeto tem dois modos: local, com arquivos de texto, e online, com Render gratuito + Supabase. Consulte [o roteiro de publicação](docs/PUBLICAR-RENDER.md). O modo online usa banco e Storage do Supabase, cookie Secure, origem HTTPS e senha inicial configurada no ambiente do servidor. Cadastre arquivos que você possa compartilhar.

## Verificação

`npm test`: testa autenticação, rascunhos, publicação, persistência, revisões e proteção dos dados. Não precisa executar npm install.

## Publicação gratuita

Siga `docs/PUBLICAR-RENDER.md`. O SQL inicial está em `supabase/setup.sql`, o Blueprint em `render.yaml` e as variáveis necessárias em `.env.example`. Não publique suas chaves no GitHub. Nenhum serviço externo foi criado automaticamente.

## Temas

O seletor Tema no cabeçalho oferece Clássico, Red, Green e Metalic Blue. A preferência fica salva no navegador e vale também para o admin. As outras abas do mesmo endereço acompanham a mudança. Não exige login.
