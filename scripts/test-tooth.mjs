import { readFileSync } from 'node:fs'
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import ts from 'typescript'

const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const load = source => import(`data:text/javascript;base64,${Buffer.from(compile(source)).toString('base64')}`)
const { ToothMock } = await load(readFileSync(new URL('../src/mocks/toothMock.ts', import.meta.url), 'utf8'))
const players = count => Array.from({ length: count }, (_, index) => ({ playerId: index + 1, nickname: `Player ${index + 1}`, gender: 'MALE', host: index === 0, connectionStatus: 'CONNECTED', currentGameParticipant: true }))

test('supports only 2–8 players and exposes exactly 24 teeth', () => {
  for (const count of [1, 9]) assert.throws(() => new ToothMock(players(count)))
  for (const count of [2, 8]) {
    const state = new ToothMock(players(count), () => .999).snapshot(1)
    assert.equal(state.phase, 'PLAYING')
    assert.equal(state.teeth.length, 24)
    assert.deepEqual(state.teeth.slice(0, 12).map(tooth => tooth.row), Array(12).fill('UPPER'))
    assert.deepEqual(state.teeth.slice(12).map(tooth => tooth.row), Array(12).fill('LOWER'))
  }
})

test('only the current player can select and a safe tooth advances one turn', () => {
  const mock = new ToothMock(players(3), () => .999)
  const first = mock.snapshot(1)
  assert.equal(first.currentTurnPlayerId, 1)
  assert.deepEqual(first.allowedActions, ['SELECT_TOOTH'])
  assert.deepEqual(mock.snapshot(2).allowedActions, [])
  assert.throws(() => mock.select(2, 1, 'wrong-player'))
  const result = mock.select(1, 1, 'safe-1')
  assert.equal(result.outcome, 'SAFE')
  assert.equal(result.nextCurrentTurnPlayerId, 2)
  const next = mock.snapshot(2)
  assert.equal(next.remainingToothCount, 23)
  assert.equal(next.teeth[0].status, 'SELECTED')
  assert.deepEqual(next.allowedActions, ['SELECT_TOOTH'])
  assert.throws(() => mock.select(2, 1, 'duplicate-tooth'))
})

test('idempotent retries do not select twice and the bomb ends immediately', () => {
  const safe = new ToothMock(players(2), () => .999)
  const first = safe.select(1, 2, 'same-request')
  const retry = safe.select(1, 2, 'same-request')
  assert.deepEqual(retry, first)
  assert.equal(safe.snapshot(2).remainingToothCount, 23)

  const bomb = new ToothMock(players(2), () => 0)
  const currentPlayerId = bomb.snapshot(1).currentTurnPlayerId
  const result = bomb.select(currentPlayerId, 1, 'bomb')
  assert.equal(result.outcome, 'BOMB')
  assert.equal(result.nextCurrentTurnPlayerId, null)
  const finished = bomb.snapshot(currentPlayerId)
  assert.equal(finished.phase, 'FINISHED')
  assert.equal(finished.result.loserPlayer.playerId, currentPlayerId)
  assert.equal(finished.result.bombToothId, 1)
  assert.deepEqual(finished.allowedActions, [])
  assert.throws(() => bomb.select(currentPlayerId, 2, 'after-finish'))
})

test('HTTP selection sends the tooth id and idempotency key', async () => {
  const source = readFileSync(new URL('../src/api/httpApi.ts', import.meta.url), 'utf8')
    .replace("import { getClientId } from '../features/client/clientId'", "const getClientId = () => 'test-client'")
    .replaceAll('import.meta.env.VITE_API_BASE_URL', "'http://localhost/api'")
    .replaceAll('import.meta.env.VITE_WS_URL', "'ws://localhost/ws'")
  const { httpApi } = await load(source)
  const original = globalThis.fetch
  let request
  try {
    globalThis.fetch = async (url, init) => {
      request = { url, ...init }
      return new Response(JSON.stringify({ sequence: 1, playerId: 1, toothId: 7, outcome: 'SAFE', nextCurrentTurnPlayerId: 2 }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const response = await httpApi.selectTooth(10, 20, 7, 'request-id')
    assert.equal(response.outcome, 'SAFE')
    assert.equal(request.url, 'http://localhost/api/rooms/10/game-sessions/20/tooth/selections')
    assert.equal(request.method, 'POST')
    assert.equal(request.body, JSON.stringify({ toothId: 7 }))
    assert.equal(request.headers['Idempotency-Key'], 'request-id')
    assert.equal(request.headers['X-Client-Id'], 'test-client')
  } finally { globalThis.fetch = original }
})
