import { useMemo, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  Activity, Bell, ChevronDown, CircleDot, Cloud, Command, Copy, FolderPlus,
  GitBranch, LayoutGrid, LockKeyhole, MoreHorizontal, Plus, Search, Server,
  Settings, ShieldCheck, SlidersHorizontal, Star, TerminalSquare,
  Upload, Wifi, X, Zap,
} from 'lucide-react'
import './App.css'

type Connection = { id: number; name: string; host: string; user: string; group: string; color: string; starred?: boolean; port: number }
type Tab = Connection & { connected: boolean }

const initialConnections: Connection[] = [
  { id: 1, name: 'Production API', host: 'api.prod.example.com', user: 'deploy', group: 'Production', color: '#ff786b', starred: true, port: 22 },
  { id: 2, name: 'Database Primary', host: 'db-primary.internal', user: 'admin', group: 'Production', color: '#67c7a5', starred: true, port: 22 },
  { id: 3, name: 'Staging Cluster', host: 'staging.example.com', user: 'ubuntu', group: 'Staging', color: '#a98bff', port: 22 },
  { id: 4, name: 'Files & Backups', host: 'files.example.com', user: 'backup', group: 'Infrastructure', color: '#f2b666', port: 2222 },
  { id: 5, name: 'Monitoring', host: 'grafana.internal', user: 'ops', group: 'Infrastructure', color: '#62b9e9', port: 22 },
]

const output = [
  ['10:42:18', 'Last login: Mon Oct 26 10:39:02 2026 from 10.0.1.24'],
  ['10:42:19', 'deploy@api-prod ~ % docker compose ps'],
  ['', 'NAME                 IMAGE                  STATUS'],
  ['', 'api-server           api:2.4.1              Up 3 days'],
  ['', 'worker                worker:2.4.1            Up 3 days'],
  ['10:42:22', 'deploy@api-prod ~ % _'],
]

