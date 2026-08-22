# KeyTrack SENAI

Sistema de gestão operacional de chaves para unidades do SENAI. O KeyTrack registra retiradas e devoluções, identifica chaves por QR Code e mantém o inventário em tempo real no Firebase, com isolamento de dados por unidade.

## Funcionalidades

- Autenticação de usuários com Firebase Authentication.
- Dashboard em tempo real com totais de chaves disponíveis, ocupadas, atrasadas e inventário.
- Retirada de chave por leitura de QR Code, identificação do responsável, previsão de devolução e captura de foto.
- Devolução com leitura obrigatória do QR Code da mesma chave antes da confirmação.
- Status de chave: disponível, em uso ou em manutenção.
- Histórico de movimentações com responsável, matrícula, horários e observações.
- Geração de QR Codes para impressão a partir do mesmo inventário utilizado no Firestore.
- Reconhecimento facial de instrutores cadastrados, para validar o responsável na retirada sem digitação manual.
- Leitura por OCR da matrícula impressa no crachá, como alternativa à digitação manual.
- Cadastro de novas salas (cria uma chave nova no inventário) e manutenção de salas (muda `statusCurrent` da chave para "manutenção", bloqueando a retirada).
- Cadastro de unidades (prédios/blocos) dentro do tenant.
- Cadastro de usuários (administrador geral, administrador de unidade e recepção) com senha e nível de acesso, direto pela interface — sem Cloud Functions e sem sair do plano gratuito.
- Painel da recepção somente leitura com o status das salas (chaves) em tempo real, sem menu administrativo.
- Relatórios de movimentação filtráveis por Dia, Semana, Mês ou Ano.
- Arquitetura multi-tenant: cada unidade possui dados segregados pelo seu `tenantId`.

## Tecnologias

- React 19, TypeScript e React Router.
- Vite para desenvolvimento e build.
- Tailwind CSS e PostCSS para interface responsiva.
- Firebase Authentication para identidade e sessão.
- Cloud Firestore para dados em tempo real, regras de acesso e transações em lote.
- Firebase Admin SDK para provisionamento de administrador e carga do inventário.
- PWA com `vite-plugin-pwa`.
- `jsQR` para leitura de QR Code por câmera.
- `react-webcam` e Canvas API para captura e compactação de fotos.
- `@vladmandic/face-api` para extração e reconhecimento de descritores faciais (modelos carregados via CDN em tempo de execução).
- `tesseract.js` para OCR da matrícula no crachá.
- `date-fns` para datas e tempos em português.
- Lucide React para ícones.
- ESLint para qualidade estática e GitHub Pages para hospedagem do front-end.
- `qrcode` para gerar o QR Code da sala no próprio navegador, no momento do cadastro.

## Estrutura principal

```text
src/
  app/
  components/shared/
  config/
  features/
    auth/
    dashboard/
    checkouts/
    keys/
    rooms/
    units/
    reception/
    admin/
  lib/firebase/
  services/
  styles/
  types/
functions/
  src/
```

## Arquitetura de dados

```text
tenants/{tenantId}
tenants/{tenantId}/users/{userId}
tenants/{tenantId}/keys/{keyId}
tenants/{tenantId}/movements/{movementId}
tenants/{tenantId}/instructors/{instructorId}
tenants/{tenantId}/unidades/{unidadeId}
```

- `keys`: cadastro da chave/sala, QR Code, status atual (`available`/`occupied`/`maintenance`) e última movimentação. **"Sala" não é uma coleção separada** — cada sala do prédio é um documento em `keys` (ex.: `arena-cyber`, `laboratorio-software-01`); Cadastro de Salas, Manutenção de Salas e o Painel da Recepção leem e escrevem diretamente aqui, reaproveitando o inventário que já existe.
- `movements`: retirada, devolução, responsável, matrícula, horários e observações.
- `users`: perfil operacional vinculado ao tenant (espelho do usuário do Firebase Authentication).
- `instructors`: cadastro do instrutor, foto e descritor facial (`faceDescriptor`) usados no reconhecimento facial da retirada.
- `unidades`: nome e descrição de prédios/blocos dentro do tenant (não é um novo tenant).
- O dashboard assina as coleções de chaves e movimentações com `onSnapshot`; após um F5, a fonte de verdade continua sendo o Firestore.

## Segurança

### Modelo de autorização

Os papéis suportados são `super_admin` (acesso a todas as unidades), `admin` (uma unidade) e `reception` (uma unidade).

