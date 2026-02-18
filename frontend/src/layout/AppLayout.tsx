import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'
import Sidebar from './Sidebar'

function AppLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-charcoal-900">
      {/* TopBar */}
      <TopBar />

      {/* Sidebar */}
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />

      {/* Main Content Area */}
      <main
        className={`pt-16 transition-all duration-300 ${
          isSidebarCollapsed ? 'ml-18' : 'ml-60'
        }`}
      >
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default AppLayout
