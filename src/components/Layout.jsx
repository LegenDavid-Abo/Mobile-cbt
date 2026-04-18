import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

const navItems = {
  student: [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'courses', label: 'My Courses', icon: '📚' },
    { id: 'results', label: 'My Results', icon: '📊' },
  ],
  admin: [
    { id: 'home', label: 'Dashboard', icon: '🏠' },
    { id: 'courses', label: 'Courses & Exams', icon: '📚' },
    { id: 'questions', label: 'Questions', icon: '❓' },
    { id: 'students', label: 'Students', icon: '👥' },
    { id: 'results', label: 'Results', icon: '📊' },
  ],
  senior_admin: [
    { id: 'home', label: 'Dashboard', icon: '🏠' },
    { id: 'users', label: 'Manage Users', icon: '👥' },
    { id: 'upload', label: 'Upload Users', icon: '⬆️' },
    { id: 'courses', label: 'Courses & Exams', icon: '📚' },
    { id: 'questions', label: 'Questions', icon: '❓' },
    { id: 'results', label: 'Results', icon: '📊' },
  ]
}

const roleColors = {
  student: { bg: '#10b981', label: 'Student' },
  admin: { bg: '#3b82f6', label: 'Admin' },
  senior_admin: { bg: '#e94560', label: 'Senior Admin' },
}

export default function Layout({ page, setPage, children }) {
  const { user, logout } = useAuth()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const items = navItems[user?.role] || navItems.student
  const roleInfo = roleColors[user?.role] || roleColors.student

  const handleLogout = () => { logout(); toast.success('Logged out successfully') }

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <aside style={{ ...styles.sidebar, width: sidebarOpen ? '240px' : '64px' }}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logoMark}>
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="10" fill="#e94560"/>
              <path d="M10 18h16M18 10v16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="18" cy="18" r="5" stroke="white" strokeWidth="2"/>
            </svg>
          </div>
          {sidebarOpen && <span style={styles.brandName}>SchoolCBT</span>}
          <button style={styles.toggleBtn} onClick={() => setSidebarOpen(v => !v)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {sidebarOpen && (
          <div style={styles.userCard}>
            <div style={styles.avatar}>{user?.name?.charAt(0) || 'U'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.userName}>{user?.name}</div>
              <div style={{ ...styles.roleBadge, background: roleInfo.bg }}>{roleInfo.label}</div>
            </div>
          </div>
        )}

        <nav style={styles.nav}>
          {items.map(item => (
            <button
              key={item.id}
              style={{
                ...styles.navItem,
                ...(page === item.id ? styles.navItemActive : {}),
              }}
              onClick={() => setPage(item.id)}
              title={!sidebarOpen ? item.label : undefined}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {sidebarOpen && <span style={styles.navLabel}>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <button style={styles.logoutBtn} onClick={() => setShowLogoutModal(true)} title="Logout">
            <span>🚪</span>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        <div style={styles.topbar}>
          <div style={styles.pageTitle}>
            {items.find(i => i.id === page)?.icon} {items.find(i => i.id === page)?.label}
          </div>
          {user?.class && (
            <div style={styles.classBadge}>{user.class}</div>
          )}
        </div>
        <div style={styles.content}>{children}</div>
      </main>

      {/* Logout confirm modal */}
      {showLogoutModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalIcon}>🚪</div>
            <h3 style={styles.modalTitle}>Sign Out?</h3>
            <p style={styles.modalText}>Are you sure you want to log out of the portal?</p>
            <div style={styles.modalBtns}>
              <button style={styles.cancelBtn} onClick={() => setShowLogoutModal(false)}>Cancel</button>
              <button style={styles.confirmBtn} onClick={handleLogout}>Yes, Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  shell: { display: 'flex', minHeight: '100vh', background: '#f8f9fc' },
  sidebar: {
    background: '#1a1a2e',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.25s ease',
    overflow: 'hidden',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    height: '100vh',
    zIndex: 100,
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '20px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  logoMark: { flexShrink: 0 },
  brandName: { flex: 1, color: '#fff', fontWeight: '600', fontSize: '16px', whiteSpace: 'nowrap' },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.4)',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '4px',
    marginLeft: 'auto',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px',
    margin: '12px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '10px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#e94560',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '16px',
    flexShrink: 0,
  },
  userName: { color: '#fff', fontWeight: '500', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  roleBadge: {
    display: 'inline-block',
    color: '#fff',
    fontSize: '10px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '100px',
    marginTop: '3px',
  },
  nav: { flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: '2px' },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    background: 'none',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '14px',
    fontFamily: "'DM Sans', sans-serif",
    width: '100%',
    textAlign: 'left',
    transition: 'background 0.15s, color 0.15s',
    whiteSpace: 'nowrap',
  },
  navItemActive: { background: 'rgba(233,69,96,0.18)', color: '#e94560' },
  navIcon: { fontSize: '16px', flexShrink: 0 },
  navLabel: { fontWeight: '500' },
  sidebarFooter: { padding: '12px' },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    background: 'rgba(239,68,68,0.12)',
    color: '#ef4444',
    fontSize: '14px',
    fontFamily: "'DM Sans', sans-serif",
    width: '100%',
    fontWeight: '500',
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' },
  topbar: {
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    padding: '0 28px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  pageTitle: { fontSize: '15px', fontWeight: '600', color: '#1a202c', display: 'flex', alignItems: 'center', gap: '8px' },
  classBadge: {
    background: '#dbeafe',
    color: '#1d4ed8',
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 12px',
    borderRadius: '100px',
  },
  content: { flex: 1, padding: 'clamp(12px, 3vw, 28px)', overflow: 'auto' },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: '20px',
    padding: '40px',
    width: '380px',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  modalIcon: { fontSize: '48px', marginBottom: '16px' },
  modalTitle: { fontSize: '20px', fontWeight: '600', color: '#1a202c', marginBottom: '12px' },
  modalText: { fontSize: '15px', color: '#718096', marginBottom: '28px' },
  modalBtns: { display: 'flex', gap: '12px', justifyContent: 'center' },
  cancelBtn: {
    padding: '11px 24px', border: '1.5px solid #e2e8f0', borderRadius: '10px',
    background: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '500',
    fontFamily: "'DM Sans', sans-serif", color: '#4a5568',
  },
  confirmBtn: {
    padding: '11px 24px', border: 'none', borderRadius: '10px',
    background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
    fontFamily: "'DM Sans', sans-serif",
  },
}
