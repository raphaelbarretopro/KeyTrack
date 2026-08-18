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
- `date-fns` para datas e tempos em português.
- Lucide React para ícones.
- ESLint para qualidade estática e GitHub Pages para hospedagem do front-end.

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
  lib/firebase/
  services/
  styles/
  types/
```

## Arquitetura de dados

```text
tenants/{tenantId}
tenants/{tenantId}/users/{userId}
tenants/{tenantId}/keys/{keyId}
tenants/{tenantId}/movements/{movementId}
```

- `keys`: cadastro da chave, QR Code, status atual e última movimentação.
- `movements`: retirada, devolução, responsável, matrícula, horários e observações.
- `users`: perfil operacional vinculado ao tenant.
- O dashboard assina as coleções de chaves e movimentações com `onSnapshot`; após um F5, a fonte de verdade continua sendo o Firestore.

## Segurança

- As regras do Firestore restringem toda leitura ao `tenantId` presente nas custom claims do usuário autenticado.
- Os papéis suportados são `admin` e `reception`.
- Apenas administradores podem criar, editar ou excluir cadastros estruturais de chaves e usuários.
- Administradores e recepção podem registrar retirada e devolução.
- A retirada e a atualização de status da chave ocorrem no mesmo batch atômico; as regras validam o vínculo entre a movimentação e a chave.
- A devolução também é atômica: registra o horário, altera o status para disponível e remove a foto temporária.
- Movimentações não podem ser excluídas pelo cliente.
- Credenciais privadas do Firebase Admin devem ficar fora do Git. O arquivo `serviceAccountKey.json` é ignorado pelo repositório.

## LGPD e Privacidade

O sistema aplica uma estratégia de armazenamento efêmero para a foto capturada na retirada:

- A imagem é redimensionada para no máximo 640px e compactada no navegador antes do envio.
- A foto é armazenada temporariamente como Base64 no documento da movimentação aberta, com limite de 900.000 caracteres definido nas regras do Firestore.
- A imagem existe apenas enquanto a chave está em uso, para apoiar a conferência operacional.
- Na devolução, o campo `capturedPhotoBase64` é removido permanentemente no mesmo batch de atualização da movimentação e da chave.
- O histórico de horários, responsável, matrícula e observações é preservado sem manter a foto.

Esta estratégia reduz retenção de dados pessoais e elimina a dependência do Firebase Storage para fotos. A unidade ainda deve definir base legal, prazo de retenção dos dados textuais, política de acesso e processo de atendimento aos titulares conforme sua governança institucional.

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

## Configuração do Firebase

Após instalar o Firebase CLI e autenticar:

```text
firebase login
firebase use keytrack-senai-crti
firebase deploy --only firestore:rules,firestore:indexes
```

Para os scripts administrativos, gere uma chave privada em Firebase Console > Configurações do projeto > Contas de serviço > Firebase Admin SDK. Salve o JSON como `serviceAccountKey.json` na raiz do projeto ou defina `GOOGLE_APPLICATION_CREDENTIALS` com o caminho do arquivo.

### Carga inicial

```text
npm run seed:admin
npm run seed:keys
```

`seed:admin` cria ou atualiza o administrador e suas custom claims. `seed:keys` recria o inventário de chaves do tenant `senai-crti`; execute-o somente quando desejar substituir o inventário atual.

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
| `npm run seed:admin` | Cria ou atualiza o administrador inicial via Firebase Admin SDK. |
| `npm run seed:keys` | Substitui o inventário de chaves do tenant `senai-crti`. |
| `npm run generate:qrcodes` | Gera os PNGs e o manifesto dos QR Codes atuais. |