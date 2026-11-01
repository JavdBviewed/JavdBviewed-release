import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../manifests/', import.meta.url))
const semverCore = '\\d+\\.\\d+\\.\\d+(?:[-+][0-9A-Za-z.-]+)?'
const semverPattern = new RegExp(`^${semverCore}$`)
const digestPattern = /^sha256:[a-f0-9]{64}$/
const sha256HexPattern = /^[a-f0-9]{64}$/
const releaseRepoPrefix = 'https://github.com/JavdBviewed/JavdBviewed-release/'
const migrationRisks = new Set(['none', 'low', 'medium', 'high'])
const releaseStatuses = new Set(['preparing', 'released'])
const mobileTagPattern = /^mobile-v\d+$/
const desktopTagPattern = new RegExp(`^desktop-v${semverCore}$`)

async function jsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await jsonFiles(path))
    if (entry.isFile() && entry.name.endsWith('.json')) files.push(path)
  }
  return files
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertBase(manifest, file) {
  assert(manifest?.schemaVersion === 1, `${file}: schemaVersion must be 1`)
  assert(manifest.channel === 'stable', `${file}: unsupported channel`)
  assert(releaseStatuses.has(manifest.releaseStatus), `${file}: releaseStatus must be preparing or released`)
}

function assertLatestCore(latest, file) {
  assert(semverPattern.test(latest?.version ?? ''), `${file}: latest.version must be semver`)
  assert(typeof latest?.commit === 'string' && /^[a-f0-9]{40}$/.test(latest.commit), `${file}: latest.commit must be a full Git SHA`)
  assert(typeof latest?.buildNumber === 'string' && latest.buildNumber.length > 0, `${file}: latest.buildNumber is required`)
  assert(!Number.isNaN(Date.parse(latest?.releasedAt ?? '')), `${file}: latest.releasedAt must be an ISO timestamp`)
}

function assertArtifacts(latest, file) {
  assert(Array.isArray(latest?.artifacts) && latest.artifacts.length > 0, `${file}: latest.artifacts must be a non-empty array`)
  latest.artifacts.forEach((artifact, index) => {
    const label = `${file}: latest.artifacts[${index}]`
    assert(typeof artifact?.path === 'string' && artifact.path.length > 0, `${label}.path must be a non-empty string`)
    assert(Number.isInteger(artifact?.size) && artifact.size > 0, `${label}.size must be a positive integer`)
    assert(typeof artifact?.sha256 === 'string' && sha256HexPattern.test(artifact.sha256), `${label}.sha256 must be a 64 char hex digest`)
    assert(typeof artifact?.downloadUrl === 'string' && artifact.downloadUrl.startsWith(releaseRepoPrefix), `${label}.downloadUrl must be hosted by this repository`)
  })
}

function assertReleaseNotes(latest, file) {
  assert(typeof latest?.releaseNotesUrl === 'string' && latest.releaseNotesUrl.startsWith(releaseRepoPrefix), `${file}: latest.releaseNotesUrl must be hosted by this repository`)
}

function validateCloud(manifest, file) {
  assertBase(manifest, file)
  assertLatestCore(manifest.latest, file)
  assert(typeof manifest.latest?.image === 'string' && manifest.latest.image.startsWith('ghcr.io/javdbviewed/'), `${file}: latest.image must be a JavdBviewed GHCR image`)
  assertReleaseNotes(manifest.latest, file)
  assert(typeof manifest.latest?.requiresBackup === 'boolean', `${file}: latest.requiresBackup must be boolean`)
  assert(migrationRisks.has(manifest.latest?.migrationRisk), `${file}: latest.migrationRisk is invalid`)
  assert(semverPattern.test(manifest.latest?.minCurrentVersion ?? ''), `${file}: latest.minCurrentVersion must be semver`)
  if (manifest.latest.imageDigest) assert(digestPattern.test(manifest.latest.imageDigest), `${file}: latest.imageDigest must be a sha256 digest`)
}

function validateMobile(manifest, file) {
  assertBase(manifest, file)
  assertLatestCore(manifest.latest, file)
  assert(Number.isInteger(manifest.latest?.versionCode) && manifest.latest.versionCode > 0, `${file}: latest.versionCode must be a positive integer`)
  assert(typeof manifest.latest?.tag === 'string' && mobileTagPattern.test(manifest.latest.tag), `${file}: latest.tag must be mobile-v plus digits`)
  assertArtifacts(manifest.latest, file)
  assertReleaseNotes(manifest.latest, file)
  assert(typeof manifest.latest?.critical === 'boolean', `${file}: latest.critical must be boolean`)
  assert(typeof manifest.latest?.security === 'boolean', `${file}: latest.security must be boolean`)
  assert(typeof manifest.latest?.requiresBackup === 'boolean', `${file}: latest.requiresBackup must be boolean`)
}

function validateDesktop(manifest, file) {
  assertBase(manifest, file)
  assertLatestCore(manifest.latest, file)
  assert(typeof manifest.latest?.tag === 'string' && desktopTagPattern.test(manifest.latest.tag), `${file}: latest.tag must be desktop-v plus semver`)
  assertArtifacts(manifest.latest, file)
  assertReleaseNotes(manifest.latest, file)
  assert(typeof manifest.latest?.critical === 'boolean', `${file}: latest.critical must be boolean`)
  assert(typeof manifest.latest?.security === 'boolean', `${file}: latest.security must be boolean`)
  assert(typeof manifest.latest?.requiresBackup === 'boolean', `${file}: latest.requiresBackup must be boolean`)
}

export function validateManifest(manifest, file) {
  assert(manifest?.schemaVersion === 1, `${file}: schemaVersion must be 1`)
  if (manifest.product === 'javdbviewed-cloud') return validateCloud(manifest, file)
  if (manifest.product === 'javdbviewed-mobile') return validateMobile(manifest, file)
  if (manifest.product === 'javdbviewed-desktop') return validateDesktop(manifest, file)
  throw new Error(`${file}: unsupported product`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = await jsonFiles(root)
  assert(files.length > 0, 'No manifest files found')
  for (const file of files) {
    const manifest = JSON.parse(await readFile(file, 'utf8'))
    validateManifest(manifest, file)
    console.log(`OK ${file}`)
  }
}
