import { readFileSync } from 'node:fs'
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import ts from 'typescript'

const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const load = source => import(`data:text/javascript;base64,${Buffer.from(compile(source)).toString('base64')}`)
const { UnderMineMock } = await load(readFileSync(new URL('../src/mocks/undermineMock.ts', import.meta.url), 'utf8'))
const players = Array.from({ length: 4 }, (_, index) => ({ playerId: index + 1, nickname: `Player ${index + 1}`, gender: 'MALE', host: index === 0, connectionStatus: 'CONNECTED', currentGameParticipant: true }))

function playFive(mock) {
  for (let index = 0; index < 5; index += 1) {
    const state = mock.snapshot(1)
    assert.equal(state.phase, 'PLAYING')
    const option = state.cardOptions[0]
    assert.ok(option)
    if (option.actionType === 'PLACE_PATH') mock.play(1, { cardId: option.cardId, actionType: option.actionType, placement: { ...option.placements[0], rotation: option.placements[0].rotations[0] } })
    else if (option.actionType === 'BREAK_TOOL') mock.play(1, { cardId: option.cardId, actionType: option.actionType, targetPlayerId: option.targets[0].playerId, toolType: option.targets[0].toolType })
    else if (option.actionType === 'REPAIR_TOOL') mock.play(1, { cardId: option.cardId, actionType: option.actionType, targetPlayerId: option.targets[0].playerId })
    else if (option.actionType === 'USE_MAP') mock.play(1, { cardId: option.cardId, actionType: option.actionType, goalId: `goal-${option.goalPositions[0].y}` })
    else mock.play(1, { cardId: option.cardId, actionType: option.actionType, targetBoardCardId: option.targetBoardCardIds[0] })
  }
}

test('keeps the role private and exposes server-approved card targets', () => {
  const mock = new UnderMineMock(players)
  assert.equal(mock.snapshot(1).phase, 'READY')
  mock.start()
  const role = mock.snapshot(1)
  assert.equal(role.phase, 'ROLE_REVEAL')
  assert.deepEqual(role.allowedActions, ['CHECK_ROLE'])
  mock.confirmRole()
  const playing = mock.snapshot(1)
  assert.equal(playing.phase, 'PLAYING')
  assert.deepEqual(playing.players.find(player => player.playerId === 1).brokenTools, ['PICKAXE'])
  assert.ok(!playing.cardOptions.some(option => option.actionType === 'PLACE_PATH'))
  const repair = playing.cardOptions.find(option => option.actionType === 'REPAIR_TOOL')
  assert.ok(repair)
  assert.deepEqual(repair.targets, [{ playerId: 1 }])
  const breakOptions = playing.cardOptions.filter(option => option.actionType === 'BREAK_TOOL')
  assert.equal(breakOptions.length, 1)
  assert.ok(breakOptions.every(option => option.targets.every(target => target.playerId !== 1)))
  assert.ok(breakOptions.every(option => new Set(option.targets.map(target => target.toolType)).size === 1))
  assert.deepEqual(playing.allowedActions, ['PLAY_CARD'])
  assert.throws(() => mock.play(1, { cardId: playing.myHand[0].cardId, actionType: 'DISCARD_CARD' }), error => error.code === 'CARD_DISCARD_NOT_ALLOWED')
})

test('offers only connected path placements and validates the chosen coordinate and rotation', () => {
  const mock = new UnderMineMock(players)
  mock.start(); mock.confirmRole()
  let playing = mock.snapshot(1)
  const repair = playing.cardOptions.find(option => option.actionType === 'REPAIR_TOOL')
  mock.play(1, { cardId: repair.cardId, actionType: 'REPAIR_TOOL', targetPlayerId: 1 })

  playing = mock.snapshot(1)
  const straightCard = playing.myHand.find(card => card.pathPatternCode === 'PATH_STRAIGHT_HORIZONTAL')
  const straight = playing.cardOptions.find(option => option.cardId === straightCard.cardId && option.actionType === 'PLACE_PATH')
  assert.deepEqual(straight.placements, [{ x: 1, y: 0, rotations: [0, 180] }])
  assert.throws(
    () => mock.play(1, { cardId: straight.cardId, actionType: 'PLACE_PATH', placement: { x: -1, y: 0, rotation: 0 } }),
    error => error.code === 'INVALID_PATH_PLACEMENT',
  )
  assert.throws(
    () => mock.play(1, { cardId: straight.cardId, actionType: 'PLACE_PATH', placement: { x: 0, y: 1, rotation: 0 } }),
    error => error.code === 'INVALID_PATH_PLACEMENT',
  )
  mock.play(1, { cardId: straight.cardId, actionType: 'PLACE_PATH', placement: { x: 1, y: 0, rotation: 0 } })

  playing = mock.snapshot(1)
  const branchCard = playing.myHand.find(card => card.pathPatternCode === 'PATH_NORTH_EAST_WEST')
  const branch = playing.cardOptions.find(option => option.cardId === branchCard.cardId && option.actionType === 'PLACE_PATH')
  assert.ok(branch.placements.some(placement => placement.x === 0 && placement.y === -1 && placement.rotations.length === 1 && placement.rotations[0] === 180))
  assert.ok(branch.placements.some(placement => placement.x === 0 && placement.y === 1 && placement.rotations.length === 1 && placement.rotations[0] === 0))
  assert.ok(branch.placements.some(placement => placement.x === 2 && placement.y === 0 && placement.rotations.length === 2))
  assert.throws(
    () => mock.play(1, { cardId: branch.cardId, actionType: 'PLACE_PATH', placement: { x: 1, y: 0, rotation: 0 } }),
    error => error.code === 'INVALID_PATH_PLACEMENT',
  )
})

