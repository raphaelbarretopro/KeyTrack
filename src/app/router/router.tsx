import { createHashRouter, RouterProvider } from 'react-router-dom'

import { ProtectedRoute } from '../../features/auth/components/ProtectedRoute'
import { RequireRole } from '../../features/auth/components/RequireRole'
import { LoginPage } from '../../features/auth/pages/LoginPage'
import { MfaPage } from '../../features/auth/pages/MfaPage'
import { DashboardPage } from '../../features/dashboard/pages/DashboardPage'
import { AccessReportsPage } from '../../features/admin/pages/AccessReportsPage'
import { UserRegistrationPage } from '../../features/admin/pages/UserRegistrationPage'
import { ReceptionDashboardPage } from '../../features/reception/pages/ReceptionDashboardPage'
import { RoomMaintenancePage } from '../../features/rooms/pages/RoomMaintenancePage'
import { RoomRegistrationPage } from '../../features/rooms/pages/RoomRegistrationPage'
import { UnitRegistrationPage } from '../../features/units/pages/UnitRegistrationPage'

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
      {
        path: '/reception',
        element: <ReceptionDashboardPage />,
      },
      {
        element: <RequireRole allow={['admin', 'super_admin']} />,
        children: [
          {
            path: '/rooms/new',
            element: <RoomRegistrationPage />,
          },
          {
            path: '/rooms/maintenance',
            element: <RoomMaintenancePage />,
          },
          {
            path: '/admin/users',
            element: <UserRegistrationPage />,
          },
          {
            path: '/reports',
            element: <AccessReportsPage />,
          },
        ],
      },
      {
        element: <RequireRole allow={['super_admin']} />,
        children: [
          {
            path: '/units/new',
            element: <UnitRegistrationPage />,
          },
        ],
      },
    ],
  },
])

export const AppRouter = () => <RouterProvider router={router} />