**O papel e a unidade vivem no documento `tenants/{tenantId}/users/{uid}`, não em custom claims.** Essa escolha é o que permite cadastrar usuários direto pela interface no plano gratuito: *custom claims* só podem ser gravadas pelo Admin SDK (servidor), o que exigiria Cloud Functions e o plano Blaze. As regras do Firestore leem o perfil do chamador com `get()` — uma leitura privilegiada, que ignora as próprias regras e portanto não gera recursão.

O tradeoff é consciente: com claims, forjar um papel é impossível por construção; com documento, a segurança depende de as regras estarem corretas. Por isso existem travas explícitas anti-escalonamento, todas cobertas por testes automatizados em `npm run test:rules`:

- Ninguém edita nem exclui o **próprio** documento de usuário (impede autopromoção).
- Um `admin` só cria/edita/exclui usuários com papel `reception` **e** da própria unidade — não consegue criar outro `admin` nem um `super_admin`.
- `reception` não escreve na coleção de usuários.
- Um usuário autenticado sem documento não tem acesso a nada (o primeiro `super_admin` é criado por script com Admin SDK, via `npm run seed:admin`).

### Demais regras

- Todo acesso é escopado por unidade: `keys`, `instructors`, `movements` e `users` só são legíveis por quem é da mesma `unidadeId` (ou por um `super_admin`).
- Apenas `admin`/`super_admin` criam, editam ou excluem cadastros estruturais de chaves, instrutores e usuários.
- `admin`, `super_admin` e `reception` podem registrar retirada e devolução.
- A retirada e a atualização de status da chave ocorrem no mesmo batch atômico; as regras validam o vínculo entre a movimentação e a chave, inclusive que a movimentação pertence à mesma unidade da chave.
- A devolução também é atômica: registra o horário, altera o status para disponível e remove a foto temporária.
- Movimentações não podem ser excluídas pelo cliente.
- `unidades`: leitura para qualquer usuário do tenant (para o seletor de unidade); escrita apenas para `super_admin`.
- As rotas administrativas (`/rooms/new`, `/rooms/maintenance`, `/units/new`, `/admin/users`, `/reports`) são bloqueadas no cliente por papel; a aplicação real da regra continua sendo o Firestore.
- Credenciais privadas do Firebase Admin devem ficar fora do Git. O arquivo `serviceAccountKey.json` é ignorado pelo repositório.

### Limitação conhecida da exclusão de usuários

Excluir um usuário pela tela remove o documento de perfil — o acesso é cortado na hora. A conta em si **continua no Firebase Authentication**, porque o navegador não tem permissão para apagá-la. O email segue ocupado até a conta ser removida.

Para fazer essa faxina periodicamente, use:

```text
npm run purge:orphans            # simulação: apenas lista as contas sem perfil
npm run purge:orphans -- --confirm   # remove de fato
```

## LGPD e Privacidade

O sistema aplica uma estratégia de armazenamento efêmero para a foto capturada na retirada:

- A imagem é redimensionada para no máximo 640px e compactada no navegador antes do envio.
- A foto é armazenada temporariamente como Base64 no documento da movimentação aberta, com limite de 900.000 caracteres definido nas regras do Firestore.
- A imagem existe apenas enquanto a chave está em uso, para apoiar a conferência operacional.
- Na devolução, o campo `capturedPhotoBase64` é removido permanentemente no mesmo batch de atualização da movimentação e da chave.
- O histórico de horários, responsável, matrícula e observações é preservado sem manter a foto.

Esta estratégia reduz retenção de dados pessoais e elimina a dependência do Firebase Storage para fotos. A unidade ainda deve definir base legal, prazo de retenção dos dados textuais, política de acesso e processo de atendimento aos titulares conforme sua governança institucional.

### Dados biométricos de instrutores

O reconhecimento facial usado na retirada depende de dados armazenados de forma persistente (não efêmera) no documento do instrutor, em `tenants/{tenantId}/instructors/{instructorId}`:

- `photoBase64`: foto de referência do instrutor.
- `faceDescriptor`: vetor numérico extraído da foto pelo `@vladmandic/face-api`, usado para comparar com o rosto capturado na retirada.

