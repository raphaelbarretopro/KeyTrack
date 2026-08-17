import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import QRCode from 'qrcode'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const sourceFile = path.join(projectRoot, 'src', 'features', 'keys', 'data', 'mockKeys.ts')
const outputDir = path.join(projectRoot, 'public', 'print', 'qrcodes')
const manifestFile = path.join(outputDir, 'manifest.json')

const slugify = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const extractKeys = (source) => {
  const arrayMatch = source.match(/export const mockKeysSeed: KeyRecord\[\] = \[(?<body>[\s\S]*?)\n\]/)
  if (!arrayMatch?.groups?.body) {
    throw new Error('Nao foi possivel localizar o array mockKeysSeed para gerar os QR codes.')
  }

  const objectPattern = /\{\s*id: '([^']+)',[\s\S]*?label: '([^']+)',[\s\S]*?code: '([^']+)',[\s\S]*?qrCodeId: '([^']+)',[\s\S]*?location: '([^']+)',[\s\S]*?description: '([^']+)',[\s\S]*?\}/g
  const keys = []

  for (const match of arrayMatch.groups.body.matchAll(objectPattern)) {
    keys.push({
      id: match[1],
      label: match[2],
      code: match[3],
      qrCodeId: match[4],
      location: match[5],
      description: match[6],
    })
  }

  if (!keys.length) {
    throw new Error('Nenhuma chave foi extraida de mockKeysSeed para gerar os QR codes.')
  }

  return keys
}

const buildPrintFileName = (key) => `${key.code}-${slugify(key.label)}.png`

const main = async () => {
  const source = await readFile(sourceFile, 'utf8')
  const keys = extractKeys(source)

  await mkdir(outputDir, { recursive: true })

  const manifest = []

  for (const key of keys) {
    const fileName = buildPrintFileName(key)
    const filePath = path.join(outputDir, fileName)

    await QRCode.toFile(filePath, key.qrCodeId, {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 2,
      width: 1200,
      color: {
        dark: '#0f172a',
        light: '#ffffffff',
      },
    })

    manifest.push({
      ...key,
      fileName,
      relativePath: path.posix.join('public', 'print', 'qrcodes', fileName),
    })
  }

  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  console.log(`QR codes gerados: ${manifest.length}`)
  console.log(`Saida: ${outputDir}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})