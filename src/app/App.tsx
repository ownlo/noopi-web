import { Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'
import { GameGuidePage } from '../pages/GameGuidePage'
import { PrivacyPolicyPage, TermsPage } from '../pages/LegalPage'
import { OnboardingPage } from '../pages/OnboardingPage'
import { RoomPage } from '../pages/RoomPage'
import { MockModeToggle } from '../components/MockModeToggle'
import { PwaInstallBanner } from '../components/PwaInstallBanner'

export function App() {
  return <><PwaInstallBanner />{import.meta.env.DEV && <MockModeToggle />}<Routes><Route path="/" element={<HomePage />} /><Route path="/privacy" element={<PrivacyPolicyPage />} /><Route path="/terms" element={<TermsPage />} /><Route path="/games/:gameSlug" element={<GameGuidePage />} /><Route path="/create" element={<OnboardingPage mode="create" />} /><Route path="/join" element={<OnboardingPage mode="join" />} /><Route path="/rooms/:roomId" element={<RoomPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></>
}
