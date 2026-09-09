import { Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'
import { OnboardingPage } from '../pages/OnboardingPage'
import { RoomPage } from '../pages/RoomPage'

export function App() {
  return <Routes><Route path="/" element={<HomePage />} /><Route path="/create" element={<OnboardingPage mode="create" />} /><Route path="/join" element={<OnboardingPage mode="join" />} /><Route path="/rooms/:roomId" element={<RoomPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>
}
