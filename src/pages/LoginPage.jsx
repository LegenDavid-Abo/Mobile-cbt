import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuth()
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!studentId.trim() || !password.trim()) {
      toast.error('Please enter your Student ID and password')
      return
    }
    setLoading(true)
    try {
      await login(studentId, password)
      toast.success('Welcome back!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.left}>
        <div style={styles.leftContent}>
          <div style={styles.badge}>CBT PORTAL</div>
          <h1 style={styles.hero}>School<br /><span style={styles.heroAccent}>Examination</span><br />Portal</h1>
          <p style={styles.heroSub}>Secure, timed, and fair computer-based testing for all students and staff.</p>
          <div style={styles.stats}>
            <div style={styles.stat}><span style={styles.statNum}>3</span><span style={styles.statLabel}>User Roles</span></div>
            <div style={styles.stat}><span style={styles.statNum}>6</span><span style={styles.statLabel}>Class Levels</span></div>
            <div style={styles.stat}><span style={styles.statNum}>∞</span><span style={styles.statLabel}>Questions</span></div>
          </div>
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.logo}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <rect width="36" height="36" rx="10" fill="#1a1a2e"/>
                <path d="M10 18h16M18 10v16" stroke="#e94560" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="18" cy="18" r="5" stroke="#e94560" strokeWidth="2"/>
              </svg>
            </div>
            <h2 style={styles.cardTitle}>Sign In</h2>
            <p style={styles.cardSub}>Enter your credentials to access the portal</p>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Student / Staff ID</label>
              <input
                style={styles.input}
                type="text"
                placeholder="e.g. STU2024001"
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                autoComplete="username"
                disabled={loading}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...styles.input, paddingRight: '44px' }}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowPass(v => !v)} style={styles.eyeBtn}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? (
                <span style={styles.spinner}>⏳ Signing in...</span>
              ) : 'Sign In →'}
            </button>
          </form>

          <p style={styles.hint}>
            Contact your <strong>Senior Administrator</strong> if you need login credentials.
          </p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexWrap: 'wrap',
    fontFamily: "'DM Sans', sans-serif",
  },
  left: {
    flex: 1,
    minWidth: '300px',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    position: 'relative',
    overflow: 'hidden',
  },
  leftContent: { position: 'relative', zIndex: 1, maxWidth: '420px' },
  badge: {
    display: 'inline-block',
    background: 'rgba(233,69,96,0.2)',
    color: '#e94560',
    border: '1px solid rgba(233,69,96,0.4)',
    borderRadius: '100px',
    padding: '6px 16px',
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '2px',
    marginBottom: '24px',
  },
  hero: {
    fontSize: '56px',
    fontWeight: '600',
    color: '#fff',
    lineHeight: 1.1,
    marginBottom: '20px',
    fontFamily: "'DM Serif Display', serif",
  },
  heroAccent: { color: '#e94560' },
  heroSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: '16px',
    lineHeight: 1.7,
    marginBottom: '40px',
  },
  stats: { display: 'flex', gap: '32px' },
  stat: { display: 'flex', flexDirection: 'column', gap: '2px' },
  statNum: { fontSize: '28px', fontWeight: '600', color: '#e94560' },
  statLabel: { fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' },
  right: {
    width: 'min(480px, 100%)',
    flex: '1 1 320px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'clamp(20px, 5vw, 40px)',
    background: '#f8f9fc',
  },
  card: {
    background: '#fff',
    borderRadius: '20px',
    padding: 'clamp(20px, 5vw, 40px)',
    width: '100%',
    boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
  },
  cardHeader: { marginBottom: '32px' },
  logo: { marginBottom: '20px' },
  cardTitle: { fontSize: '26px', fontWeight: '600', color: '#1a202c', marginBottom: '8px' },
  cardSub: { fontSize: '14px', color: '#718096' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: '500', color: '#4a5568' },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '15px',
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
    color: '#1a202c',
    background: '#fff',
    transition: 'border-color 0.2s',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
  },
  btn: {
    background: 'linear-gradient(135deg, #1a1a2e, #0f3460)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '14px 24px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'transform 0.1s',
  },
  hint: { fontSize: '13px', color: '#718096', textAlign: 'center', lineHeight: 1.6 },
  spinner: { display: 'inline-flex', alignItems: 'center', gap: '8px' },
}
