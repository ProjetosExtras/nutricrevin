import './App.css'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Estoque from './pages/Estoque'
import Limpeza from './pages/Limpeza'
import Etiquetas from './pages/Etiquetas'
import Relatorios from './pages/Relatorios'
import Vencimentos from './pages/Vencimentos'
import Login from './pages/Login'
import Layout from './components/Layout'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

function App() {
  const location = useLocation()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Carregando...</div>
  }

  // Rotas que não usam o Layout (Login)
  if (location.pathname === '/login') {
    return session ? <Navigate to="/" /> : <Login />
  }

  // Rotas protegidas (usa Layout)
  return session ? (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/vencimentos" element={<Vencimentos />} />
        <Route path="/limpeza" element={<Limpeza />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/etiquetas" element={<Etiquetas />} />
      </Routes>
    </Layout>
  ) : (
    <Navigate to="/login" />
  )
}

export default App