O `faceDescriptor` é dado biométrico e é tratado como dado pessoal sensível pela LGPD (art. 5º, II), o que normalmente exige consentimento específico do titular e cuidados adicionais de acesso e retenção — diferente da foto de movimentação, que é excluída automaticamente na devolução. Hoje qualquer usuário autenticado do tenant (`admin` ou `reception`) pode ler esses documentos, incluindo o descritor facial. A unidade deve avaliar se essa exposição de leitura é compatível com sua base legal antes de habilitar o reconhecimento facial em produção.

## Como rodar localmente

1. Copie .env.example para .env.local.
2. Preencha as variáveis públicas do projeto Firebase.
3. Instale as dependências com npm install.
4. Rode npm run dev.

O projeto usa o Firebase como fonte de verdade. Sem as variáveis necessárias, as operações de inventário não são executadas.

## Variáveis de ambiente

As variáveis esperadas estão em .env.example:

- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_FIREBASE_MEASUREMENT_ID
- VITE_APP_NAME
- VITE_GH_PAGES_BASE
- VITE_TENANT_ID (opcional; padrão `senai-crti`) — tenant onde o app procura o perfil do usuário logado

## Configuração do Firebase

Após instalar o Firebase CLI e autenticar:

```text
firebase login
firebase use keytrack-senai-crti
firebase deploy --only firestore:rules,firestore:indexes
```

Para os scripts administrativos, gere uma chave privada em Firebase Console > Configurações do projeto > Contas de serviço > Firebase Admin SDK. Salve o JSON como `serviceAccountKey.json` na raiz do projeto ou defina `GOOGLE_APPLICATION_CREDENTIALS` com o caminho do arquivo.

### Cloud Functions (não são mais necessárias)

O projeto roda inteiramente no plano gratuito (Spark). O cadastro de usuários acontece no próprio navegador: a conta é criada com o SDK cliente numa instância secundária do Firebase (para não derrubar a sessão de quem está cadastrando) e o perfil com papel/unidade é gravado no Firestore.

A pasta `functions/` ainda existe no repositório com a antiga callable `createUser`, mas **não é usada nem precisa ser publicada**. Ela só faria sentido se um dia o projeto migrar para o plano Blaze e vocês quiserem voltar a usar custom claims.

### Carga inicial

```text
npm run seed:admin
npm run seed:keys
```

`seed:admin` cria ou atualiza o administrador geral (`super_admin`) — é o bootstrap obrigatório, já que um usuário sem perfil no Firestore não consegue criar ninguém. `seed:keys` recria o inventário de chaves do tenant `senai-crti`; execute-o somente quando desejar substituir o inventário atual.

### Cadastro de usuários pelo terminal (opcional)

O caminho normal é a tela `/admin/users`. O script continua disponível para bootstrap e para casos em que é preciso **redefinir a senha** de alguém (a tela não faz isso):

```text
npm run create:user -- --name "Nome completo" --email usuario@exemplo.com --password "senha123" --role reception --unidade senai-crti
```

Cria (ou atualiza, se o email já existir) o usuário no Firebase Authentication e grava o perfil em `tenants/senai-crti/users/{uid}`. `--role` aceita `super_admin`, `admin` ou `reception`; `--unidade` é obrigatório exceto para `super_admin`.

## Gerar PNGs dos QR codes

Para gerar os arquivos PNG do inventário atual, execute:

```text
npm run generate:qrcodes
```

Os arquivos são criados em public/print/qrcodes. O comando também gera um manifest.json com a relação entre chave, qrCodeId e nome do arquivo PNG.

## Scripts

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Inicia o ambiente de desenvolvimento. |
| `npm run build` | Executa a checagem TypeScript e gera a versão de produção. |
| `npm run lint` | Executa as regras de lint. |
| `npm run preview` | Serve localmente o build de produção. |
| `npm run seed:admin` | Cria ou atualiza o administrador geral (`super_admin`) via Firebase Admin SDK. |
| `npm run seed:keys` | Substitui o inventário de chaves do tenant `senai-crti`. |
| `npm run create:user -- --name ... --email ... --password ... --role ... --unidade ...` | Cria/atualiza um usuário pelo terminal (útil para bootstrap e para redefinir senha). |
| `npm run migrate:unidades` | Idempotente: cria a unidade padrão e preenche `unidadeId` em documentos antigos. |
| `npm run purge:orphans [-- --confirm]` | Lista (ou remove) contas do Auth que ficaram sem perfil no Firestore. |
| `npm run generate:qrcodes` | Gera os PNGs e o manifesto dos QR Codes atuais. |
| `npm run test:rules` | Executa os testes das regras do Firestore (inclui os casos de escalonamento de privilégio). |