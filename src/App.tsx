import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from '@/modules/auth/context/AuthContext'
import { LoginPage } from '@/modules/auth/LoginPage'
import { MainLayout } from '@/components/MainLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'

function AppContent() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-center" richColors />
        <LoginPage />
      </>
    )
  }

  return (
    <>
      <Toaster position="top-center" richColors />
      <MainLayout />
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  )
}
