import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { validateManifest } from './validate-manifests.mjs'

const validatorPath = fileURLToPath(new URL('./validate-manifests.mjs', import.meta.url))
const readManifest = (relativePath) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8'))

const clone = (value) => JSON.parse(JSON.stringify(value))
const FILE = 'manifests/test/stable.json'

const CLOUD_VALID = {
  schemaVersion: 1,
  product: 'javdbviewed-cloud',
  channel: 'stable',
  releaseStatus: 'released',
  latest: {
    version: '1.2.6',
    commit: '4d337cfacfceadfab428a4d8f5f3aa025a366dda',
    buildNumber: 'git-4d337cfacfce',
    releasedAt: '2026-10-30T02:36:36Z',
    image: 'ghcr.io/javdbviewed/javdbviewed-cloud:1.2.6',
    imageDigest: 'sha256:bd80675b48426e04db3ac59ab02d78b65a0244675556f2a533e708687a1b480b',
    releaseNotesUrl: 'https://github.com/JavdBviewed/JavdBviewed-release/blob/main/releases/cloud/v1.2.6.md',
    critical: false,
    security: false,
    requiresBackup: true,
    migrationRisk: 'low',
    minCurrentVersion: '1.0.0',
  },
}

const MOBILE_VALID = {
  schemaVersion: 1,
  product: 'javdbviewed-mobile',
  channel: 'stable',
  releaseStatus: 'released',
  latest: {
    version: '1.0.3',
    versionCode: 42,
    tag: 'mobile-v42',
    commit: 'b5eaf2df88afbb91a599624e53844fd56daeb537',
    buildNumber: 'git-b5eaf2df88af',
    releasedAt: '2026-10-14T16:25:06Z',
    artifacts: [
      {
        path: 'app-arm64-v8a-release.apk',
        size: 61404869,
        sha256: '278d3d19962685849e9aafafac2c7b9b13b21bb5b9a8faeb494ebbd7409c2b75',
        downloadUrl: 'https://github.com/JavdBviewed/JavdBviewed-release/releases/download/mobile-v42/app-arm64-v8a-release.apk',
      },
    ],
    releaseNotesUrl: 'https://github.com/JavdBviewed/JavdBviewed-release/blob/main/releases/mobile/v1.0.3.md',
    critical: false,
    security: false,
    requiresBackup: false,
  },
}

const DESKTOP_VALID = {
  schemaVersion: 1,
  product: 'javdbviewed-desktop',
  channel: 'stable',
  releaseStatus: 'released',
  latest: {
    version: '1.0.0',
    tag: 'desktop-v1.0.0',
    commit: 'c24ab3cac276b20be3eef0ea09b26f20706a198d',
    buildNumber: 'git-c24ab3cac276',
    releasedAt: '2026-11-01T00:00:00Z',
    artifacts: [
      {
        path: 'JavdBviewed-desktop-1.0.0-win-x64.exe',
        size: 88000000,
        sha256: 'd'.repeat(64),
        downloadUrl: 'https://github.com/JavdBviewed/JavdBviewed-release/releases/download/desktop-v1.0.0/JavdBviewed-desktop-1.0.0-win-x64.exe',
      },
    ],
    releaseNotesUrl: 'https://github.com/JavdBviewed/JavdBviewed-release/blob/main/releases/desktop/v1.0.0.md',
    critical: false,
    security: false,
    requiresBackup: false,
  },
}

function accessors(path) {
  const list = []
  for (const raw of path.split('.')) {
    list.push(raw.replace(/\[.*\]$/, ''))
    for (const m of raw.matchAll(/\[(\d+)\]/g)) list.push(Number(m[1]))
  }
  return list
}

function setDeep(base, path, value) {
  const copy = clone(base)
  const list = accessors(path)
  let node = copy
  for (let i = 0; i < list.length - 1; i += 1) node = node[list[i]]
  node[list[list.length - 1]] = value
  return copy
}

function omitDeep(base, path) {
  const copy = clone(base)
  const list = accessors(path)
  let node = copy
  for (let i = 0; i < list.length - 1; i += 1) node = node[list[i]]
  delete node[list[list.length - 1]]
  return copy
}

function mustPass(manifest) {
  validateManifest(clone(manifest), FILE)
}

function mustReject(manifest, pattern) {
  assert.throws(
    () => validateManifest(clone(manifest), FILE),
    (error) => {
      assert.ok(error instanceof Error, 'expected an Error to be thrown')
      assert.match(error.message, pattern)
      return true
    },
  )
}

