# KeyTrack SENAI

MVP de sistema de gestão de chaves para unidades do SENAI, com front-end em React + Vite + Tailwind + PWA e backend em Firebase.

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS
- Firebase Authentication e Firestore
- GitHub Pages para hospedagem do front-end
- Arquitetura multi-tenant por unidade escolar usando tenantId em custom claims

## O que já foi implementado

- Estrutura inicial do app por domínio em src/app, src/features, src/services e src/components
- Login com fluxo preparado para MFA TOTP
- Dashboard da recepção com status das chaves, tempo decorrido e alertas de atraso
- Modais de check-out e check-in com captura de foto por webcam
- Serviços preparados para Firebase e modo demo local sem credenciais
- Regras iniciais de Firestore para segregação por tenant
- Workflow de deploy para GitHub Pages

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

## Como rodar localmente

1. Copie .env.example para .env.local.
2. Preencha as variáveis públicas do projeto Firebase.
3. Instale as dependências com npm install.
4. Rode npm run dev.

Sem variáveis do Firebase, a aplicação sobe em modo demo com dados mockados para acelerar a implementação visual e de fluxo.

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

## Modelo de dados inicial

```text
tenants/{tenantId}
tenants/{tenantId}/users/{userId}
tenants/{tenantId}/keys/{keyId}
tenants/{tenantId}/movements/{movementId}
```

Cada key possui qrCodeId para preparar o lookup futuro por QR Code. Cada movement registra a retirada/devolução, a matrícula, o nome e os horários. Durante uma retirada, a foto é comprimida e armazenada temporariamente como Base64 no documento da movimentação; ela é destruída ao registrar a devolução.

## Regras multi-tenant

- Usuários autenticados só acessam dados do tenant presente em request.auth.token.tenantId.
- Perfil reception e admin podem registrar check-out e check-in.
- Apenas admin pode manter cadastro estrutural de chaves e usuários.
- A foto temporária só pode ser criada durante uma retirada e a devolução remove o campo de Base64 no mesmo batch da atualização de status.

## Próximos passos recomendados

1. Configurar o projeto Firebase real e publicar custom claims de tenantId, role e mfaRequired.
2. Trocar o fluxo demo de MFA pela validação TOTP definitiva usando enrollment do Firebase Auth.
3. Adicionar Firebase Emulator Suite e seeds de tenant para testes locais.
4. Implementar cadastro administrativo de chaves e usuários.
5. Adicionar leitura de QR Code na busca de chaves.

## Gerar PNGs dos QR codes

Para gerar os arquivos PNG de cada chave cadastrada em modo demo, execute:

```text
npm run generate:qrcodes
```

Os arquivos são criados em public/print/qrcodes. O comando também gera um manifest.json com a relação entre chave, qrCodeId e nome do arquivo PNG.