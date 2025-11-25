import AppRouter from './routing/main'
import './App.css'
import { SidebarProvider } from './context/SidebarContext'

function App() {
  return (
    <SidebarProvider>
      <AppRouter />
    </SidebarProvider>
  )
}

export default App