function App() {
  const [connections, setConnections] = useState(initialConnections)
  const [tabs, setTabs] = useState<Tab[]>([{ ...initialConnections[0], connected: true }])
  const [activeId, setActiveId] = useState(1)
  const [query, setQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [broadcast, setBroadcast] = useState(false)
  const [command, setCommand] = useState('')
  const [toast, setToast] = useState('')
  const [checking, setChecking] = useState(false)
  const [authMode, setAuthMode] = useState<'password' | 'key'>('password')

  const filtered = useMemo(() => connections.filter((connection) =>
    `${connection.name} ${connection.host} ${connection.group}`.toLowerCase().includes(query.toLowerCase())), [connections, query])

  const openConnection = (connection: Connection) => {
    if (!tabs.some((tab) => tab.id === connection.id)) setTabs([...tabs, { ...connection, connected: true }])
    setActiveId(connection.id)
  }

  const closeTab = (id: number) => {
    const next = tabs.filter((tab) => tab.id !== id)
    setTabs(next)
    if (activeId === id && next.length) setActiveId(next[next.length - 1].id)
  }

  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2500) }

  const addConnection = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const host = String(form.get('host'))
    const port = Number(form.get('port')) || 22
    const user = String(form.get('user'))
    const password = String(form.get('password') || '')
    const privateKey = String(form.get('privateKey') || '')
    setChecking(true)
    if ('__TAURI_INTERNALS__' in window) {
      try {
        const result = await invoke<{ message: string; latency_ms: number }>('test_ssh_connection', { host, port, username: user, password: password || null, privateKey: privateKey || null, protocol: String(form.get('protocol') || 'SSH') })
        showToast(`${result.message} · ${result.latency_ms} ms`)
      } catch (error) {
        showToast(String(error))
        setChecking(false)
        return
      }
    } else {
      showToast('Ejecuta Orbit como aplicación de escritorio para validar SSH')
    }
    const newConnection: Connection = { id: Date.now(), name: String(form.get('name')), host: String(form.get('host')), user: String(form.get('user')), group: 'My connections', color: '#62b9e9', port: Number(form.get('port')) || 22 }
    setConnections([...connections, newConnection]); setShowModal(false); openConnection(newConnection); setChecking(false)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><Zap size={16} fill="currentColor" /></div><span>orbit<span className="brand-dot">.</span></span><small>WORKSPACE</small></div>
        <div className="workspace-switcher"><div className="workspace-icon"><Cloud size={15} /></div><span>Personal workspace</span><ChevronDown size={14} /></div>
        <div className="top-actions"><button className="icon-button" title="Comandos rápidos"><Command size={17} /></button><button className="icon-button notification" title="Notificaciones"><Bell size={17} /><i /></button><div className="avatar">JR</div></div>
      </header>

      <div className="body-layout">
        <aside className="sidebar">
          <div className="sidebar-heading"><span>CONEXIONES</span><button className="add-small" onClick={() => setShowModal(true)}><Plus size={16} /></button></div>
          <div className="search-box"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar conexiones" /><kbd>⌘ K</kbd></div>
          <nav className="side-nav"><button className="nav-item selected"><LayoutGrid size={16} /> Todas las conexiones <span>{connections.length}</span></button><button className="nav-item"><Star size={16} /> Favoritos <span>2</span></button></nav>
          <div className="connection-list">
            {['Production', 'Staging', 'Infrastructure', 'My connections'].map((group) => {
              const items = filtered.filter((connection) => connection.group === group)
              if (!items.length) return null
              return <section key={group} className="connection-group"><div className="group-title"><ChevronDown size={13} /><span>{group}</span><small>{items.length}</small></div>{items.map((connection) => <button key={connection.id} className={`connection-item ${activeId === connection.id ? 'active' : ''}`} onClick={() => openConnection(connection)}><span className="server-icon" style={{ background: connection.color }}><Server size={14} /></span><span className="connection-info"><strong>{connection.name}</strong><small>{connection.user}@{connection.host}</small></span>{connection.starred && <Star size={13} className="starred" fill="currentColor" />}</button>)}</section>
            })}
          </div>
          <div className="sidebar-bottom"><button className="nav-item"><FolderPlus size={16} /> Administrar carpetas</button><button className="nav-item"><Settings size={16} /> Preferencias</button><div className="sync-status"><span className="online-dot" /> Todo sincronizado <span>·</span><span>v0.1.0</span></div></div>
        </aside>

        <section className="workspace">
          <div className="tabbar"><div className="tabs">{tabs.map((tab) => <button key={tab.id} className={`tab ${activeId === tab.id ? 'active' : ''}`} onClick={() => setActiveId(tab.id)}><span className="tab-dot" style={{ background: tab.color }} /><span>{tab.name}</span><span className="tab-status" /><X size={14} onClick={(event) => { event.stopPropagation(); closeTab(tab.id) }} /></button>)}<button className="new-tab" onClick={() => setShowModal(true)}><Plus size={16} /></button></div><div className="tab-actions"><button className="icon-button"><SlidersHorizontal size={16} /></button><button className="icon-button"><MoreHorizontal size={18} /></button></div></div>
          <div className="session-toolbar"><div><span className="breadcrumb">Conexiones <span>/</span> Production <span>/</span></span><strong>{tabs.find((tab) => tab.id === activeId)?.name || 'Nueva sesión'}</strong></div><div className="session-tools"><span className="secure-label"><ShieldCheck size={14} /> Conexión segura</span><button className="tool-button"><Copy size={15} /> Copiar</button><button className="tool-button"><Upload size={15} /> Transferir</button><button className="tool-button">⋮</button></div></div>
          <div className="terminal-wrap"><div className="terminal-header"><div className="terminal-title"><span className="connected-dot" /> <strong>{tabs.find((tab) => tab.id === activeId)?.user || 'deploy'}@{tabs.find((tab) => tab.id === activeId)?.host || 'remote'}</strong><span className="terminal-path">~/services/api</span></div><div className="terminal-meta"><span><Wifi size={13} /> 24 ms</span><span>SSH · 22</span></div></div><div className="terminal"><div className="terminal-output">{output.map(([time, line], index) => <div className="terminal-line" key={index}><span className="time">{time}</span><span className={line.includes('STATUS') ? 'output-highlight' : ''}>{line}</span></div>)}</div><div className="terminal-input"><span className="prompt">deploy@api-prod <b>~</b> %</span><input autoFocus value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && command) { showToast(broadcast ? 'Comando enviado a 2 sesiones' : 'Comando ejecutado'); setCommand('') } }} placeholder="Escribe un comando..." /><span className="cursor" /></div></div></div>
          <div className="command-bar"><div className="command-label"><TerminalSquare size={15} /><span>Comando rápido</span></div><div className="command-input"><input placeholder="Envía un comando a esta sesión" /><button className={broadcast ? 'broadcast active' : 'broadcast'} onClick={() => setBroadcast(!broadcast)}><GitBranch size={14} /> {broadcast ? '2 sesiones' : 'Enviar a varias'}</button><button className="send-button" onClick={() => showToast(broadcast ? 'Comando enviado a 2 sesiones' : 'Comando enviado')}>Enviar <span>⌘ ↵</span></button></div></div>
          <div className="statusbar"><span><Activity size={14} /> Sesión activa</span><span>Última actividad hace unos segundos</span><span className="status-right">UTF-8 <span>·</span> Bash <span>·</span> <LockKeyhole size={12} /> Encriptado</span></div>
        </section>
      </div>

      {showModal && <div className="modal-backdrop" onClick={() => setShowModal(false)}><form className="modal" onSubmit={addConnection} onClick={(event) => event.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">NUEVA CONEXIÓN</span><h2>Configura tu servidor</h2></div><button type="button" className="close-modal" onClick={() => setShowModal(false)}><X size={18} /></button></div><label>Nombre de la conexión<input name="name" required placeholder="Mi servidor" /></label><div className="form-row"><label>Host o IP<input name="host" required placeholder="example.com" /></label><label>Puerto<input name="port" type="number" defaultValue="22" /></label></div><div className="form-row"><label>Usuario<input name="user" required placeholder="ubuntu" /></label><label>Tipo<select name="protocol"><option>SSH</option><option>SFTP</option><option>FTP</option></select></label></div><label>Forma de acceso<select name="authMethod" value={authMode} onChange={(event) => setAuthMode(event.target.value as 'password' | 'key')}><option value="password">Usuario y contraseña (recomendado)</option><option value="key">Clave privada SSH</option></select></label>{authMode === 'password' ? <label>Contraseña<input name="password" type="password" required placeholder="Escribe la contraseña del servidor" /></label> : <label>Ruta de clave privada<input name="privateKey" required placeholder="C:\\Users\\TuUsuario\\.ssh\\id_ed25519" /></label>}<div className="auth-note"><LockKeyhole size={16} /><span>No necesitas conocer SSH: usa usuario y contraseña. Las credenciales se protegerán con el llavero del sistema.</span></div><div className="modal-actions"><button type="button" className="cancel-button" onClick={() => setShowModal(false)}>Cancelar</button><button className="primary-button" type="submit" disabled={checking}>{checking ? 'Validando conexión…' : 'Validar y conectar'} <span>↵</span></button></div></form></div>}
      {toast && <div className="toast"><CircleDot size={15} /> {toast}</div>}
    </main>
  )
}

export default App
