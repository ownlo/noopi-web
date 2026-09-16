import { readFileSync } from 'node:fs'
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../src/features/games/yut/yutBoardPresentation.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { boardNodes, confirmedMovePoints } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const ids = (from, to) => confirmedMovePoints(from, to).map(p => p.id)

test('all 29 board locations have unique IDs and visible coordinates', () => {
  assert.equal(boardNodes.length, 29)
  assert.equal(new Set(boardNodes.map(p => p.id)).size, 29)
  assert.ok(boardNodes.every(p => p.x >= 12 && p.x <= 88 && p.y >= 12 && p.y <= 88))
})
test('confirmed outer and shortcut movement displays each hop', () => {
  assert.deepEqual(ids(null, 'OUTER_2'), ['OUTER_20', 'OUTER_1', 'OUTER_2'])
  assert.deepEqual(ids('OUTER_5', 'CENTER_3'), ['OUTER_5', 'CENTER_1', 'CENTER_2', 'CENTER_3'])
  assert.deepEqual(ids('OUTER_10', 'CENTER_3'), ['OUTER_10', 'CENTER_6', 'CENTER_7', 'CENTER_3'])
  assert.deepEqual(ids('CENTER_3', 'OUTER_15'), ['CENTER_3', 'CENTER_4', 'CENTER_5', 'OUTER_15'])
  assert.deepEqual(ids('CENTER_3', 'OUTER_20'), ['CENTER_3', 'CENTER_8', 'CENTER_9', 'OUTER_20'])
  assert.deepEqual(ids('OUTER_19', null), ['OUTER_19', 'OUTER_20', 'OUTER_20'])
  assert.deepEqual(ids('OUTER_4', 'OUTER_7'), ['OUTER_4', 'OUTER_5', 'OUTER_6', 'OUTER_7'])
})
test('unknown/unreachable paths are not fabricated', () => {
  assert.deepEqual(ids('UNKNOWN', 'CENTER_3'), [])
  assert.deepEqual(ids('OUTER_2', 'OUTER_1'), ['OUTER_2', 'OUTER_1'])
  assert.deepEqual(ids('OUTER_1', 'OUTER_20'), ['OUTER_1', 'OUTER_20'])
  assert.deepEqual(ids('OUTER_20', null), ['OUTER_20', 'OUTER_20'])
})
test('HTTP adapter accepts empty 202 responses and sends throws without body', async () => {
  const source = readFileSync(new URL('../src/api/httpApi.ts', import.meta.url), 'utf8')
    .replace("import { getClientId } from '../features/client/clientId'", "const getClientId = () => 'test-client'")
    .replaceAll('import.meta.env.VITE_API_BASE_URL', "'http://localhost/api'")
    .replaceAll('import.meta.env.VITE_WS_URL', "'ws://localhost/ws'")
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  const { httpApi } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
  const original = globalThis.fetch
  let request
  try {
    globalThis.fetch = async (url, init) => { request = { url, ...init }; return new Response(null, { status: 202 }) }
    assert.equal(await httpApi.selectYutPiece(1, 2, '1-1'), undefined)
    assert.equal(request.url, 'http://localhost/api/rooms/1/game-sessions/2/yut/piece-selections')
    globalThis.fetch = async (url, init) => { request = { url, ...init }; return Response.json({ result: 'GAE', steps: 2 }) }
    assert.equal((await httpApi.throwYut(1, 2)).result, 'GAE')
    assert.equal(request.body, undefined)
  } finally { globalThis.fetch = original }
})

test('mock forces back-do so two local pieces stack on the first node', async () => {
  const originalWindow = globalThis.window
  const originalSessionStorage = globalThis.sessionStorage
  const storage = new Map([['noopi.mockPlayerCount', '2'], ['noopi.mockYutQuickFinish', 'false']])
  globalThis.window = { setTimeout, clearTimeout }
  globalThis.sessionStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  }
  try {
    const source = readFileSync(new URL('../src/mocks/mockApi.ts', import.meta.url), 'utf8')
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    const { mockApi } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
    await mockApi.createRoom({ nickname: '누피', gender: 'MALE' })
    await mockApi.createGameSession(100, 'YUT', { mode: 'INDIVIDUAL' })
    await mockApi.startGame()
    let state = await mockApi.getRoomState()
    const localPiece = state.gameSession.gameState.pieces.find(piece => piece.pieceId === '1-1')
    const localPieceBehind = state.gameSession.gameState.pieces.find(piece => piece.pieceId === '1-2')
    assert.equal(localPiece.nodeId, 'OUTER_2')
    assert.equal(localPieceBehind.nodeId, 'OUTER_1')
    const thrown = await mockApi.throwYut()
    assert.equal(thrown.result, 'BACK_DO')
    assert.equal(thrown.steps, -1)
    state = await mockApi.getRoomState()
    assert.equal(state.gameSession.gameState.myAction.type, 'SELECT_MOVE_TOKEN')
    await mockApi.selectYutMoveToken(100, 500, thrown.moveTokenId)
    await mockApi.selectYutPiece(100, 500, '1-1')

    state = await mockApi.getRoomState()
    assert.equal(state.gameSession.gameState.pieces.find(piece => piece.pieceId === '1-1').nodeId, 'OUTER_1')
    assert.deepEqual(state.gameSession.gameState.pieces.find(piece => piece.pieceId === '1-1').groupPieceIds, ['1-1', '1-2'])
    assert.deepEqual(state.gameSession.gameState.pieces.find(piece => piece.pieceId === '1-2').groupPieceIds, ['1-1', '1-2'])
    assert.equal(state.me.playerId, 1)
    assert.equal(state.gameSession.gameState.turn.currentPlayerId, 2)
    assert.equal(state.gameSession.gameState.myAction, null)

    await new Promise(resolve => setTimeout(resolve, 3_000))
    state = await mockApi.getRoomState()
    assert.equal(state.gameSession.gameState.turn.currentPlayerId, 1)
    assert.equal(state.gameSession.gameState.myAction.type, 'THROW_YUT')
  } finally {
    globalThis.window = originalWindow
    globalThis.sessionStorage = originalSessionStorage
  }
})
