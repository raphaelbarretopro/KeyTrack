import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';

const PROJECT_ID = 'keytrack-senai-crti';
const TENANT_A = 'senai-crti';
const TENANT_B = 'senai-outra-unidade';
const UNIDADE_A = 'unidade-a';
const UNIDADE_B = 'unidade-b';

const SUPER_ADMIN_UID = 'super-admin-a';
const ADMIN_A_UID = 'admin-unidade-a';
const ADMIN_B_UID = 'admin-unidade-b';
const RECEPTION_A_UID = 'reception-unidade-a';
const ADMIN_TENANT_B_UID = 'admin-tenant-b';
const RECEPTION_TARGET_UID = 'reception-alvo-a';

async function main() {
  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });

  let passed = 0;
  let failed = 0;

  async function check(label, fn) {
    try {
      await fn();
      console.log(`✅ PASS - ${label}`);
      passed++;
    } catch (err) {
      console.log(`❌ FAIL - ${label}`);
      console.log(`   ${err.message}`);
      failed++;
    }
  }

  // O papel agora vive no documento do usuário, então o cenário precisa ser
  // semeado com as regras desligadas antes de qualquer teste.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    await db.doc(`tenants/${TENANT_A}/users/${SUPER_ADMIN_UID}`).set({
      uid: SUPER_ADMIN_UID, name: 'Super', email: 'super@exemplo.com', role: 'super_admin', active: true,
    });
    await db.doc(`tenants/${TENANT_A}/users/${ADMIN_A_UID}`).set({
      uid: ADMIN_A_UID, name: 'Admin A', email: 'admin-a@exemplo.com', role: 'admin', unidadeId: UNIDADE_A, active: true,
    });
    await db.doc(`tenants/${TENANT_A}/users/${ADMIN_B_UID}`).set({
      uid: ADMIN_B_UID, name: 'Admin B', email: 'admin-b@exemplo.com', role: 'admin', unidadeId: UNIDADE_B, active: true,
    });
    await db.doc(`tenants/${TENANT_A}/users/${RECEPTION_A_UID}`).set({
      uid: RECEPTION_A_UID, name: 'Recepção A', email: 'rec-a@exemplo.com', role: 'reception', unidadeId: UNIDADE_A, active: true,
    });
    await db.doc(`tenants/${TENANT_A}/users/${RECEPTION_TARGET_UID}`).set({
      uid: RECEPTION_TARGET_UID, name: 'Recepção Alvo', email: 'rec-alvo@exemplo.com', role: 'reception', unidadeId: UNIDADE_A, active: true,
    });
    await db.doc(`tenants/${TENANT_B}/users/${ADMIN_TENANT_B_UID}`).set({
      uid: ADMIN_TENANT_B_UID, name: 'Admin Tenant B', email: 'admin-tb@exemplo.com', role: 'admin', unidadeId: 'unidade-outro-tenant', active: true,
    });

    await db.doc(`tenants/${TENANT_A}/keys/sala-a`).set({
      label: 'Sala A', code: 'SALA-A', qrCodeId: 'SALA-A', statusCurrent: 'available', active: true, unidadeId: UNIDADE_A,
    });
    await db.doc(`tenants/${TENANT_A}/instructors/instrutor-a`).set({
      name: 'Instrutor A', matricula: '12345-6', unidadeId: UNIDADE_A,
    });
  });

  const superAdmin = testEnv.authenticatedContext(SUPER_ADMIN_UID);
  const adminA = testEnv.authenticatedContext(ADMIN_A_UID);
  const adminB = testEnv.authenticatedContext(ADMIN_B_UID);
  const receptionA = testEnv.authenticatedContext(RECEPTION_A_UID);
  const adminTenantB = testEnv.authenticatedContext(ADMIN_TENANT_B_UID);
  const semDocumento = testEnv.authenticatedContext('usuario-sem-documento');

  // ------------------------------------------------------------------
  // Isolamento por unidade (salas / instrutores)
  // ------------------------------------------------------------------

  await check('Admin da unidade A cria sala na unidade A (deve SUCEDER)', async () => {
    await assertSucceeds(
      adminA.firestore().doc(`tenants/${TENANT_A}/keys/sala-nova-a`).set({
        label: 'Sala Nova', code: 'SALA-NOVA', qrCodeId: 'SALA-NOVA', statusCurrent: 'available', active: true, unidadeId: UNIDADE_A,
      }),
    );
  });

  await check('Admin da unidade A tenta criar sala na unidade B (deve FALHAR)', async () => {
    await assertFails(
      adminA.firestore().doc(`tenants/${TENANT_A}/keys/sala-nova-b`).set({
        label: 'Sala Nova B', code: 'SALA-NOVA-B', qrCodeId: 'SALA-NOVA-B', statusCurrent: 'available', active: true, unidadeId: UNIDADE_B,
      }),
    );
  });

  await check('Admin da unidade B tenta ler sala da unidade A (deve FALHAR)', async () => {
    await assertFails(adminB.firestore().doc(`tenants/${TENANT_A}/keys/sala-a`).get());
  });

  await check('Reception da unidade A lê sala da unidade A (deve SUCEDER)', async () => {
    await assertSucceeds(receptionA.firestore().doc(`tenants/${TENANT_A}/keys/sala-a`).get());
  });

  await check('super_admin lê sala de qualquer unidade (deve SUCEDER)', async () => {
    await assertSucceeds(superAdmin.firestore().doc(`tenants/${TENANT_A}/keys/sala-a`).get());
  });

  await check('Admin de outro tenant tenta ler sala do tenant A (deve FALHAR)', async () => {
    await assertFails(adminTenantB.firestore().doc(`tenants/${TENANT_A}/keys/sala-a`).get());
  });

  await check('Usuário autenticado sem documento não lê nada (deve FALHAR)', async () => {
    await assertFails(semDocumento.firestore().doc(`tenants/${TENANT_A}/keys/sala-a`).get());
  });

  await check('Reception da unidade A tenta criar instrutor (deve FALHAR)', async () => {
    await assertFails(
      receptionA.firestore().doc(`tenants/${TENANT_A}/instructors/instrutor-novo`).set({
        name: 'Novo', matricula: '99999-9', unidadeId: UNIDADE_A,
      }),
    );
  });

  await check('Admin da unidade A atualiza instrutor da unidade A (deve SUCEDER)', async () => {
    await assertSucceeds(
      adminA.firestore().doc(`tenants/${TENANT_A}/instructors/instrutor-a`).update({ name: 'Instrutor A editado' }),
    );
  });

  // ------------------------------------------------------------------
  // Escalonamento de privilégio (o ponto crítico do modelo doc-based)
  // ------------------------------------------------------------------

  await check('ESCALONAMENTO: reception tenta criar usuário (deve FALHAR)', async () => {
    await assertFails(
      receptionA.firestore().doc(`tenants/${TENANT_A}/users/novo-por-reception`).set({
        uid: 'novo-por-reception', name: 'X', email: 'x@exemplo.com', role: 'reception', unidadeId: UNIDADE_A, active: true,
      }),
    );
  });

  await check('ESCALONAMENTO: reception tenta se promover a admin (deve FALHAR)', async () => {
    await assertFails(
      receptionA.firestore().doc(`tenants/${TENANT_A}/users/${RECEPTION_A_UID}`).update({ role: 'admin' }),
    );
  });

  await check('ESCALONAMENTO: admin tenta se promover a super_admin (deve FALHAR)', async () => {
    await assertFails(
      adminA.firestore().doc(`tenants/${TENANT_A}/users/${ADMIN_A_UID}`).update({ role: 'super_admin' }),
    );
  });

  await check('ESCALONAMENTO: admin tenta criar outro admin (deve FALHAR)', async () => {
    await assertFails(
      adminA.firestore().doc(`tenants/${TENANT_A}/users/novo-admin`).set({
        uid: 'novo-admin', name: 'Novo Admin', email: 'na@exemplo.com', role: 'admin', unidadeId: UNIDADE_A, active: true,
      }),
    );
  });

  await check('ESCALONAMENTO: admin tenta criar um super_admin (deve FALHAR)', async () => {
    await assertFails(
      adminA.firestore().doc(`tenants/${TENANT_A}/users/novo-super`).set({
        uid: 'novo-super', name: 'Novo Super', email: 'ns@exemplo.com', role: 'super_admin', active: true,
      }),
    );
  });

  await check('ESCALONAMENTO: admin tenta criar reception em outra unidade (deve FALHAR)', async () => {
    await assertFails(
      adminA.firestore().doc(`tenants/${TENANT_A}/users/rec-outra-unidade`).set({
        uid: 'rec-outra-unidade', name: 'Rec B', email: 'rb@exemplo.com', role: 'reception', unidadeId: UNIDADE_B, active: true,
      }),
    );
  });

  await check('ESCALONAMENTO: admin tenta promover reception da própria unidade a admin (deve FALHAR)', async () => {
    await assertFails(
      adminA.firestore().doc(`tenants/${TENANT_A}/users/${RECEPTION_TARGET_UID}`).update({ role: 'admin' }),
    );
  });

  await check('ESCALONAMENTO: usuário sem documento tenta criar o próprio como super_admin (deve FALHAR)', async () => {
    await assertFails(
      semDocumento.firestore().doc(`tenants/${TENANT_A}/users/usuario-sem-documento`).set({
        uid: 'usuario-sem-documento', name: 'Intruso', email: 'i@exemplo.com', role: 'super_admin', active: true,
      }),
    );
  });

  // ------------------------------------------------------------------
  // Fluxos legítimos de gestão de usuários
  // ------------------------------------------------------------------

  await check('Admin cria reception na própria unidade (deve SUCEDER)', async () => {
    await assertSucceeds(
      adminA.firestore().doc(`tenants/${TENANT_A}/users/rec-criado-por-admin`).set({
        uid: 'rec-criado-por-admin', name: 'Rec Novo', email: 'rn@exemplo.com', role: 'reception', unidadeId: UNIDADE_A, active: true,
      }),
    );
  });

  await check('Admin edita nome de reception da própria unidade (deve SUCEDER)', async () => {
    await assertSucceeds(
      adminA.firestore().doc(`tenants/${TENANT_A}/users/${RECEPTION_TARGET_UID}`).update({
        name: 'Recepção Alvo editada', role: 'reception', unidadeId: UNIDADE_A,
      }),
    );
  });

  await check('Admin da unidade B tenta editar reception da unidade A (deve FALHAR)', async () => {
    await assertFails(
      adminB.firestore().doc(`tenants/${TENANT_A}/users/${RECEPTION_TARGET_UID}`).update({ name: 'Invadido' }),
    );
  });

  await check('super_admin cria um admin de unidade (deve SUCEDER)', async () => {
    await assertSucceeds(
      superAdmin.firestore().doc(`tenants/${TENANT_A}/users/admin-criado-por-super`).set({
        uid: 'admin-criado-por-super', name: 'Admin Novo', email: 'an@exemplo.com', role: 'admin', unidadeId: UNIDADE_B, active: true,
      }),
    );
  });

  await check('Qualquer usuário lê o próprio documento (deve SUCEDER)', async () => {
    await assertSucceeds(receptionA.firestore().doc(`tenants/${TENANT_A}/users/${RECEPTION_A_UID}`).get());
  });

  await check('Admin da unidade A tenta ler usuário da unidade B (deve FALHAR)', async () => {
    await assertFails(adminA.firestore().doc(`tenants/${TENANT_A}/users/${ADMIN_B_UID}`).get());
  });

  await check('Admin exclui reception da própria unidade (deve SUCEDER)', async () => {
    await assertSucceeds(adminA.firestore().doc(`tenants/${TENANT_A}/users/rec-criado-por-admin`).delete());
  });

  // ------------------------------------------------------------------
  // Unidades: só super_admin escreve
  // ------------------------------------------------------------------

  await check('Admin de unidade tenta criar uma nova unidade (deve FALHAR)', async () => {
    await assertFails(adminA.firestore().doc(`tenants/${TENANT_A}/unidades/unidade-nova`).set({ nome: 'Unidade Nova' }));
  });

  await check('super_admin cria uma nova unidade (deve SUCEDER)', async () => {
    await assertSucceeds(superAdmin.firestore().doc(`tenants/${TENANT_A}/unidades/unidade-nova`).set({ nome: 'Unidade Nova' }));
  });

  await testEnv.cleanup();

  console.log('\n--- Resumo ---');
  console.log(`Passou: ${passed}`);
  console.log(`Falhou: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Erro ao rodar os testes:', err);
  process.exit(1);
});
