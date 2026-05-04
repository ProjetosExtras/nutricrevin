import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './Layout.css'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    if (isMobile) setSidebarOpen(false)
  }, [location.pathname, isMobile])

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)')
    const sync = () => setIsMobile(mql.matches)
    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleToggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen((v) => !v)
    } else {
      setSidebarCollapsed((v) => !v)
    }
  }

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/estoque', label: 'Estoque', icon: '📦' },
    { path: '/vencimentos', label: 'Vencimentos', icon: '⏰' },
    { path: '/limpeza', label: 'Limpeza', icon: '🧹' },
    { path: '/inventario', label: 'Inventário', icon: '📋' },
    { path: '/relatorios', label: 'Relatórios', icon: '📑' },
    { path: '/etiquetas', label: 'Etiquetas', icon: '🏷️' },
  ]

  return (
    <div className="layout-wrapper">
      {/* Sidebar Desktop e Mobile */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <h2 className="brand-full">NutriCrevin</h2>
          <span className="brand-short">NC</span>
        </div>
        
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              title={sidebarCollapsed ? item.label : undefined}
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
            <span className="logout-icon">🚪</span>
            <span className="logout-label">Sair</span>
          </button>
        </div>
      </aside>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Conteúdo Principal */}
      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <header className="top-bar">
          <button 
            className="menu-toggle" 
            onClick={handleToggleSidebar}
            aria-label={isMobile ? 'Abrir menu' : sidebarCollapsed ? 'Expandir navegação' : 'Recolher navegação'}
            aria-expanded={isMobile ? sidebarOpen : !sidebarCollapsed}
          >
            {isMobile ? '☰' : sidebarCollapsed ? '❯' : '❮'}
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
