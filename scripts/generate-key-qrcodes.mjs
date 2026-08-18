import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import QRCode from 'qrcode'
import { keyInventory } from './keyInventory.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const outputDir = path.join(projectRoot, 'public', 'print', 'qrcodes')
const manifestFile = path.join(outputDir, 'manifest.json')

const slugify = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const buildPrintFileName = (key) => `${key.qrCode}-${slugify(key.name)}.png`

const main = async () => {
  await rm(outputDir, { recursive: true, force: true })
  await mkdir(outputDir, { recursive: true })

  const manifest = []

  for (const key of keyInventory) {
    const fileName = buildPrintFileName(key)
    const filePath = path.join(outputDir, fileName)

    await QRCode.toFile(filePath, key.qrCode, {
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
      id: key.id,
      label: key.name,
      code: key.qrCode,
      qrCodeId: key.qrCode,
      location: 'SENAI CRTI',
      description: `Chave da sala ${key.name}`,
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