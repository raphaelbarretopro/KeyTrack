import { createHashRouter, RouterProvider } from 'react-router-dom'

import { ProtectedRoute } from '../../features/auth/components/ProtectedRoute'
import { LoginPage } from '../../features/auth/pages/LoginPage'
import { MfaPage } from '../../features/auth/pages/MfaPage'
import { DashboardPage } from '../../features/dashboard/pages/DashboardPage'

const router = createHashRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/mfa',
    element: <MfaPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <DashboardPage />,
      },
    ],
  },
])

export const AppRouter = () => <RouterProvider router={router} />