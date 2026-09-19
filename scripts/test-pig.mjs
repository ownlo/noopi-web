import { readFileSync } from 'node:fs'
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import ts from 'typescript'

const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const load = source => import(`data:text/javascript;base64,${Buffer.from(compile(source)).toString('base64')}`)
const { PigMock } = await load(readFileSync(new URL('../src/mocks/pigMock.ts', import.meta.url), 'utf8'))
const players = n => Array.from({ length: n }, (_, i) => ({ playerId: i + 1, nickname: `Player ${i + 1}` }))
let sequence = 0
const act = (mock, id, action) => mock.act(id, action, String(++sequence))

test('remote dice restarts rotation after StrictMode setup/cleanup replay', async () => {
  const refs = []
  const layouts = []
  const effects = []
  const animations = []
  const originalStyle = globalThis.getComputedStyle
  const originalHooks = globalThis.__pigHooks
  globalThis.__pigHooks = {
    useRef: value => { const ref = { current: value }; refs.push(ref); return ref },
    useLayoutEffect: setup => layouts.push(setup),
    useEffect: setup => effects.push(setup),
    useState: value => [value, () => {}],
  }
  globalThis.getComputedStyle = () => ({ transform: 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)' })
  try {
    const source = readFileSync(new URL('../src/features/games/pig/PigDice.tsx', import.meta.url), 'utf8')
      .replace(/import \{[^}]+\} from 'react'/, 'const { useEffect, useLayoutEffect, useRef, useState } = globalThis.__pigHooks; const React = { createElement: () => null }')
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText
    const { PigDice } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
    PigDice({ value: 4, motion: 'rolling' })
    refs[0].current = { animate: (_frames, options) => {
      const animation = { playState: 'running', options, cancel() { this.playState = 'idle' } }
      animations.push(animation)
      return animation
    } }
    layouts[0]()
    const cleanup = effects.at(-1)()
    assert.equal(animations.length, 1)
    cleanup()
    assert.equal(animations[0].playState, 'idle')
    layouts[0]()
    assert.equal(animations.length, 2)
    assert.equal(animations[1].playState, 'running')
    assert.equal(animations[1].options.iterations, Infinity)
    layouts[0]()
    assert.equal(animations.length, 2, 'a live spin must not restart on state refresh')
    effects.at(-1)()()
    assert.equal(animations[1].playState, 'idle')
  } finally {
    globalThis.getComputedStyle = originalStyle
    globalThis.__pigHooks = originalHooks
  }
})

test('only 2–6 participants and current-player actions are allowed', () => {
  for (const n of [1, 7]) assert.throws(() => new PigMock(players(n)))
  for (const n of [2, 6]) assert.equal(new PigMock(players(n)).snapshot(1).phase, 'PLAYING')
  const mock = new PigMock(players(2))
  assert.deepEqual(mock.snapshot(1).allowedActions, ['ROLL'])
  assert.deepEqual(mock.snapshot(2).allowedActions, [])
  assert.throws(() => act(mock, 1, 'STOP'))
  assert.throws(() => act(mock, 2, 'ROLL'))
})

test('successful faces disappear, risk increases, bust preserves banked points', () => {
  let random = .99
  const mock = new PigMock(players(2), () => random)
  act(mock, 1, 'ROLL')
  assert.equal(mock.snapshot(1).turnScore, 6)
  assert.equal(mock.snapshot(1).bustProbability, .2)
  assert.deepEqual(mock.snapshot(1).removedDiceValues, [6])
  mock.act(1, 'ROLL', 'same-request')
  mock.act(1, 'ROLL', 'same-request')
  assert.equal(mock.snapshot(1).turnScore, 11)
  act(mock, 1, 'STOP')
  random = 0
  act(mock, 2, 'ROLL')
  random = .99
  act(mock, 1, 'ROLL')
  random = 0
  act(mock, 1, 'ROLL')
  const view = mock.snapshot(1)
  assert.equal(view.lostTurnScore, 6)
  assert.equal(view.lastTurnOutcome, 'BUSTED')
  assert.equal(view.players[0].totalScore, 11)
  assert.deepEqual(view.availableDiceValues, [1, 2, 3, 4, 5, 6])
})

test('all five successes leave only 1 and a 100% bust chance', () => {
  const mock = new PigMock(players(2), () => .99)
  for (let i = 0; i < 5; i++) act(mock, 1, 'ROLL')
  assert.equal(mock.snapshot(1).turnScore, 20)
  assert.equal(mock.snapshot(1).bustProbability, 1)
  act(mock, 1, 'ROLL')
  assert.equal(mock.snapshot(1).lostTurnScore, 20)
})

test('finish order is preserved, finishers spectate, last player ranks automatically', () => {
  const mock = new PigMock(players(3), () => .99)
  for (let turn = 0; turn < 200; turn++) {
    const view = mock.snapshot(1)
    if (view.phase === 'FINISHED') {
      assert.deepEqual(view.rankings.map(p => p.playerId), [1, 2, 3])
      assert.ok(view.rankings[2].totalScore < 50)
      assert.deepEqual(view.allowedActions, [])
      return
    }
    if (view.players[0].status === 'FINISHED') assert.deepEqual(view.allowedActions, [])
    act(mock, view.currentPlayerId, view.turnScore >= 15 ? 'STOP' : 'ROLL')
  }
  assert.fail('game did not finish')
})

test('HTTP commands are bodyless, personalized and carry idempotency keys', async () => {
  const source = readFileSync(new URL('../src/api/httpApi.ts', import.meta.url), 'utf8')
    .replace("import { getClientId } from '../features/client/clientId'", "const getClientId = () => 'test-client'")
    .replaceAll('import.meta.env.VITE_API_BASE_URL', "'http://localhost/api'")
    .replaceAll('import.meta.env.VITE_WS_URL', "'ws://localhost/ws'")
  const { httpApi } = await load(source)
  const original = globalThis.fetch
  let request
  try {
    globalThis.fetch = async (url, init) => { request = { url, ...init }; return new Response(null, { status: 204 }) }
    for (const [method, endpoint] of [['rollPig', 'roll'], ['stopPig', 'stop']]) {
      assert.equal(await httpApi[method](1, 2, 'request-id'), undefined)
      assert.equal(request.url, `http://localhost/api/rooms/1/game-sessions/2/pig/${endpoint}`)
      assert.equal(request.method, 'POST')
      assert.equal(request.body, undefined)
      assert.equal(request.headers['Idempotency-Key'], 'request-id')
      assert.equal(request.headers['X-Client-Id'], 'test-client')
    }
  } finally { globalThis.fetch = original }
})
