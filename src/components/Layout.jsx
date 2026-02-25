import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './Layout.css'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    
    // Fechar sidebar ao mudar de rota em mobile
    setSidebarOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/estoque', label: 'Estoque', icon: '📦' },
    { path: '/vencimentos', label: 'Vencimentos', icon: '⏰' },
    { path: '/limpeza', label: 'Limpeza', icon: '🧹' },
    { path: '/relatorios', label: 'Relatórios', icon: '📑' },
    { path: '/etiquetas', label: 'Etiquetas', icon: '🏷️' },
  ]

  return (
    <div className="layout-wrapper">
      {/* Sidebar Desktop e Mobile */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>NutriCrevin</h2>
        </div>
        
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <small>{user?.email}</small>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            🚪 Sair
          </button>
        </div>
      </aside>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Conteúdo Principal */}
      <main className="main-content">
        <header className="top-bar">
          <button 
            className="menu-toggle" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Menu"
          >
            ☰
          </button>
          <h1 className="page-title">
            {menuItems.find(i => i.path === location.pathname)?.label || 'NutriCrevin'}
          </h1>
        </header>

        <div className="content-container">
          {children}
        </div>
      </main>
    </div>
  )
}
