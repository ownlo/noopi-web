import { httpApi } from './httpApi'
import { mockApi } from '../mocks/mockApi'
import type { NoopiApi } from './types'

const isMockMode = () => import.meta.env.DEV && sessionStorage.getItem('noopi.mockMode') === 'true'

export const api = new Proxy({} as NoopiApi, {
  get: (_target, key: keyof NoopiApi) => {
    const adapter = isMockMode() ? mockApi : httpApi
    const member = adapter[key]
    return typeof member === 'function' ? member.bind(adapter) : member
  },
})