let passed = 0
function test(name, fn) {
  fn()
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

const realCloud = readManifest('../manifests/cloud/stable.json')
const realMobile = readManifest('../manifests/mobile/stable.json')

test('cloud: 样例正例通过', () => mustPass(CLOUD_VALID))
test('cloud: 仓内真实文件通过', () => mustPass(realCloud))
test('cloud: 缺 migrationRisk 拒', () => mustReject(omitDeep(CLOUD_VALID, 'latest.migrationRisk'), /migrationRisk/))
test('cloud: version 非 semver 拒', () => mustReject(setDeep(CLOUD_VALID, 'latest.version', '1.2'), /latest.version/))
test('cloud: image 非 GHCR 前缀拒', () => mustReject(setDeep(CLOUD_VALID, 'latest.image', 'docker.io/foo:1'), /latest.image/))
test('cloud: requiresBackup 非 boolean 拒', () => mustReject(setDeep(CLOUD_VALID, 'latest.requiresBackup', 'yes'), /requiresBackup/))

test('mobile: 样例正例通过', () => mustPass(MOBILE_VALID))
test('mobile: 仓内真实文件通过', () => mustPass(realMobile))
test('mobile: 缺 artifacts 拒', () => mustReject(omitDeep(MOBILE_VALID, 'latest.artifacts'), /artifacts/))
test('mobile: artifact 缺 sha256 拒', () => mustReject(omitDeep(MOBILE_VALID, 'latest.artifacts[0].sha256'), /sha256/))
test('mobile: sha256 非 64hex 拒', () => mustReject(setDeep(MOBILE_VALID, 'latest.artifacts[0].sha256', 'ZZZ'), /sha256/))
test('mobile: size 非正整数拒', () => mustReject(setDeep(MOBILE_VALID, 'latest.artifacts[0].size', 0), /size/))
test('mobile: versionCode 小数拒', () => mustReject(setDeep(MOBILE_VALID, 'latest.versionCode', 4.5), /versionCode/))
test('mobile: versionCode 字符串拒', () => mustReject(setDeep(MOBILE_VALID, 'latest.versionCode', '42'), /versionCode/))
test('mobile: versionCode 0 拒', () => mustReject(setDeep(MOBILE_VALID, 'latest.versionCode', 0), /versionCode/))
test('mobile: tag 前缀错拒', () => mustReject(setDeep(MOBILE_VALID, 'latest.tag', 'desktop-v1.0.0'), /latest.tag/))
test('mobile: tag 非纯数字拒', () => mustReject(setDeep(MOBILE_VALID, 'latest.tag', 'mobile-vX'), /latest.tag/))
test('mobile: 缺 requiresBackup 拒', () => mustReject(omitDeep(MOBILE_VALID, 'latest.requiresBackup'), /requiresBackup/))
test('mobile: 缺 releaseNotesUrl 拒', () => mustReject(omitDeep(MOBILE_VALID, 'latest.releaseNotesUrl'), /releaseNotesUrl/))

test('desktop: 样例正例通过', () => mustPass(DESKTOP_VALID))
test('desktop: 缺 releaseNotesUrl 拒', () => mustReject(omitDeep(DESKTOP_VALID, 'latest.releaseNotesUrl'), /releaseNotesUrl/))
test('desktop: 缺 critical 拒', () => mustReject(omitDeep(DESKTOP_VALID, 'latest.critical'), /critical/))
test('desktop: 缺 security 拒', () => mustReject(omitDeep(DESKTOP_VALID, 'latest.security'), /security/))
test('desktop: sha256 非 64hex 拒', () => mustReject(setDeep(DESKTOP_VALID, 'latest.artifacts[0].sha256', 'x'.repeat(63)), /sha256/))
test('desktop: tag 前缀错拒', () => mustReject(setDeep(DESKTOP_VALID, 'latest.tag', 'mobile-v42'), /latest.tag/))
test('desktop: version 非 semver 拒', () => mustReject(setDeep(DESKTOP_VALID, 'latest.version', '1.0'), /latest.version/))
test('desktop: 额外 versionCode 不拒（extra 字段不参与断言，与 cloud 现口径一致）', () => mustPass(setDeep(DESKTOP_VALID, 'latest.versionCode', 42)))

test('unknown: 未知 product 拒', () => mustReject(setDeep(MOBILE_VALID, 'product', 'javdbviewed-tv'), /unsupported product/))

test('CLI e2e: 实跑脚本对仓内 cloud+mobile 全过 exit 0', () => {
  const output = execFileSync(process.execPath, [validatorPath], { encoding: 'utf8' })
  assert.match(output, /OK .*manifests\/cloud\/stable\.json/)
  assert.match(output, /OK .*manifests\/mobile\/stable\.json/)
})

console.log(`# pass ${passed} tests`)
assert.equal(passed, 29)
