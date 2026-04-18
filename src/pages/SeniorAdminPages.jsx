import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import bcrypt from 'bcryptjs'
import { LoadingState } from './StudentPages'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'

const CLASSES = ['JSS1','JSS2','JSS3','SS1','SS2','SS3']
const ROLES = ['student','admin','senior_admin']

function inferClass(studentId) {
  const id = studentId?.toUpperCase() || ''
  if (id.includes('JSS1')) return 'JSS1'
  if (id.includes('JSS2')) return 'JSS2'
  if (id.includes('JSS3')) return 'JSS3'
  if (id.includes('SS1') && !id.includes('JSS')) return 'SS1'
  if (id.includes('SS2') && !id.includes('JSS')) return 'SS2'
  if (id.includes('SS3') && !id.includes('JSS')) return 'SS3'
  return null
}

// ── Create Single User (Manual) ──────────────────────
export function CreateUser({ onCreated }) {
  const emptyForm = { student_id: '', name: '', email: '', password: '', role: 'student', class: 'JSS1' }
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSave = async () => {
    const { student_id, name, password, role } = form
    if (!student_id.trim()) return toast.error('Student ID is required')
    if (!name.trim()) return toast.error('Full name is required')
    if (!password.trim()) return toast.error('Password is required')
    if (password.length < 4) return toast.error('Password must be at least 4 characters')

    setSaving(true)
    try {
      const hashedPassword = await bcrypt.hash(password, 10)
      const finalClass = role === 'student' ? form.class : null
      const { error } = await supabase.from('users').insert({
        student_id: student_id.trim().toUpperCase(),
        name: name.trim(),
        email: form.email.trim() || null,
        hashed_password: hashedPassword,
        plain_password: password,
        role,
        class: finalClass,
        is_suspended: false,
      })
      if (error) {
        if (error.code === '23505') return toast.error('Student ID already exists')
        return toast.error('Failed to create user: ' + error.message)
      }
      toast.success(`User "${name}" created successfully!`)
      setForm(emptyForm)
      onCreated?.()
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  return (
    <div style={sa.formCard}>
      <div style={sa.formCardHeader}>
        <div style={sa.formCardIcon}>👤</div>
        <div>
          <h3 style={sa.formCardTitle}>Create New User</h3>
          <p style={sa.formCardSub}>Add a single student, admin or senior admin manually</p>
        </div>
      </div>

      <div style={sa.formGrid2}>
        <div style={sa.field}>
          <label style={sa.label}>Student / Staff ID <span style={sa.req}>*</span></label>
          <input style={sa.input} placeholder="e.g. JSS1001" value={form.student_id}
            onChange={e => f('student_id', e.target.value)} />
          <span style={sa.hint}>Will be saved in uppercase</span>
        </div>

        <div style={sa.field}>
          <label style={sa.label}>Full Name <span style={sa.req}>*</span></label>
          <input style={sa.input} placeholder="e.g. Amaka Obi" value={form.name}
            onChange={e => f('name', e.target.value)} />
        </div>

        <div style={sa.field}>
          <label style={sa.label}>Password <span style={sa.req}>*</span></label>
          <div style={{ position: 'relative' }}>
            <input style={{ ...sa.input, paddingRight: '44px' }}
              type={showPass ? 'text' : 'password'}
              placeholder="Min. 4 characters"
              value={form.password}
              onChange={e => f('password', e.target.value)} />
            <button type="button" onClick={() => setShowPass(v => !v)}
              style={sa.eyeBtn}>{showPass ? '🙈' : '👁️'}</button>
          </div>
          <span style={sa.hint}>Stored as bcrypt hash automatically</span>
        </div>

        <div style={sa.field}>
          <label style={sa.label}>Email <span style={sa.optional}>(optional)</span></label>
          <input style={sa.input} type="email" placeholder="e.g. amaka@school.edu"
            value={form.email} onChange={e => f('email', e.target.value)} />
        </div>

        <div style={sa.field}>
          <label style={sa.label}>Role <span style={sa.req}>*</span></label>
          <select style={sa.input} value={form.role} onChange={e => f('role', e.target.value)}>
            <option value="student">Student</option>
            <option value="admin">Admin</option>
            <option value="senior_admin">Senior Admin</option>
          </select>
        </div>

        {form.role === 'student' && (
          <div style={sa.field}>
            <label style={sa.label}>Class <span style={sa.req}>*</span></label>
            <select style={sa.input} value={form.class} onChange={e => f('class', e.target.value)}>
              {CLASSES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
        <button style={{ ...sa.uploadBtn, opacity: saving ? 0.7 : 1 }} onClick={handleSave} disabled={saving}>
          {saving ? '⏳ Creating...' : '✅ Create User'}
        </button>
      </div>
    </div>
  )
}

// ── Senior Admin Home ────────────────────────────────
export function SeniorAdminHome() {
  const { user } = useAuth()
  const [stats, setStats] = useState({})
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    async function load() {
      const [{ count: students }, { count: admins }, { count: courses }, { count: sessions }] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('users').select('id', { count: 'exact', head: true }).in('role', ['admin','senior_admin']),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('exam_sessions').select('id', { count: 'exact', head: true }).not('submitted_at', 'is', null),
      ])
      setStats({ students, admins, courses, sessions })
    }
    load()
  }, [])

  return (
    <div>
      <div style={sa.banner}>
        <div>
          <div style={sa.bannerSmall}>{greeting} 👋</div>
          <h2 style={sa.bannerTitle}>{user?.name}</h2>
          <p style={sa.bannerSub}>Senior Administrator · Full system access</p>
        </div>
        <div style={{ fontSize: '64px' }}>👑</div>
      </div>
      <div style={sa.statsGrid}>
        {[
          { icon: '🎓', label: 'Students', val: stats.students, color: '#3b82f6' },
          { icon: '🛠️', label: 'Staff (Admin)', val: stats.admins, color: '#8b5cf6' },
          { icon: '📚', label: 'Total Courses', val: stats.courses, color: '#10b981' },
          { icon: '✅', label: 'Exams Done', val: stats.sessions, color: '#e94560' },
        ].map(item => (
          <div key={item.label} style={sa.statCard}>
            <div style={{ ...sa.statIcon, background: item.color + '18', color: item.color }}>{item.icon}</div>
            <div style={sa.statVal}>{item.val ?? '—'}</div>
            <div style={sa.statLabel}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Upload Users Page (tabs: manual + file) ──────────
export function UploadUsers() {
  const [tab, setTab] = useState('manual') // 'manual' | 'file'
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div>
      <div style={sa.tabs}>
        <button style={{ ...sa.tab, ...(tab === 'manual' ? sa.tabActive : {}) }} onClick={() => setTab('manual')}>
          ✏️ Create Manually
        </button>
        <button style={{ ...sa.tab, ...(tab === 'file' ? sa.tabActive : {}) }} onClick={() => setTab('file')}>
          📁 Upload File (CSV / Excel)
        </button>
      </div>

      {tab === 'manual' && <CreateUser onCreated={() => setRefreshKey(k => k + 1)} />}
      {tab === 'file' && <FileUploadUsers />}
    </div>
  )
}

// ── File Upload Sub-component ─────────────────────────
function FileUploadUsers() {
  const [preview, setPreview] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: [] })
  const [done, setDone] = useState(false)
  const fileRef = useRef()

  const parseFile = (file) => {
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => setPreview(result.data),
        error: () => toast.error('Failed to parse CSV file'),
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (e) => {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws)
        setPreview(data)
      }
      reader.readAsArrayBuffer(file)
    } else {
      toast.error('Only CSV and Excel (.xlsx/.xls) files are supported')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  const handleUpload = async () => {
    if (!preview.length) return toast.error('No data to upload')
    setUploading(true)
    setDone(false)
    const errors = []
    let done = 0

    for (let i = 0; i < preview.length; i++) {
      const row = preview[i]
      const studentId = (row['student_id'] || row['Student ID'] || row['ID'] || '').toString().trim().toUpperCase()
      const name = (row['name'] || row['Name'] || row['Full Name'] || '').toString().trim()
      const password = (row['password'] || row['Password'] || '').toString().trim()
      const role = (row['role'] || row['Role'] || 'student').toString().trim().toLowerCase()
      const email = (row['email'] || row['Email'] || '').toString().trim() || null
      
      let studentClass = (row['class'] || row['Class'] || '').toString().trim().toUpperCase() || null
      if (!studentClass) studentClass = inferClass(studentId)
      if (studentClass && !CLASSES.includes(studentClass)) studentClass = null

      if (!studentId || !name || !password) {
        errors.push(`Row ${i + 2}: Missing required fields (student_id, name, password)`)
        continue
      }

      const validRole = ROLES.includes(role) ? role : 'student'
      const finalClass = validRole === 'student' ? (studentClass || 'JSS1') : null

      try {
        const hashedPassword = await bcrypt.hash(password, 10)
        const { error } = await supabase.from('users').upsert({
          student_id: studentId,
          name,
          email,
          hashed_password: hashedPassword,
          plain_password: password,
          role: validRole,
          class: finalClass,
          is_suspended: false,
        }, { onConflict: 'student_id' })

        if (error) errors.push(`Row ${i + 2} (${studentId}): ${error.message}`)
        else done++
      } catch (err) {
        errors.push(`Row ${i + 2}: ${err.message}`)
      }

      setProgress({ done: i + 1, total: preview.length, errors })
    }

    setUploading(false)
    setDone(true)
    toast.success(`${done} user${done !== 1 ? 's' : ''} uploaded successfully`)
  }

  const downloadTemplate = () => {
    const data = [
      { student_id: 'JSS1001', name: 'John Doe', password: 'pass1234', role: 'student', class: 'JSS1', email: 'john@school.edu' },
      { student_id: 'JSS2002', name: 'Jane Smith', password: 'pass5678', role: 'student', class: 'JSS2', email: '' },
      { student_id: 'ADM001', name: 'Admin User', password: 'adminpass', role: 'admin', class: '', email: 'admin@school.edu' },
    ]
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Users')
    XLSX.writeFile(wb, 'cbt_users_template.xlsx')
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={sa.infoBox}>
        <div style={sa.infoTitle}>📋 Required Columns</div>
        <div style={sa.colGrid}>
          {[
            { col: 'student_id', req: true, note: 'Unique ID (e.g. JSS1001)' },
            { col: 'name', req: true, note: 'Full name of user' },
            { col: 'password', req: true, note: 'Plain text — will be hashed' },
            { col: 'role', req: false, note: 'student / admin / senior_admin' },
            { col: 'class', req: false, note: 'JSS1–JSS3, SS1–SS3 (auto-detected from ID)' },
            { col: 'email', req: false, note: 'Optional email address' },
          ].map(c => (
            <div key={c.col} style={sa.colItem}>
              <code style={sa.colCode}>{c.col}</code>
              <span style={{ ...sa.badge, background: c.req ? '#fee2e2' : '#f1f5f9', color: c.req ? '#dc2626' : '#64748b' }}>{c.req ? 'Required' : 'Optional'}</span>
              <span style={sa.colNote}>{c.note}</span>
            </div>
          ))}
        </div>
        <button style={sa.templateBtn} onClick={downloadTemplate}>⬇ Download Template (Excel)</button>
      </div>

      <div
        style={sa.dropzone}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={e => e.target.files[0] && parseFile(e.target.files[0])} />
        <div style={sa.dropIcon}>📁</div>
        <div style={sa.dropTitle}>Drop your CSV or Excel file here</div>
        <div style={sa.dropSub}>or click to browse — .csv, .xlsx, .xls supported</div>
      </div>

      {preview.length > 0 && (
        <div style={sa.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '600' }}>Preview — {preview.length} rows</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={sa.clearBtn} onClick={() => { setPreview([]); setDone(false) }}>Clear</button>
              <button style={sa.uploadBtn} onClick={handleUpload} disabled={uploading}>
                {uploading ? `⏳ Uploading... ${progress.done}/${progress.total}` : `⬆ Upload ${preview.length} Users`}
              </button>
            </div>
          </div>

          {uploading && (
            <div style={sa.progressBar}>
              <div style={{ ...sa.progressFill, width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
          )}

          {done && progress.errors.length > 0 && (
            <div style={sa.errorBox}>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>⚠️ {progress.errors.length} error{progress.errors.length !== 1 ? 's' : ''}:</div>
              {progress.errors.map((e, i) => <div key={i} style={{ fontSize: '13px', marginBottom: '4px' }}>{e}</div>)}
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={sa.table}>
              <thead>
                <tr style={sa.thead}>
                  {Object.keys(preview[0]).map(k => <th key={k} style={sa.th}>{k}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((row, i) => (
                  <tr key={i} style={sa.tr}>
                    {Object.values(row).map((v, j) => <td key={j} style={sa.td}>{String(v)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 10 && <div style={{ textAlign: 'center', padding: '12px', color: '#718096', fontSize: '13px' }}>...and {preview.length - 10} more rows</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Manage All Users ─────────────────────────────────
export function ManageUsers() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [editUser, setEditUser] = useState(null)
  const [editForm, setEditForm] = useState({})

  const load = async () => {
    const { data } = await supabase.from('users').select('*').order('name')
    setUsers(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = users.filter(u =>
    (!roleFilter || u.role === roleFilter) &&
    (!classFilter || u.class === classFilter) &&
    (!search || u.name.toLowerCase().includes(search.toLowerCase()) || u.student_id.toLowerCase().includes(search.toLowerCase()))
  )

  const openEdit = (u) => {
    setEditUser(u)
    setEditForm({ name: u.name, email: u.email || '', role: u.role, class: u.class || '', is_suspended: u.is_suspended, new_password: '' })
  }

  const saveEdit = async () => {
    if (!editForm.name.trim()) return toast.error('Name is required')
    const payload = {
      name: editForm.name.trim(),
      email: editForm.email.trim() || null,
      role: editForm.role,
      class: editForm.role === 'student' ? (editForm.class || 'JSS1') : null,
      is_suspended: editForm.is_suspended,
    }
    // If a new password was entered, hash it and update both fields
    if (editForm.new_password.trim()) {
      if (editForm.new_password.trim().length < 4) return toast.error('Password must be at least 4 characters')
      const hashedPassword = await bcrypt.hash(editForm.new_password.trim(), 10)
      payload.hashed_password = hashedPassword
      payload.plain_password = editForm.new_password.trim()
    }
    const { error } = await supabase.from('users').update(payload).eq('id', editUser.id)
    if (error) return toast.error('Failed to update user: ' + error.message)
    toast.success('User updated' + (editForm.new_password.trim() ? ' (password changed)' : ''))
    setEditUser(null)
    load()
  }

  const deleteUser = async (u) => {
    if (u.id === currentUser.id) return toast.error("You can't delete your own account")
    if (!confirm(`Delete user "${u.name}"? This cannot be undone.`)) return
    await supabase.from('users').delete().eq('id', u.id)
    toast.success('User deleted')
    load()
  }

  const toggleSuspend = async (u) => {
    if (u.id === currentUser.id) return toast.error("You can't suspend your own account")
    await supabase.from('users').update({ is_suspended: !u.is_suspended }).eq('id', u.id)
    load()
  }

  const roleColors = { student: { bg: '#eff6ff', color: '#1d4ed8' }, admin: { bg: '#f3e8ff', color: '#7c3aed' }, senior_admin: { bg: '#fff1f2', color: '#e94560' } }

  if (loading) return <LoadingState />

  return (
    <div>
      <div style={sa.toolbar}>
        <input style={sa.search} placeholder="🔍 Search by name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={sa.select} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="student">Student</option>
          <option value="admin">Admin</option>
          <option value="senior_admin">Senior Admin</option>
        </select>
        <select style={sa.select} value={classFilter} onChange={e => setClassFilter(e.target.value)}>
          <option value="">All Classes</option>
          {CLASSES.map(c => <option key={c}>{c}</option>)}
        </select>
        <span style={{ color: '#718096', fontSize: '14px', whiteSpace: 'nowrap' }}>{filtered.length} user{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={sa.tableCard}>
        <table style={sa.table}>
          <thead>
            <tr style={sa.thead}>
              {['Name','Student ID','Class','Role','Status','Actions'].map(h => <th key={h} style={sa.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const rc = roleColors[u.role] || roleColors.student
              const isMe = u.id === currentUser.id
              return (
                <tr key={u.id} style={{ ...sa.tr, background: isMe ? '#fefce8' : 'transparent' }}>
                  <td style={sa.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={sa.miniAvatar}>{u.name.charAt(0)}</div>
                      <div>
                        <div style={sa.strong}>{u.name}</div>
                        {isMe && <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600' }}>You</div>}
                      </div>
                    </div>
                  </td>
                  <td style={sa.td}><code style={sa.code}>{u.student_id}</code></td>
                  <td style={sa.td}>{u.class ? <span style={sa.classBadge}>{u.class}</span> : '—'}</td>
                  <td style={sa.td}><span style={{ ...sa.roleBadge, background: rc.bg, color: rc.color }}>{u.role.replace('_',' ')}</span></td>
                  <td style={sa.td}><span style={{ ...sa.statusBadge, background: u.is_suspended ? '#fee2e2' : '#dcfce7', color: u.is_suspended ? '#dc2626' : '#15803d' }}>{u.is_suspended ? 'Suspended' : 'Active'}</span></td>
                  <td style={sa.td}>
                    <div style={sa.actions}>
                      <button style={sa.editBtn} onClick={() => openEdit(u)}>Edit</button>
                      <button
                        style={{ ...sa.editBtn, color: u.is_suspended ? '#10b981' : '#f59e0b', borderColor: u.is_suspended ? '#bbf7d0' : '#fef3c7' }}
                        onClick={() => toggleSuspend(u)}
                        disabled={isMe}
                      >
                        {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                      <button style={sa.delBtn} onClick={() => deleteUser(u)} disabled={isMe}>Delete</button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!filtered.length && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>No users found</td></tr>}
          </tbody>
        </table>
      </div>

      {editUser && (
        <div style={sa.overlay}>
          <div style={sa.modal}>
            <h3 style={sa.modalTitle}>Edit User — {editUser.name}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={sa.field}><label style={sa.label}>Full Name</label><input style={sa.input} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div style={sa.field}><label style={sa.label}>Email (optional)</label><input style={sa.input} value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div style={sa.field}>
                <label style={sa.label}>New Password <span style={{color:'#94a3b8',fontWeight:'400',fontSize:'12px'}}>(leave blank to keep current)</span></label>
                <input style={sa.input} type="password" placeholder="Enter new password..." value={editForm.new_password} onChange={e => setEditForm(f => ({ ...f, new_password: e.target.value }))} />
              </div>
              <div style={sa.field}><label style={sa.label}>Role</label>
                <select style={sa.input} value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                  <option value="senior_admin">Senior Admin</option>
                </select>
              </div>
              {editForm.role === 'student' && (
                <div style={sa.field}><label style={sa.label}>Class</label>
                  <select style={sa.input} value={editForm.class} onChange={e => setEditForm(f => ({ ...f, class: e.target.value }))}>
                    {CLASSES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" id="susp" checked={editForm.is_suspended} onChange={e => setEditForm(f => ({ ...f, is_suspended: e.target.checked }))} />
                <label htmlFor="susp" style={{ fontSize: '14px', color: '#dc2626', cursor: 'pointer' }}>Account Suspended</label>
              </div>
            </div>
            <div style={{ ...sa.modalBtns, marginTop: '24px' }}>
              <button style={sa.cancelBtn} onClick={() => setEditUser(null)}>Cancel</button>
              <button style={sa.uploadBtn} onClick={saveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const sa = {
  // ── tabs ──
  tabs: { display: 'flex', gap: '4px', background: '#f0f2f8', borderRadius: '12px', padding: '4px', marginBottom: '24px', width: 'fit-content' },
  tab: { padding: '10px 20px', border: 'none', borderRadius: '9px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', fontFamily: "'DM Sans', sans-serif", color: '#718096', background: 'transparent', transition: 'all 0.15s' },
  tabActive: { background: '#fff', color: '#1a202c', boxShadow: '0 1px 4px rgba(0,0,0,0.10)' },
  // ── form card ──
  formCard: { background: '#fff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0', maxWidth: '700px' },
  formCardHeader: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #f0f2f8' },
  formCardIcon: { fontSize: '32px', width: '52px', height: '52px', background: '#f0f2f8', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  formCardTitle: { fontSize: '17px', fontWeight: '600', color: '#1a202c', marginBottom: '2px' },
  formCardSub: { fontSize: '13px', color: '#718096' },
  formGrid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  req: { color: '#ef4444', marginLeft: '2px' },
  optional: { color: '#718096', fontWeight: '400', fontSize: '12px' },
  hint: { fontSize: '11px', color: '#94a3b8', marginTop: '3px' },
  eyeBtn: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px' },
  // ── original ──
  banner: { background: 'linear-gradient(135deg, #1a1a2e 0%, #7c3aed 100%)', borderRadius: '16px', padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', color: '#fff' },
  bannerSmall: { fontSize: '14px', color: 'rgba(255,255,255,0.65)', marginBottom: '4px' },
  bannerTitle: { fontSize: '28px', fontWeight: '600', marginBottom: '8px' },
  bannerSub: { color: 'rgba(255,255,255,0.65)', fontSize: '14px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' },
  statCard: { background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', textAlign: 'center' },
  statIcon: { width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', margin: '0 auto 10px' },
  statVal: { fontSize: '28px', fontWeight: '700', color: '#1a202c', marginBottom: '2px' },
  statLabel: { fontSize: '12px', color: '#718096' },
  infoBox: { background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '20px' },
  infoTitle: { fontSize: '15px', fontWeight: '600', color: '#1a202c', marginBottom: '16px' },
  colGrid: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
  colItem: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' },
  colCode: { background: '#f0f2f8', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', minWidth: '110px' },
  badge: { fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '100px', whiteSpace: 'nowrap' },
  colNote: { color: '#718096' },
  templateBtn: { background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", fontWeight: '600' },
  dropzone: {
    border: '2px dashed #cbd5e0', borderRadius: '14px', padding: '48px',
    textAlign: 'center', cursor: 'pointer', marginBottom: '20px',
    background: '#f8f9fc', transition: 'border-color 0.2s',
  },
  dropIcon: { fontSize: '48px', marginBottom: '12px' },
  dropTitle: { fontSize: '16px', fontWeight: '600', color: '#1a202c', marginBottom: '6px' },
  dropSub: { fontSize: '13px', color: '#718096' },
  card: { background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' },
  progressBar: { height: '6px', background: '#e2e8f0', borderRadius: '3px', marginBottom: '16px', overflow: 'hidden' },
  progressFill: { height: '100%', background: '#10b981', borderRadius: '3px', transition: 'width 0.3s' },
  errorBox: { background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '10px', padding: '16px', marginBottom: '16px', color: '#c53030', fontSize: '13px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f8f9fc' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tr: { borderBottom: '1px solid #f0f2f8' },
  td: { padding: '14px 16px', fontSize: '14px', color: '#1a202c' },
  strong: { fontWeight: '600' },
  code: { background: '#f0f2f8', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' },
  classBadge: { background: '#eff6ff', color: '#1d4ed8', fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '100px' },
  roleBadge: { fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '100px', textTransform: 'capitalize' },
  statusBadge: { fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '100px' },
  actions: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  editBtn: { padding: '5px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', background: '#fff', cursor: 'pointer', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", color: '#1a202c' },
  delBtn: { padding: '5px 12px', border: '1.5px solid #fee2e2', borderRadius: '7px', background: '#fff', cursor: 'pointer', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", color: '#ef4444' },
  toolbar: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' },
  search: { flex: 1, padding: '10px 16px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", outline: 'none', minWidth: '200px' },
  select: { padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: '#fff', cursor: 'pointer' },
  tableCard: { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  miniAvatar: { width: '32px', height: '32px', borderRadius: '50%', background: '#1a1a2e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '14px', flexShrink: 0 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modal: { background: '#fff', borderRadius: '20px', padding: '32px', width: '440px', maxWidth: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflow: 'auto' },
  modalTitle: { fontSize: '20px', fontWeight: '600', marginBottom: '24px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '500', color: '#4a5568' },
  input: { padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: '#fff', color: '#1a202c' },
  modalBtns: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  cancelBtn: { padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '10px', background: '#fff', cursor: 'pointer', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", color: '#4a5568' },
  clearBtn: { padding: '9px 16px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", color: '#4a5568' },
  uploadBtn: { padding: '10px 20px', border: 'none', borderRadius: '10px', background: '#1a1a2e', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: "'DM Sans', sans-serif" },
}
