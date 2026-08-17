import { AppProviders } from './providers/AppProviders'
import { AppRouter } from './router/router'

const App = () => (
  <AppProviders>
    <AppRouter />
  </AppProviders>
)

export default App