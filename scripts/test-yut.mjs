import { readFileSync } from 'node:fs'
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../src/features/games/yut/yutBoardPresentation.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { boardNodes, confirmedMovePoints, pathChoicePresentation } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
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
test('server path candidates have directional controls on each board fork', () => {
  assert.deepEqual(Object.keys(pathChoicePresentation.OUTER_5), ['OUTER', 'CENTER_SHORTCUT_A'])
  assert.deepEqual(Object.keys(pathChoicePresentation.OUTER_10), ['OUTER', 'CENTER_SHORTCUT_B'])
  assert.deepEqual(Object.keys(pathChoicePresentation.CENTER_3), ['CENTER_SHORTCUT_A', 'CENTER_SHORTCUT_HOME'])
  const playingView = readFileSync(new URL('../src/features/games/yut/YutPlayingView.tsx', import.meta.url), 'utf8')
  const actionDock = readFileSync(new URL('../src/features/games/yut/YutActionDock.tsx', import.meta.url), 'utf8')
  assert.match(playingView, /className="yutBoardPathChoice"/)
  assert.match(playingView, /onClick=\{\(\) => onPath\(choice\.pathId\)\}/)
  assert.doesNotMatch(playingView, /<span>\{pending \? '이동 중' : choice\.label\}<\/span>/)
  assert.match(actionDock, /action\.type === 'SELECT_PATH'\) return null/)
  assert.doesNotMatch(actionDock, /yutDockPaths/)
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

test('move-token dock keeps the final remaining token visible', () => {
  const source = readFileSync(new URL('../src/features/games/yut/YutActionDock.tsx', import.meta.url), 'utf8')
  assert.match(source, /action\.type === 'SELECT_MOVE_TOKEN' && tokens\.length > 0/)
  assert.doesNotMatch(source, /action\.type === 'SELECT_MOVE_TOKEN' && tokens\.length > 1/)
})

test('NAK lands all sticks before one stick bounces out of bounds', () => {
  const scene = readFileSync(new URL('../src/features/games/yut/YutThrowScene.tsx', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../src/features/games/yut/yut-throw.css', import.meta.url), 'utf8')
  const page = readFileSync(new URL('../src/pages/RoomPage.tsx', import.meta.url), 'utf8')
  assert.match(scene, /result === 'NAK' \? '이번 던지기는 무효!'/)
  assert.match(readFileSync(new URL('../src/features/games/yut/YutPlayingView.tsx', import.meta.url), 'utf8'), /active=\{displayedResult !== undefined\}/)
  assert.match(styles, /@keyframes yutNakLand/)
  assert.match(styles, /@keyframes yutNakBounceOut/)
  assert.match(styles, /\.yutFlyingLane:nth-child\(4\) \.yutWoodStick/)
  assert.match(styles, /animation-duration:1\.45s/)
  assert.match(styles, /translate\(var\(--nak-x\),calc\(var\(--land-y\) \+ 62px\)\)/)
  assert.match(page, /result\.result === 'NAK' && existingMoveTokens\.length === 1/)
  assert.match(page, /api\.selectYutMoveToken\(roomId, session!\.gameSessionId, onlyMoveTokenId\)/)
})

test('throw animation waits for confirmed state and replaces an older animation with the latest result', () => {
  const source = readFileSync(new URL('../src/features/games/yut/YutPlayingView.tsx', import.meta.url), 'utf8')
  assert.match(source, /const pendingThrowPower = useRef<number \| null>\(null\)/)
  assert.match(source, /if \(!latest \|\| latest\.sequence <= observedThrow\.current\) return/)
  assert.match(source, /setThrowAnimation\(value => value \+ 1\)\s+setAnimating\(true\)/)
  assert.doesNotMatch(source, /if \(animating\) return\s+setThrowPower/)
  assert.doesNotMatch(source, /setDisplayedResult\(undefined\)\s+setThrowPower\(power\)/)
})

test('mock waits for the NAK animation before the opponent auto-throws', () => {
  const mock = readFileSync(new URL('../src/mocks/mockApi.ts', import.meta.url), 'utf8')
  assert.match(mock, /YUT_NAK_HANDOFF_DELAY_MS = 2_000/)
  assert.match(mock, /scheduleYutOpponentTurn\(turnNo, currentPlayerId, YUT_NAK_HANDOFF_DELAY_MS\)/)
})

test('mock lets finish-ready bots use DO while preserving the NAK fallback', () => {
  const mock = readFileSync(new URL('../src/mocks/mockApi.ts', import.meta.url), 'utf8')
  assert.match(mock, /const quickFinishBot = !thrownByMe && game\.mode === 'INDIVIDUAL'/)
  assert.match(mock, /quickFinishBot \? 'DO'/)
  assert.match(mock, /const firstThrowByOpponent = !thrownByMe && yutOpponentThrowCount === 1/)
  assert.match(mock, /yutOpponentThrowCount = 0/)
})

test('individual play keeps going after a player finishes and ends with rankings', () => {
  const types = readFileSync(new URL('../src/api/types.ts', import.meta.url), 'utf8')
  const views = readFileSync(new URL('../src/features/games/yut/YutViews.tsx', import.meta.url), 'utf8')
  const playing = readFileSync(new URL('../src/features/games/yut/YutPlayingView.tsx', import.meta.url), 'utf8')
  const mock = readFileSync(new URL('../src/mocks/mockApi.ts', import.meta.url), 'utf8')
  assert.match(types, /mode: 'INDIVIDUAL'; rankings: YutRanking\[\]/)
  assert.match(types, /rankings: YutRanking\[\]; myRank: number \| null/)
  assert.match(mock, /rankings\.length >= game\.finishedPieceCounts\.length - 1/)
  assert.match(mock, /const finalRankings = lastPlayer/)
  assert.match(mock, /yutTurnOrder\(game, state, rankings\)/)
  assert.match(playing, /남은 경기를 관전해요/)
  assert.match(playing, /piece\.status === 'FINISHED' \? 'finished'/)
  assert.match(playing, /className="yutRankStamp"/)
  assert.match(playing, /aria-label=\{`\$\{ranking\.rank\}등 완주`\}/)
  assert.match(views, /aria-label="개인전 최종 순위"/)
  assert.match(views, /winner \? 'winner' : last \? 'last'/)
  assert.match(views, /className="yutLastCharacter"/)
  assert.doesNotMatch(views, /state\.winnerPlayer/)
})

test('mock finishes bots in order and assigns the remaining bot last place', async () => {
  const originalWindow = globalThis.window
  const originalSessionStorage = globalThis.sessionStorage
  const storage = new Map([['noopi.mockPlayerCount', '4']])
  globalThis.window = { setTimeout: (callback, delay) => setTimeout(callback, delay > 500 ? 0 : delay), clearTimeout }
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
    const myPieces = state.gameSession.gameState.pieces.filter(piece => piece.ownerId === '1')
    assert.equal(myPieces.length, 4)
    assert.ok(myPieces.every(piece => piece.status === 'ON_BOARD' && piece.nodeId === 'OUTER_20'))
    assert.ok(myPieces.every(piece => piece.groupPieceIds.length === 4 && piece.groupPieceIds.every(id => myPieces.some(candidate => candidate.pieceId === id))))
    assert.ok(state.gameSession.gameState.pieces.filter(piece => piece.ownerId !== '1').every(piece => piece.status === 'READY' && piece.nodeId === null))
    const thrown = await mockApi.throwYut()
    assert.equal(thrown.result, 'GAE')
    assert.equal(thrown.steps, 2)
    assert.notEqual(thrown.moveTokenId, null)
    assert.equal(thrown.bonusThrowGranted, false)
    state = await mockApi.getRoomState()
    assert.equal(state.gameSession.gameState.turn.currentPlayerId, 1)
    assert.deepEqual(state.gameSession.gameState.turn.throwResults, ['GAE'])
    assert.equal(state.gameSession.gameState.turn.moveTokens.length, 1)
    assert.equal(state.gameSession.gameState.myAction.type, 'SELECT_MOVE_TOKEN')
    assert.equal(state.gameSession.gameState.lastThrow.result, 'GAE')

    const gaeToken = state.gameSession.gameState.turn.moveTokens.find(token => token.result === 'GAE')
    await mockApi.selectYutMoveToken(100, state.gameSession.gameSessionId, gaeToken.moveTokenId)
    await mockApi.selectYutPiece(100, state.gameSession.gameSessionId, '1-1')
    await new Promise(resolve => setTimeout(resolve, 50))
    state = await mockApi.getRoomState()
    assert.equal(state.gameSession.gameState.phase, 'FINISHED')
    assert.deepEqual(state.gameSession.gameState.rankings.map(player => player.playerId), [1, 2, 3, 4])
    assert.deepEqual(state.gameSession.gameState.rankings.map(player => player.rank), [1, 2, 3, 4])
  } finally {
    globalThis.window = originalWindow
    globalThis.sessionStorage = originalSessionStorage
  }
})