test('map action returns its private treasure result only in the command response', () => {
  const mock = new UnderMineMock(players)
  mock.start(); mock.confirmRole()
  const playing = mock.snapshot(1)
  const map = playing.cardOptions.find(option => option.actionType === 'USE_MAP')
  assert.ok(map)
  const handCount = playing.myHand.length
  const drawPileCount = playing.drawPileCount
  const response = mock.play(1, { cardId: map.cardId, actionType: 'USE_MAP', goalId: 'goal-0' })
  assert.deepEqual(response.privateResult, { goalId: 'goal-0', result: 'TREASURE' })
  const refilled = mock.snapshot(1)
  assert.equal(refilled.myHand.length, handCount)
  assert.equal(refilled.drawPileCount, drawPileCount - 1)
})

test('repair card targets only a player and repairs the first broken tool', () => {
  const mock = new UnderMineMock(players)
  mock.start(); mock.confirmRole()
  let playing = mock.snapshot(1)
  const initialRepair = playing.cardOptions.find(option => option.actionType === 'REPAIR_TOOL')
  mock.play(1, { cardId: initialRepair.cardId, actionType: 'REPAIR_TOOL', targetPlayerId: 1 })
  playing = mock.snapshot(1)
  const pickaxe = playing.cardOptions.find(option => option.actionType === 'BREAK_TOOL')
  assert.ok(pickaxe)
  mock.play(1, { cardId: pickaxe.cardId, actionType: 'BREAK_TOOL', targetPlayerId: 2, toolType: 'PICKAXE' })
  playing = mock.snapshot(1)
  const repair = playing.cardOptions.find(option => option.actionType === 'REPAIR_TOOL')
  assert.ok(repair)
  assert.deepEqual(repair.targets.find(target => target.playerId === 2), { playerId: 2 })
  mock.play(1, { cardId: repair.cardId, actionType: 'REPAIR_TOOL', targetPlayerId: 2 })
  playing = mock.snapshot(1)
  assert.deepEqual(playing.players.find(player => player.playerId === 2).brokenTools, [])
})

test('runs all three rounds and produces a final gold ranking', () => {
  const mock = new UnderMineMock(players)
  mock.start(); mock.confirmRole(); playFive(mock)
  assert.equal(mock.snapshot(1).phase, 'GOLD_SELECTION')
  mock.selectGold(1, 'gold-1-3')
  assert.equal(mock.snapshot(1).phase, 'ROUND_RESULT')
  mock.nextRound(); mock.confirmRole(); playFive(mock)
  assert.equal(mock.snapshot(1).phase, 'ROUND_RESULT')
  mock.nextRound(); mock.confirmRole(); playFive(mock)
  assert.equal(mock.snapshot(1).phase, 'GOLD_SELECTION')
  mock.selectGold(1, 'gold-3-2')
  const finished = mock.snapshot(1)
  assert.equal(finished.phase, 'FINISHED')
  assert.equal(finished.rankings.length, players.length)
  assert.deepEqual(finished.rankings.map(player => player.rank), [1, 2, 3, 3])
  assert.equal(finished.rankings[2].gold, finished.rankings[3].gold)
  assert.equal(finished.roundResults.length, 3)
})

test('HTTP card action preserves the request body and idempotency key', async () => {
  const source = readFileSync(new URL('../src/api/httpApi.ts', import.meta.url), 'utf8')
    .replace("import { getClientId } from '../features/client/clientId'", "const getClientId = () => 'test-client'")
    .replaceAll('import.meta.env.VITE_API_BASE_URL', "'http://localhost/api'")
    .replaceAll('import.meta.env.VITE_WS_URL', "'ws://localhost/ws'")
  const { httpApi } = await load(source)
  const original = globalThis.fetch
  let request
  try {
    globalThis.fetch = async (url, init) => { request = { url, ...init }; return new Response(null, { status: 204 }) }
    const input = { cardId: 'hand-1', actionType: 'DESTROY_PATH', targetBoardCardId: 'path-9' }
    await httpApi.playUnderMineCard(10, 20, input, 'request-id')
    assert.equal(request.url, 'http://localhost/api/rooms/10/game-sessions/20/undermine/card-plays')
    assert.equal(request.body, JSON.stringify(input))
    assert.equal(request.headers['Idempotency-Key'], 'request-id')
  } finally { globalThis.fetch = original }
})
