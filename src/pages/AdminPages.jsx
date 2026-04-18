import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import { LoadingState } from './StudentPages'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'

const CLASSES = ['JSS1','JSS2','JSS3','SS1','SS2','SS3']


// ── Grade helper ──────────────────────────────────────
function getGrade(pct) {
  if (pct >= 75) return 'A'
  if (pct >= 65) return 'B'
  if (pct >= 55) return 'C'
  if (pct >= 45) return 'D'
  if (pct >= 40) return 'E'
  return 'F'
}

// ── Admin Home ──────────────────────────────────────
export function AdminHome() {
  const { user } = useAuth()
  const [stats, setStats] = useState({})
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    async function load() {
      const [{ count: students }, { count: courses }, { count: questions }, { count: sessions }] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('courses').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('questions').select('id', { count: 'exact', head: true }),
        supabase.from('exam_sessions').select('id', { count: 'exact', head: true }).not('submitted_at', 'is', null),
      ])
      setStats({ students, courses, questions, sessions })
    }
    load()
  }, [])

  return (
    <div>
      <div style={s.banner}>
        <div>
          <div style={s.bannerSmall}>{greeting} 👋</div>
          <h2 style={s.bannerTitle}>{user?.name}</h2>
          <p style={s.bannerSub}>Administrator · Manage courses, questions and view student activity</p>
        </div>
        <div style={{ fontSize: '64px' }}>🛠️</div>
      </div>
      <div style={s.statsGrid}>
        {[
          { icon: '👥', label: 'Total Students', val: stats.students, color: '#3b82f6' },
          { icon: '📚', label: 'Active Courses', val: stats.courses, color: '#10b981' },
          { icon: '❓', label: 'Total Questions', val: stats.questions, color: '#f59e0b' },
          { icon: '✅', label: 'Exams Completed', val: stats.sessions, color: '#e94560' },
        ].map(item => (
          <div key={item.label} style={s.statCard}>
            <div style={{ ...s.statIcon, background: item.color + '18', color: item.color }}>{item.icon}</div>
            <div style={s.statVal}>{item.val ?? '—'}</div>
            <div style={s.statLabel}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Courses & Exams ──────────────────────────────────
export function CoursesAdmin() {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editCourse, setEditCourse] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', class: 'JSS1', duration_minutes: 60, total_marks: 100, exam_date: '' })

  const load = async () => {
    let q = supabase.from('courses').select('*, questions(count)').order('created_at', { ascending: false })
    const { data } = await q
    setCourses(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditCourse(null); setForm({ title: '', description: '', class: 'JSS1', duration_minutes: 60, total_marks: 100, exam_date: '' }); setShowModal(true) }
  const openEdit = (c) => {
    setEditCourse(c)
    setForm({ title: c.title, description: c.description || '', class: c.class, duration_minutes: c.duration_minutes, total_marks: c.total_marks || 100, exam_date: c.exam_date ? c.exam_date.slice(0, 16) : '' })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.title.trim()) return toast.error('Course title is required')
    const payload = { ...form, duration_minutes: Number(form.duration_minutes), total_marks: Number(form.total_marks) || 100, exam_date: form.exam_date || null, created_by: user.id }
    if (editCourse) {
      const { error } = await supabase.from('courses').update(payload).eq('id', editCourse.id)
      if (error) return toast.error('Failed to update course')
      toast.success('Course updated')
    } else {
      const { error } = await supabase.from('courses').insert(payload)
      if (error) return toast.error('Failed to create course')
      toast.success('Course created')
    }
    setShowModal(false)
    load()
  }

  const deleteCourse = async (id) => {
    if (!confirm('Delete this course and all its questions?')) return
    await supabase.from('courses').delete().eq('id', id)
    toast.success('Course deleted')
    load()
  }

  const toggleActive = async (id, current) => {
    await supabase.from('courses').update({ is_active: !current }).eq('id', id)
    load()
  }

  const filtered = courses.filter(c =>
    (!classFilter || c.class === classFilter) &&
    (!search || c.title.toLowerCase().includes(search.toLowerCase()))
  )

  if (loading) return <LoadingState />

  return (
    <div>
      <div style={s.toolbar}>
        <input style={s.search} placeholder="🔍 Search courses..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={s.select} value={classFilter} onChange={e => setClassFilter(e.target.value)}>
          <option value="">All Classes</option>
          {CLASSES.map(c => <option key={c}>{c}</option>)}
        </select>
        <button style={s.primaryBtn} onClick={openCreate}>+ New Course</button>
      </div>

      <div style={s.tableCard}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              {['Title','Class','Questions','Duration','Total Marks','Exam Date','Status','Actions'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} style={s.tr}>
                <td style={s.td}><div style={s.strong}>{c.title}</div><div style={s.sub}>{c.description?.slice(0, 40)}</div></td>
                <td style={s.td}><span style={s.classBadge}>{c.class}</span></td>
                <td style={s.td}>{c.questions?.[0]?.count || 0}</td>
                <td style={s.td}>{c.duration_minutes}m</td>
                <td style={s.td}><span style={{fontWeight:'600',color:'#1a1a2e'}}>{c.total_marks || 100}</span> marks</td>
                <td style={s.td}>{c.exam_date ? new Date(c.exam_date).toLocaleString() : '—'}</td>
                <td style={s.td}>
                  <button style={{ ...s.statusBtn, background: c.is_active ? '#dcfce7' : '#f1f5f9', color: c.is_active ? '#15803d' : '#94a3b8' }} onClick={() => toggleActive(c.id, c.is_active)}>
                    {c.is_active ? '● Active' : '○ Inactive'}
                  </button>
                </td>
                <td style={s.td}>
                  <div style={s.actions}>
                    <button style={s.editBtn} onClick={() => openEdit(c)}>Edit</button>
                    <button style={s.delBtn} onClick={() => deleteCourse(c.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>No courses found</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>{editCourse ? 'Edit Course' : 'New Course'}</h3>
            <div style={s.formGrid}>
              <div style={s.field}>
                <label style={s.label}>Course Title</label>
                <input style={s.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Mathematics" />
              </div>
              <div style={s.field}>
                <label style={s.label}>Class</label>
                <select style={s.input} value={form.class} onChange={e => setForm(f => ({ ...f, class: e.target.value }))}>
                  {CLASSES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Duration (minutes)</label>
                <input style={s.input} type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} min={5} max={300} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Total Marks</label>
                <input style={s.input} type="number" value={form.total_marks} onChange={e => setForm(f => ({ ...f, total_marks: e.target.value }))} min={1} max={1000} placeholder="e.g. 100" />
                <span style={{fontSize:'11px',color:'#94a3b8',marginTop:'2px'}}>Score auto-calculated per question answered</span>
              </div>
              <div style={s.field}>
                <label style={s.label}>Exam Date & Time (optional)</label>
                <input style={s.input} type="datetime-local" value={form.exam_date} onChange={e => setForm(f => ({ ...f, exam_date: e.target.value }))} />
              </div>
              <div style={{ ...s.field, gridColumn: '1/-1' }}>
                <label style={s.label}>Description</label>
                <textarea style={{ ...s.input, height: '80px', resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional course description" />
              </div>
            </div>
            <div style={s.modalBtns}>
              <button style={s.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={s.primaryBtn} onClick={save}>{editCourse ? 'Save Changes' : 'Create Course'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Questions Manager (Tabbed: Manual | Bulk | File) ──
export function QuestionsAdmin() {
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [questions, setQuestions] = useState([])
  const [loadingQ, setLoadingQ] = useState(false)
  const [tab, setTab] = useState('list') // 'list' | 'manual' | 'bulk' | 'file'
  const [showModal, setShowModal] = useState(false)
  const [editQ, setEditQ] = useState(null)
  const emptyForm = { question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A' }
  const [form, setForm] = useState(emptyForm)

  // Bulk add state (multiple questions at once)
  const [bulkRows, setBulkRows] = useState([{ ...emptyForm }])
  const [savingBulk, setSavingBulk] = useState(false)

  // File upload state
  const fileRef = useRef()
  const [filePreview, setFilePreview] = useState([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [fileProgress, setFileProgress] = useState({ done: 0, total: 0, errors: [] })
  const [fileDone, setFileDone] = useState(false)

  useEffect(() => {
    supabase.from('courses').select('id, title, class').eq('is_active', true).then(({ data }) => setCourses(data || []))
  }, [])

  const loadQuestions = async (courseId) => {
    setLoadingQ(true)
    const { data } = await supabase.from('questions').select('*').eq('course_id', courseId).order('order_index')
    setQuestions(data || [])
    setLoadingQ(false)
  }

  const selectCourse = (id) => {
    setSelectedCourse(id)
    setTab('list')
    setFilePreview([])
    setFileDone(false)
    setBulkRows([{ ...emptyForm }])
    if (id) loadQuestions(id)
  }

  // ── Manual save ──
  const openEdit = (q) => {
    setEditQ(q)
    setForm({ question_text: q.question_text, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d, correct_answer: q.correct_answer })
    setShowModal(true)
  }
  const openCreate = () => { setEditQ(null); setForm(emptyForm); setShowModal(true) }

  const saveManual = async () => {
    if (!form.question_text.trim() || !form.option_a || !form.option_b || !form.option_c || !form.option_d) return toast.error('All fields required')
    const payload = { ...form, course_id: selectedCourse, order_index: editQ ? editQ.order_index : questions.length }
    if (editQ) {
      await supabase.from('questions').update(payload).eq('id', editQ.id)
      toast.success('Question updated')
    } else {
      await supabase.from('questions').insert(payload)
      toast.success('Question added')
    }
    setShowModal(false)
    loadQuestions(selectedCourse)
  }

  const deleteQ = async (id) => {
    if (!confirm('Delete this question?')) return
    await supabase.from('questions').delete().eq('id', id)
    loadQuestions(selectedCourse)
  }

  // ── Bulk add ──
  const addBulkRow = () => setBulkRows(r => [...r, { ...emptyForm }])
  const removeBulkRow = (i) => setBulkRows(r => r.filter((_, idx) => idx !== i))
  const updateBulkRow = (i, key, val) => setBulkRows(r => r.map((row, idx) => idx === i ? { ...row, [key]: val } : row))

  const saveBulk = async () => {
    const valid = bulkRows.filter(r => r.question_text.trim() && r.option_a && r.option_b && r.option_c && r.option_d)
    if (!valid.length) return toast.error('Fill in at least one complete question')
    if (valid.length < bulkRows.length) toast(`${bulkRows.length - valid.length} incomplete row(s) skipped`, { icon: '⚠️' })
    setSavingBulk(true)
    const rows = valid.map((r, i) => ({ ...r, course_id: selectedCourse, order_index: questions.length + i }))
    const { error } = await supabase.from('questions').insert(rows)
    if (error) { toast.error('Failed: ' + error.message); setSavingBulk(false); return }
    toast.success(`${valid.length} question${valid.length !== 1 ? 's' : ''} added!`)
    setBulkRows([{ ...emptyForm }])
    setSavingBulk(false)
    setTab('list')
    loadQuestions(selectedCourse)
  }

  // ── File upload ──
  const parseQFile = (file) => {
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext === 'csv') {
      Papa.parse(file, { header: true, skipEmptyLines: true, complete: (r) => setFilePreview(r.data), error: () => toast.error('Failed to parse CSV') })
    } else if (['xlsx', 'xls'].includes(ext)) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        setFilePreview(XLSX.utils.sheet_to_json(ws))
      }
      reader.readAsArrayBuffer(file)
    } else toast.error('Only CSV and Excel files supported')
  }

  const downloadQTemplate = () => {
    const data = [
      { question: 'What is 2 + 2?', option_a: '3', option_b: '4', option_c: '5', option_d: '6', correct_answer: 'B' },
      { question: 'What is the capital of Nigeria?', option_a: 'Lagos', option_b: 'Kano', option_c: 'Abuja', option_d: 'Ibadan', correct_answer: 'C' },
    ]
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Questions')
    XLSX.writeFile(wb, 'questions_template.xlsx')
  }

  const uploadQFile = async () => {
    if (!filePreview.length) return toast.error('No data to upload')
    setUploadingFile(true)
    setFileDone(false)
    const errors = []
    let done = 0
    const rows = []

    for (let i = 0; i < filePreview.length; i++) {
      const row = filePreview[i]
      const question_text = (row['question'] || row['question_text'] || row['Question'] || '').toString().trim()
      const option_a = (row['option_a'] || row['Option A'] || row['A'] || '').toString().trim()
      const option_b = (row['option_b'] || row['Option B'] || row['B'] || '').toString().trim()
      const option_c = (row['option_c'] || row['Option C'] || row['C'] || '').toString().trim()
      const option_d = (row['option_d'] || row['Option D'] || row['D'] || '').toString().trim()
      const correct_answer = (row['correct_answer'] || row['Correct Answer'] || row['answer'] || '').toString().trim().toUpperCase()

      if (!question_text || !option_a || !option_b || !option_c || !option_d) {
        errors.push(`Row ${i + 2}: Missing required fields`); continue
      }
      if (!['A','B','C','D'].includes(correct_answer)) {
        errors.push(`Row ${i + 2}: correct_answer must be A, B, C, or D (got "${correct_answer}")`); continue
      }
      rows.push({ question_text, option_a, option_b, option_c, option_d, correct_answer, course_id: selectedCourse, order_index: questions.length + done })
      done++
      setFileProgress({ done: i + 1, total: filePreview.length, errors })
    }

    if (rows.length) {
      const { error } = await supabase.from('questions').insert(rows)
      if (error) { toast.error('Upload failed: ' + error.message); setUploadingFile(false); return }
    }

    setUploadingFile(false)
    setFileDone(true)
    setFileProgress(p => ({ ...p, errors }))
    toast.success(`${done} question${done !== 1 ? 's' : ''} uploaded!`)
    loadQuestions(selectedCourse)
  }

  const course = courses.find(c => c.id === selectedCourse)

  return (
    <div>
      {/* Course selector always visible */}
      <div style={s.toolbar}>
        <select style={{ ...s.select, flex: 1 }} value={selectedCourse} onChange={e => selectCourse(e.target.value)}>
          <option value="">— Select a course to manage questions —</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title} ({c.class})</option>)}
        </select>
      </div>

      {!selectedCourse && (
        <div style={{ textAlign: 'center', padding: '80px', color: '#718096' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>❓</div>
          <p style={{ fontSize: '16px' }}>Select a course above to view and manage its questions</p>
        </div>
      )}

      {selectedCourse && (
        <>
          {/* Tabs */}
          <div style={s.tabs}>
            <button style={{ ...s.tab, ...(tab === 'list' ? s.tabActive : {}) }} onClick={() => setTab('list')}>
              📋 Questions ({questions.length})
            </button>
            <button style={{ ...s.tab, ...(tab === 'manual' ? s.tabActive : {}) }} onClick={() => setTab('manual')}>
              ✏️ Add Single
            </button>
            <button style={{ ...s.tab, ...(tab === 'bulk' ? s.tabActive : {}) }} onClick={() => setTab('bulk')}>
              📝 Add Multiple
            </button>
            <button style={{ ...s.tab, ...(tab === 'file' ? s.tabActive : {}) }} onClick={() => setTab('file')}>
              📁 Upload File
            </button>
          </div>

          {/* ── List tab ── */}
          {tab === 'list' && (
            <div>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#718096' }}>{questions.length} question{questions.length !== 1 ? 's' : ''} in <strong>{course?.title}</strong></span>
                <button style={s.primaryBtn} onClick={openCreate}>+ Add Single Question</button>
              </div>
              {loadingQ ? <LoadingState /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {questions.map((q, i) => (
                    <div key={q.id} style={s.qCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={s.qNum}>Q{i + 1}</div>
                          <p style={s.qText}>{q.question_text}</p>
                          <div style={s.optGrid}>
                            {['A','B','C','D'].map(opt => (
                              <div key={opt} style={{ ...s.optItem, background: q.correct_answer === opt ? '#dcfce7' : '#f8f9fc', color: q.correct_answer === opt ? '#15803d' : '#4a5568', fontWeight: q.correct_answer === opt ? '600' : '400' }}>
                                <span style={s.optLabel}>{opt}</span> {q[`option_${opt.toLowerCase()}`]}
                                {q.correct_answer === opt && <span style={{ marginLeft: 'auto' }}>✓</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={s.actions}>
                          <button style={s.editBtn} onClick={() => openEdit(q)}>Edit</button>
                          <button style={s.delBtn} onClick={() => deleteQ(q.id)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!questions.length && (
                    <div style={{ textAlign: 'center', padding: '48px', color: '#718096', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
                      No questions yet. Use the tabs above to add questions.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Manual add tab ── */}
          {tab === 'manual' && (
            <div style={s.card}>
              <h3 style={{ fontSize: '17px', fontWeight: '600', marginBottom: '20px' }}>Add Single Question — {course?.title}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={s.field}>
                  <label style={s.label}>Question Text</label>
                  <textarea style={{ ...s.input, height: '90px', resize: 'vertical' }} value={form.question_text} onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))} placeholder="Type the question here..." />
                </div>
                <div style={s.optGrid2}>
                  {['A','B','C','D'].map(opt => (
                    <div key={opt} style={s.field}>
                      <label style={s.label}>Option {opt}</label>
                      <input style={s.input} value={form[`option_${opt.toLowerCase()}`]} onChange={e => setForm(f => ({ ...f, [`option_${opt.toLowerCase()}`]: e.target.value }))} placeholder={`Option ${opt}`} />
                    </div>
                  ))}
                </div>
                <div style={{ ...s.field, maxWidth: '220px' }}>
                  <label style={s.label}>Correct Answer</label>
                  <select style={s.input} value={form.correct_answer} onChange={e => setForm(f => ({ ...f, correct_answer: e.target.value }))}>
                    {['A','B','C','D'].map(opt => <option key={opt} value={opt}>Option {opt}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button style={s.cancelBtn} onClick={() => { setForm(emptyForm); setTab('list') }}>Cancel</button>
                <button style={s.primaryBtn} onClick={saveManual}>✅ Save Question</button>
              </div>
            </div>
          )}

          {/* ── Bulk add tab ── */}
          {tab === 'bulk' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: '600' }}>Add Multiple Questions — {course?.title}</h3>
                <button style={s.primaryBtn} onClick={addBulkRow}>+ Add Row</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {bulkRows.map((row, i) => (
                  <div key={i} style={{ ...s.card, position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontWeight: '600', color: '#1a202c' }}>Question {i + 1}</span>
                      {bulkRows.length > 1 && (
                        <button style={s.delBtn} onClick={() => removeBulkRow(i)}>✕ Remove</button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={s.field}>
                        <label style={s.label}>Question Text</label>
                        <textarea style={{ ...s.input, height: '70px', resize: 'vertical' }} value={row.question_text} onChange={e => updateBulkRow(i, 'question_text', e.target.value)} placeholder="Enter question..." />
                      </div>
                      <div style={s.optGrid2}>
                        {['A','B','C','D'].map(opt => (
                          <div key={opt} style={s.field}>
                            <label style={s.label}>Option {opt}</label>
                            <input style={s.input} value={row[`option_${opt.toLowerCase()}`]} onChange={e => updateBulkRow(i, `option_${opt.toLowerCase()}`, e.target.value)} placeholder={`Option ${opt}`} />
                          </div>
                        ))}
                      </div>
                      <div style={{ ...s.field, maxWidth: '200px' }}>
                        <label style={s.label}>Correct Answer</label>
                        <select style={s.input} value={row.correct_answer} onChange={e => updateBulkRow(i, 'correct_answer', e.target.value)}>
                          {['A','B','C','D'].map(opt => <option key={opt} value={opt}>Option {opt}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button style={s.cancelBtn} onClick={() => { setBulkRows([{ ...emptyForm }]); setTab('list') }}>Cancel</button>
                <button style={{ ...s.primaryBtn, opacity: savingBulk ? 0.7 : 1 }} onClick={saveBulk} disabled={savingBulk}>
                  {savingBulk ? '⏳ Saving...' : `✅ Save All ${bulkRows.length} Question${bulkRows.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          )}

          {/* ── File upload tab ── */}
          {tab === 'file' && (
            <div>
              <div style={s.infoBox}>
                <div style={{ fontWeight: '600', marginBottom: '12px' }}>📋 Required Columns</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px', fontSize: '13px' }}>
                  {[
                    ['question', 'Required', 'The question text'],
                    ['option_a', 'Required', 'Option A text'],
                    ['option_b', 'Required', 'Option B text'],
                    ['option_c', 'Required', 'Option C text'],
                    ['option_d', 'Required', 'Option D text'],
                    ['correct_answer', 'Required', 'A, B, C, or D'],
                  ].map(([col, req, note]) => (
                    <div key={col} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <code style={{ background: '#f0f2f8', padding: '2px 7px', borderRadius: '4px', fontFamily: 'monospace', minWidth: '100px' }}>{col}</code>
                      <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '100px' }}>{req}</span>
                      <span style={{ color: '#718096' }}>{note}</span>
                    </div>
                  ))}
                </div>
                <button style={s.templateBtn} onClick={downloadQTemplate}>⬇ Download Template (Excel)</button>
              </div>

              <div
                style={s.dropzone}
                onDrop={e => { e.preventDefault(); e.dataTransfer.files[0] && parseQFile(e.dataTransfer.files[0]) }}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
                  onChange={e => e.target.files[0] && parseQFile(e.target.files[0])} />
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>📁</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a202c', marginBottom: '4px' }}>Drop CSV or Excel file here</div>
                <div style={{ fontSize: '13px', color: '#718096' }}>or click to browse</div>
              </div>

              {filePreview.length > 0 && (
                <div style={s.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ fontWeight: '600' }}>Preview — {filePreview.length} questions</h4>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button style={s.cancelBtn} onClick={() => { setFilePreview([]); setFileDone(false) }}>Clear</button>
                      <button style={{ ...s.primaryBtn, opacity: uploadingFile ? 0.7 : 1 }} onClick={uploadQFile} disabled={uploadingFile}>
                        {uploadingFile ? `⏳ Uploading... ${fileProgress.done}/${fileProgress.total}` : `⬆ Upload ${filePreview.length} Questions`}
                      </button>
                    </div>
                  </div>

                  {uploadingFile && (
                    <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', marginBottom: '14px', overflow: 'hidden' }}>
                      <div style={{ width: `${(fileProgress.done / fileProgress.total) * 100}%`, height: '100%', background: '#10b981', borderRadius: '3px', transition: 'width 0.3s' }} />
                    </div>
                  )}

                  {fileDone && fileProgress.errors.length > 0 && (
                    <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '10px', padding: '14px', marginBottom: '14px', color: '#c53030', fontSize: '13px' }}>
                      ⚠️ {fileProgress.errors.length} error(s): {fileProgress.errors.slice(0, 3).join(' | ')}
                    </div>
                  )}

                  <div style={{ overflowX: 'auto' }}>
                    <table style={s.table}>
                      <thead><tr style={s.thead}>{Object.keys(filePreview[0]).map(k => <th key={k} style={s.th}>{k}</th>)}</tr></thead>
                      <tbody>
                        {filePreview.slice(0, 8).map((row, i) => (
                          <tr key={i} style={s.tr}>{Object.values(row).map((v, j) => <td key={j} style={s.td}>{String(v)}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                    {filePreview.length > 8 && <div style={{ textAlign: 'center', padding: '10px', color: '#718096', fontSize: '13px' }}>...and {filePreview.length - 8} more rows</div>}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Edit modal */}
      {showModal && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, width: '560px' }}>
            <h3 style={s.modalTitle}>{editQ ? 'Edit Question' : 'New Question'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={s.field}>
                <label style={s.label}>Question Text</label>
                <textarea style={{ ...s.input, height: '80px', resize: 'vertical' }} value={form.question_text} onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))} placeholder="Enter the question text..." />
              </div>
              {['A','B','C','D'].map(opt => (
                <div key={opt} style={s.field}>
                  <label style={s.label}>Option {opt}</label>
                  <input style={s.input} value={form[`option_${opt.toLowerCase()}`]} onChange={e => setForm(f => ({ ...f, [`option_${opt.toLowerCase()}`]: e.target.value }))} placeholder={`Option ${opt}`} />
                </div>
              ))}
              <div style={s.field}>
                <label style={s.label}>Correct Answer</label>
                <select style={s.input} value={form.correct_answer} onChange={e => setForm(f => ({ ...f, correct_answer: e.target.value }))}>
                  {['A','B','C','D'].map(opt => <option key={opt} value={opt}>Option {opt}</option>)}
                </select>
              </div>
            </div>
            <div style={s.modalBtns}>
              <button style={s.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={s.primaryBtn} onClick={saveManual}>{editQ ? 'Save Changes' : 'Add Question'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Students View (Admin) ────────────────────────────
export function StudentsAdmin() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [selected, setSelected] = useState(null)

  const load = async () => {
    const { data } = await supabase.from('users').select('*').eq('role', 'student').order('name')
    setStudents(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = students.filter(u =>
    (!classFilter || u.class === classFilter) &&
    (!search || u.name.toLowerCase().includes(search.toLowerCase()) || u.student_id.toLowerCase().includes(search.toLowerCase()))
  )

  const classCounts = CLASSES.reduce((acc, cls) => {
    acc[cls] = students.filter(u => u.class === cls).length
    return acc
  }, {})

  if (loading) return <LoadingState />

  return (
    <div>
      <div style={s.statsGrid}>
        {CLASSES.map(cls => (
          <div key={cls} style={{ ...s.statCard, cursor: 'pointer' }} onClick={() => setClassFilter(cls === classFilter ? '' : cls)}>
            <div style={{ ...s.statIcon, background: classFilter === cls ? '#1a1a2e18' : '#f0f2f8', color: classFilter === cls ? '#1a1a2e' : '#718096', fontSize: '14px' }}>{cls}</div>
            <div style={s.statVal}>{classCounts[cls]}</div>
            <div style={s.statLabel}>Students</div>
          </div>
        ))}
      </div>

      <div style={s.toolbar}>
        <input style={s.search} placeholder="🔍 Search by name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={s.select} value={classFilter} onChange={e => setClassFilter(e.target.value)}>
          <option value="">All Classes</option>
          {CLASSES.map(c => <option key={c}>{c}</option>)}
        </select>
        <span style={{ color: '#718096', fontSize: '14px' }}>{filtered.length} student{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={s.tableCard}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              {['Name','Student ID','Class','Status','Action'].map(h => <th key={h} style={s.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={s.tr}>
                <td style={s.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={s.miniAvatar}>{u.name.charAt(0)}</div>
                    <div style={s.strong}>{u.name}</div>
                  </div>
                </td>
                <td style={s.td}><code style={s.code}>{u.student_id}</code></td>
                <td style={s.td}><span style={s.classBadge}>{u.class}</span></td>
                <td style={s.td}><span style={{ ...s.statusBadge, background: u.is_suspended ? '#fee2e2' : '#dcfce7', color: u.is_suspended ? '#dc2626' : '#15803d' }}>{u.is_suspended ? 'Suspended' : 'Active'}</span></td>
                <td style={s.td}><button style={s.viewBtn} onClick={() => setSelected(u)}>View</button></td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>No students found</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && <StudentDetailModal user={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function StudentDetailModal({ user: u, onClose }) {
  const [results, setResults] = useState([])
  useEffect(() => {
    supabase.from('exam_sessions').select('*, courses(title)').eq('student_id', u.id).not('submitted_at', 'is', null).then(({ data }) => setResults(data || []))
  }, [u.id])

  return (
    <div style={s.overlay}>
      <div style={{ ...s.modal, width: '500px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={s.bigAvatar}>{u.name.charAt(0)}</div>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: '600' }}>{u.name}</h3>
            <div style={{ color: '#718096', fontSize: '14px' }}>{u.student_id} · {u.class}</div>
          </div>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <div style={s.detailRow}><span>Status</span><span style={{ color: u.is_suspended ? '#dc2626' : '#15803d' }}>{u.is_suspended ? 'Suspended' : 'Active'}</span></div>
          <div style={s.detailRow}><span>Joined</span><span>{new Date(u.created_at).toLocaleDateString()}</span></div>
        </div>
        {results.length > 0 && (
          <div>
            <div style={{ fontWeight: '600', marginBottom: '10px' }}>Exam Results</div>
            {results.map(r => (
              <div key={r.id} style={s.resultRow}>
                <span>{r.courses?.title}</span>
                <span style={{ fontWeight: '600' }}>{r.score}/{r.courses?.total_marks || 100} · {r.total_questions ? Math.round((r.score/(r.courses?.total_marks||100))*100) : 0}% · {getGrade(r.total_questions ? Math.round((r.score/(r.courses?.total_marks||100))*100) : 0)}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: '24px', textAlign: 'right' }}>
          <button style={s.cancelBtn} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Results Overview (Admin) ─────────────────────────
export function ResultsAdmin() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [classFilter, setClassFilter] = useState('')

  useEffect(() => {
    supabase.from('exam_sessions').select('*, users(name, student_id, class), courses(title, total_marks)').not('submitted_at', 'is', null).order('submitted_at', { ascending: false }).then(({ data }) => { setSessions(data || []); setLoading(false) })
  }, [])

  const filtered = sessions.filter(s => !classFilter || s.users?.class === classFilter)

  if (loading) return <LoadingState />

  return (
    <div>
      <div style={s.toolbar}>
        <select style={s.select} value={classFilter} onChange={e => setClassFilter(e.target.value)}>
          <option value="">All Classes</option>
          {CLASSES.map(c => <option key={c}>{c}</option>)}
        </select>
        <span style={{ color: '#718096', fontSize: '14px' }}>{filtered.length} submission{filtered.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={s.tableCard}>
        <table style={s.table}>
          <thead><tr style={s.thead}>{['Student','ID','Class','Course','Score','%','Grade','Date'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(r => {
              const pct = (r.courses?.total_marks || 100) ? Math.round((r.score / (r.courses?.total_marks || 100)) * 100) : 0
              const pass = pct >= 50
              return (
                <tr key={r.id} style={s.tr}>
                  <td style={s.td}><div style={s.strong}>{r.users?.name}</div></td>
                  <td style={s.td}><code style={s.code}>{r.users?.student_id}</code></td>
                  <td style={s.td}><span style={s.classBadge}>{r.users?.class}</span></td>
                  <td style={s.td}>{r.courses?.title}</td>
                  <td style={s.td}><strong>{r.score}</strong>/{r.courses?.total_marks || 100}</td>
                  <td style={s.td}><span style={{ ...s.statusBadge, background: pass ? '#dcfce7' : '#fee2e2', color: pass ? '#15803d' : '#dc2626' }}>{pct}%</span></td>
                  <td style={s.td}><span style={{fontWeight:'700',fontSize:'15px',color: pct>=50?'#15803d':'#dc2626'}}>{getGrade(pct)}</span></td>
                  <td style={s.td}>{new Date(r.submitted_at).toLocaleDateString()}</td>
                </tr>
              )
            })}
            {!filtered.length && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>No results found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Shared Styles ────────────────────────────────────
const s = {
  banner: { background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', borderRadius: '16px', padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', color: '#fff' },
  bannerSmall: { fontSize: '14px', color: 'rgba(255,255,255,0.65)', marginBottom: '4px' },
  bannerTitle: { fontSize: '28px', fontWeight: '600', marginBottom: '8px' },
  bannerSub: { color: 'rgba(255,255,255,0.65)', fontSize: '14px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '14px', marginBottom: '24px' },
  statCard: { background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', textAlign: 'center' },
  statIcon: { width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', margin: '0 auto 10px', fontWeight: '700' },
  statVal: { fontSize: '28px', fontWeight: '700', color: '#1a202c', marginBottom: '2px' },
  statLabel: { fontSize: '12px', color: '#718096' },
  toolbar: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' },
  search: { flex: 1, padding: '10px 16px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", outline: 'none', minWidth: '200px' },
  select: { padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: '#fff', cursor: 'pointer' },
  primaryBtn: { padding: '10px 20px', border: 'none', borderRadius: '10px', background: '#1a1a2e', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' },
  tableCard: { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f8f9fc' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tr: { borderBottom: '1px solid #f0f2f8', transition: 'background 0.1s' },
  td: { padding: '14px 16px', fontSize: '14px', color: '#1a202c' },
  strong: { fontWeight: '600', color: '#1a202c' },
  sub: { fontSize: '12px', color: '#718096', marginTop: '2px' },
  classBadge: { background: '#eff6ff', color: '#1d4ed8', fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '100px' },
  statusBadge: { fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '100px' },
  statusBtn: { fontSize: '12px', fontWeight: '600', padding: '4px 12px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  code: { background: '#f0f2f8', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' },
  actions: { display: 'flex', gap: '8px' },
  editBtn: { padding: '6px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", color: '#1a202c' },
  delBtn: { padding: '6px 14px', border: '1.5px solid #fee2e2', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", color: '#ef4444' },
  viewBtn: { padding: '6px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", color: '#3b82f6' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflow: 'auto', padding: '20px' },
  modal: { background: '#fff', borderRadius: '20px', padding: '32px', width: '500px', maxWidth: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflow: 'auto' },
  modalTitle: { fontSize: '20px', fontWeight: '600', marginBottom: '24px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '500', color: '#4a5568' },
  input: { padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: '#fff', color: '#1a202c' },
  modalBtns: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  cancelBtn: { padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '10px', background: '#fff', cursor: 'pointer', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", color: '#4a5568' },
  qCard: { background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' },
  qNum: { fontSize: '11px', fontWeight: '700', color: '#718096', textTransform: 'uppercase', marginBottom: '6px' },
  qText: { fontSize: '16px', color: '#1a202c', fontWeight: '500', marginBottom: '12px' },
  optGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  optGrid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  optItem: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', fontSize: '13px' },
  optLabel: { width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 },
  miniAvatar: { width: '32px', height: '32px', borderRadius: '50%', background: '#1a1a2e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '14px', flexShrink: 0 },
  bigAvatar: { width: '56px', height: '56px', borderRadius: '50%', background: '#1a1a2e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '24px', flexShrink: 0 },
  detailRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f2f8', fontSize: '14px', color: '#4a5568' },
  resultRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8f9fc', borderRadius: '8px', fontSize: '14px', marginBottom: '6px' },
  // ── new: tabs for questions ──
  tabs: { display: 'flex', gap: '4px', background: '#f0f2f8', borderRadius: '12px', padding: '4px', marginBottom: '20px', width: 'fit-content', flexWrap: 'wrap' },
  tab: { padding: '9px 18px', border: 'none', borderRadius: '9px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', fontFamily: "'DM Sans', sans-serif", color: '#718096', background: 'transparent', transition: 'all 0.15s', whiteSpace: 'nowrap' },
  tabActive: { background: '#fff', color: '#1a202c', boxShadow: '0 1px 4px rgba(0,0,0,0.10)' },
  card: { background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '16px' },
  infoBox: { background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', marginBottom: '16px' },
  dropzone: { border: '2px dashed #cbd5e0', borderRadius: '14px', padding: '40px', textAlign: 'center', cursor: 'pointer', marginBottom: '16px', background: '#f8f9fc' },
  templateBtn: { background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", fontWeight: '600' },
}
