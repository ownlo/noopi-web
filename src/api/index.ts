import type { NoopiApi } from './types'
import { httpApi } from './httpApi'
import { mockApi } from '../mocks/mockApi'
export const isMockMode = import.meta.env.VITE_USE_MOCK_API !== 'false'
export const api: NoopiApi = isMockMode ? mockApi : httpApi
