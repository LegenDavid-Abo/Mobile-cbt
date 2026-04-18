import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

// ── Student Home ──────────────────────────────────────
export function StudentHome({ setPage }) {
  const { user } = useAuth()
  const [stats, setStats] = useState({ available: 0, completed: 0, pending: 0 })

  useEffect(() => {
    async function load() {
      const now = new Date().toISOString()
      const { data: courses } = await supabase.from('courses').select('id').eq('class', user.class).eq('is_active', true)
      const { data: sessions } = await supabase.from('exam_sessions').select('id').eq('student_id', user.id).not('submitted_at', 'is', null)
      const total = courses?.length || 0
      const done = sessions?.length || 0
      setStats({ available: total, completed: done, pending: Math.max(0, total - done) })
    }
    load()
  }, [user])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      <div style={cardStyles.welcomeBanner}>
        <div>
          <div style={cardStyles.greetSmall}>{greeting} 👋</div>
          <h2 style={cardStyles.greetName}>{user?.name}</h2>
          <p style={cardStyles.greetSub}>Class: <strong>{user?.class}</strong> · Student ID: <strong>{user?.studentId}</strong></p>
        </div>
        <div style={cardStyles.studentIllustration}>📖</div>
      </div>

      <div style={cardStyles.statsRow}>
        <StatCard icon="📚" label="Available Courses" value={stats.available} color="#3b82f6" onClick={() => setPage('courses')} />
        <StatCard icon="✅" label="Completed Exams" value={stats.completed} color="#10b981" />
        <StatCard icon="⏳" label="Pending Exams" value={stats.pending} color="#f59e0b" onClick={() => setPage('courses')} />
      </div>

      <div style={cardStyles.card}>
        <h3 style={cardStyles.cardTitle}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
          <ActionBtn icon="📚" label="View My Courses" onClick={() => setPage('courses')} />
          <ActionBtn icon="📊" label="View My Results" onClick={() => setPage('results')} />
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color, onClick }) {
  return (
    <div style={{ ...cardStyles.statCard, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div style={{ ...cardStyles.statIcon, background: color + '18', color }}>{icon}</div>
      <div style={cardStyles.statVal}>{value}</div>
      <div style={cardStyles.statLabel}>{label}</div>
    </div>
  )
}

function ActionBtn({ icon, label, onClick }) {
  return (
    <button style={cardStyles.actionBtn} onClick={onClick}>
      <span>{icon}</span> {label}
    </button>
  )
}

// ── Student Courses List ──────────────────────────────
export function StudentCourses({ onStartExam }) {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [sessions, setSessions] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const now = new Date().toISOString()
      const { data: cData } = await supabase.from('courses').select('*, questions(count)').eq('class', user.class).eq('is_active', true)
      const { data: sData } = await supabase.from('exam_sessions').select('*').eq('student_id', user.id)
      const sessionMap = {}
      sData?.forEach(s => { sessionMap[s.course_id] = s })
      setSessions(sessionMap)
      setCourses(cData || [])
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) return <LoadingState />

  if (!courses.length) return (
    <div style={cardStyles.empty}>
      <div style={cardStyles.emptyIcon}>📚</div>
      <h3>No courses available</h3>
      <p>No exams are currently scheduled for your class ({user.class}).</p>
    </div>
  )

  return (
    <div>
      <h2 style={cardStyles.sectionTitle}>Available Courses — {user.class}</h2>
      <div style={cardStyles.courseGrid}>
        {courses.map(course => {
          const session = sessions[course.id]
          const isCompleted = session?.submitted_at
          const examDate = course.exam_date ? new Date(course.exam_date) : null
          const now = new Date()
          const isAvailable = !examDate || now >= examDate

          return (
            <div key={course.id} style={{ ...cardStyles.courseCard, opacity: !isAvailable ? 0.7 : 1 }}>
              <div style={cardStyles.courseHeader}>
                <div style={cardStyles.courseIcon}>📘</div>
                {isCompleted && <span style={cardStyles.completedBadge}>✅ Done</span>}
                {!isAvailable && <span style={cardStyles.scheduledBadge}>🕐 Scheduled</span>}
              </div>
              <h3 style={cardStyles.courseName}>{course.title}</h3>
              <p style={cardStyles.courseDesc}>{course.description || 'No description provided.'}</p>
              <div style={cardStyles.courseMeta}>
                <span>⏱ {course.duration_minutes} mins</span>
                <span>❓ {course.questions?.[0]?.count || 0} questions</span>
              </div>
              {examDate && (
                <div style={cardStyles.examTime}>
                  🗓 Exam: {examDate.toLocaleString()}
                </div>
              )}
              {isCompleted ? (
                <div style={cardStyles.scoreBox}>
                  Score: <strong>{session.score}/{course.total_marks || 100}</strong>
                  {' '}({session.total_questions ? Math.round((session.score / (course.total_marks || 100)) * 100) : 0}%)
                </div>
              ) : (
                <button
                  style={{ ...cardStyles.startBtn, opacity: !isAvailable ? 0.5 : 1 }}
                  disabled={!isAvailable}
                  onClick={() => isAvailable && onStartExam(course)}
                >
                  {!isAvailable ? '⏳ Not Yet Available' : 'Start Exam →'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Exam Confirm Modal ──────────────────────────────────
export function ExamConfirmModal({ course, onConfirm, onCancel }) {
  return (
    <div style={cardStyles.overlay}>
      <div style={cardStyles.modal}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
        <h3 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '12px' }}>Start Exam?</h3>
        <p style={{ color: '#718096', marginBottom: '8px' }}><strong>{course.title}</strong></p>
        <div style={cardStyles.examInfoGrid}>
          <div style={cardStyles.examInfoItem}><span>⏱</span><span>{course.duration_minutes} minutes</span></div>
          <div style={cardStyles.examInfoItem}><span>📍</span><span>Once started, timer cannot be paused</span></div>
          <div style={cardStyles.examInfoItem}><span>⚠️</span><span>Auto-submits when time runs out</span></div>
        </div>
        <p style={{ fontWeight: '600', color: '#1a202c', marginBottom: '24px' }}>Are you sure you want to begin?</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button style={cardStyles.cancelBtn} onClick={onCancel}>No, Go Back</button>
          <button style={cardStyles.startExamBtn} onClick={onConfirm}>Yes, Start Exam →</button>
        </div>
      </div>
    </div>
  )
}

// ── Exam Page ─────────────────────────────────────────
export function ExamPage({ course, onComplete }) {
  const { user } = useAuth()
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [current, setCurrent] = useState(0)
  const [timeLeft, setTimeLeft] = useState(course.duration_minutes * 60)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const timerRef = useRef(null)
  const autoSubmitted = useRef(false)

  useEffect(() => {
    async function init() {
      const { data: qData } = await supabase
        .from('questions')
        .select('*')
        .eq('course_id', course.id)
        .order('order_index')

      const { data: session } = await supabase
        .from('exam_sessions')
        .upsert({ student_id: user.id, course_id: course.id }, { onConflict: 'student_id,course_id', ignoreDuplicates: false })
        .select()
        .single()

      // ── Shuffle questions order and options per question ──
      // Fisher-Yates shuffle — works on any array
      const shuffle = (arr) => {
        const a = [...arr]
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]]
        }
        return a
      }

      // Shuffle question order — every student gets a different question sequence
      const shuffledQuestions = shuffle(qData || []).map(q => {
        // Map label → text so we know which text the admin marked correct
        const labelToText = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }
        const correctText = labelToText[q.correct_answer] // the actual correct text e.g. "Abuja"

        // Build four slots and shuffle their display positions
        const slots = ['A', 'B', 'C', 'D']
        const texts  = [q.option_a, q.option_b, q.option_c, q.option_d]
        const shuffledTexts = shuffle(texts) // randomise the text order

        // Find which new slot now holds the correct text
        const newCorrectLabel = slots[shuffledTexts.indexOf(correctText)]
          ?? slots[shuffledTexts.findIndex(t => t === correctText)]
          ?? q.correct_answer // fallback (should never hit)

        return {
          ...q,
          option_a: shuffledTexts[0],
          option_b: shuffledTexts[1],
          option_c: shuffledTexts[2],
          option_d: shuffledTexts[3],
          correct_answer: newCorrectLabel, // now correctly points to the right slot
          _correct_text: correctText,       // keep original text for safe review comparison
        }
      })

      setQuestions(shuffledQuestions)
      setSessionId(session?.id)
      setLoading(false)
    }
    init()
  }, [course, user])

  const handleSubmit = useCallback(async (isAuto = false) => {
    if (submitting || autoSubmitted.current) return
    autoSubmitted.current = true
    setSubmitting(true)
    clearInterval(timerRef.current)

    let correctCount = 0
    const answerRows = questions.map(q => {
      const selected = answers[q.id] || null
      const isCorrect = selected === q.correct_answer
      if (isCorrect) correctCount++
      return { session_id: sessionId, question_id: q.id, selected_answer: selected, is_correct: isCorrect }
    })

    // Weighted score: (correct / total_questions) * total_marks, rounded to 2dp
    const totalMarks = course.total_marks || 100
    const weightedScore = questions.length > 0
      ? Math.round((correctCount / questions.length) * totalMarks * 100) / 100
      : 0

    await supabase.from('student_answers').upsert(answerRows, { onConflict: 'session_id,question_id' })
    await supabase.from('exam_sessions').update({
      submitted_at: new Date().toISOString(),
      is_auto_submitted: isAuto,
      score: weightedScore,
      total_questions: questions.length,
    }).eq('id', sessionId)

    onComplete({ questions, answers, correctCount, score: weightedScore, totalMarks, total: questions.length, course })
  }, [submitting, questions, answers, sessionId, course, onComplete])

  useEffect(() => {
    if (loading) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          handleSubmit(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [loading, handleSubmit])

  const selectAnswer = (qId, option) => {
    setAnswers(prev => ({ ...prev, [qId]: option }))
    if (current < questions.length - 1) {
      setTimeout(() => setCurrent(c => c + 1), 300)
    }
  }

  if (loading) return <LoadingState />

  const q = questions[current]
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const isUrgent = timeLeft < 120
  const answered = Object.keys(answers).length
  const options = ['A', 'B', 'C', 'D']
  const optionTexts = { A: q?.option_a, B: q?.option_b, C: q?.option_c, D: q?.option_d }

  return (
    <div style={examStyles.shell}>
      {/* Header */}
      <div style={examStyles.header}>
        <div>
          <div style={examStyles.courseTitle}>{course.title}</div>
          <div style={examStyles.progress}>{answered}/{questions.length} answered</div>
        </div>
        <div style={{ ...examStyles.timer, color: isUrgent ? '#ef4444' : '#1a202c', borderColor: isUrgent ? '#ef4444' : '#e2e8f0' }}>
          <span style={{ fontSize: '18px' }}>⏱</span>
          <span style={{ fontSize: '22px', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
        </div>
      </div>

      <div style={examStyles.body}>
        {/* Question panel */}
        <div style={examStyles.main}>
          <div style={examStyles.qNum}>Question {current + 1} of {questions.length}</div>
          <p style={examStyles.qText}>{q?.question_text}</p>

          <div style={examStyles.options}>
            {options.map(opt => {
              const selected = answers[q?.id] === opt
              return (
                <button
                  key={opt}
                  style={{
                    ...examStyles.option,
                    ...(selected ? examStyles.optionSelected : {}),
                  }}
                  onClick={() => selectAnswer(q.id, opt)}
                >
                  <span style={{ ...examStyles.optBubble, ...(selected ? examStyles.optBubbleSelected : {}) }}>{opt}</span>
                  <span style={examStyles.optText}>{optionTexts[opt]}</span>
                  {selected && <span style={{ marginLeft: 'auto', color: '#10b981' }}>✓</span>}
                </button>
              )
            })}
          </div>

          <div style={examStyles.navRow}>
            <button style={examStyles.navBtn} onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>
              ← Previous
            </button>
            {current < questions.length - 1 ? (
              <button style={examStyles.navBtnPrimary} onClick={() => setCurrent(c => c + 1)}>
                Next →
              </button>
            ) : (
              <button style={examStyles.submitBtn} onClick={() => handleSubmit(false)} disabled={submitting}>
                {submitting ? '⏳ Submitting...' : '✅ Submit Exam'}
              </button>
            )}
          </div>
        </div>

        {/* Question map sidebar */}
        <div style={examStyles.sidebar}>
          <div style={examStyles.sidebarTitle}>Question Map</div>
          <div style={examStyles.qGrid}>
            {questions.map((q2, i) => {
              const isAnswered = !!answers[q2.id]
              const isCurrent = i === current
              return (
                <button
                  key={q2.id}
                  style={{
                    ...examStyles.qDot,
                    background: isCurrent ? '#1a1a2e' : isAnswered ? '#10b981' : '#fee2e2',
                    color: isCurrent || isAnswered ? '#fff' : '#ef4444',
                    fontWeight: isCurrent ? '700' : '500',
                  }}
                  onClick={() => setCurrent(i)}
                  title={`Q${i + 1} ${isAnswered ? '(answered)' : '(skipped)'}`}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
          <div style={examStyles.legend}>
            <span><span style={{ ...examStyles.dot, background: '#10b981' }} /> Answered</span>
            <span><span style={{ ...examStyles.dot, background: '#fee2e2', border: '1px solid #ef4444' }} /> Skipped</span>
            <span><span style={{ ...examStyles.dot, background: '#1a1a2e' }} /> Current</span>
          </div>
          {answered === questions.length && (
            <button style={examStyles.submitBtn2} onClick={() => handleSubmit(false)} disabled={submitting}>
              ✅ Submit Now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}


// ── Grade calculator ──────────────────────────────────
function getGrade(pct) {
  if (pct >= 75) return 'A'
  if (pct >= 65) return 'B'
  if (pct >= 55) return 'C'
  if (pct >= 45) return 'D'
  if (pct >= 40) return 'E'
  return 'F'
}

// ── Results Review ────────────────────────────────────
export function ResultsReview({ result, onDone }) {
  const { questions, answers, correctCount, score, totalMarks, total, course } = result
  const tm = totalMarks || course.total_marks || 100
  const pct = Math.round((score / tm) * 100)
  const pass = pct >= 50
  const optionTexts = (q) => ({ A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d })

  return (
    <div style={reviewStyles.shell}>
      <div style={reviewStyles.scoreCard}>
        <div style={reviewStyles.scoreEmoji}>{pass ? '🎉' : '😔'}</div>
        <h2 style={reviewStyles.scoreTitle}>{pass ? 'Congratulations!' : 'Keep Trying!'}</h2>

        {/* Big score display */}
        <div style={reviewStyles.scoreCircle}>
          <span style={reviewStyles.scoreNum}>{score}</span>
          <span style={reviewStyles.scoreLabel}>/ {tm}</span>
        </div>
        <p style={reviewStyles.scoreSub}>{correctCount ?? score} correct out of {total} questions — {course.title}</p>

        <div style={reviewStyles.scoreGrid}>
          <div style={{ ...reviewStyles.scoreItem, background: '#dcfce7', color: '#15803d' }}>
            <span style={{ fontSize: '20px' }}>✅</span>
            <strong>{correctCount ?? '—'}</strong>
            <span>Correct</span>
          </div>
          <div style={{ ...reviewStyles.scoreItem, background: '#fee2e2', color: '#dc2626' }}>
            <span style={{ fontSize: '20px' }}>❌</span>
            <strong>{total - (correctCount ?? 0)}</strong>
            <span>Wrong</span>
          </div>
          <div style={{ ...reviewStyles.scoreItem, background: '#f0f2f8', color: '#1a202c' }}>
            <span style={{ fontSize: '20px' }}>📊</span>
            <strong>{score}/{tm}</strong>
            <span>Marks</span>
          </div>
        </div>
      </div>

      <h3 style={reviewStyles.reviewTitle}>Answer Review</h3>
      <div style={reviewStyles.qList}>
        {questions.map((q, i) => {
          const selected = answers[q.id]
          const isCorrect = selected === q.correct_answer
          const opts = optionTexts(q)
          return (
            <div key={q.id} style={{ ...reviewStyles.qItem, borderLeft: `4px solid ${isCorrect ? '#10b981' : '#ef4444'}` }}>
              <div style={reviewStyles.qHeader}>
                <span style={reviewStyles.qNum2}>Q{i + 1}</span>
                <span style={{ color: isCorrect ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                  {isCorrect ? '✅ Correct' : '❌ Wrong'}
                </span>
              </div>
              <p style={reviewStyles.qText2}>{q.question_text}</p>
              <div style={reviewStyles.optList}>
                {['A','B','C','D'].map(opt => (
                  <div key={opt} style={{
                    ...reviewStyles.optRow,
                    background: opt === q.correct_answer ? '#dcfce7' : (opt === selected && !isCorrect ? '#fee2e2' : '#f8f9fc'),
                    borderColor: opt === q.correct_answer ? '#10b981' : (opt === selected && !isCorrect ? '#ef4444' : '#e2e8f0'),
                    fontWeight: (opt === selected || opt === q.correct_answer) ? '600' : '400',
                  }}>
                    <span style={reviewStyles.optLbl}>{opt}</span>
                    <span>{opts[opt]}</span>
                    {opt === q.correct_answer && <span style={{ marginLeft: 'auto', color: '#10b981' }}>✓ Correct</span>}
                    {opt === selected && !isCorrect && <span style={{ marginLeft: 'auto', color: '#ef4444' }}>✗ Your answer</span>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ textAlign: 'center', marginTop: '32px' }}>
        <button style={reviewStyles.doneBtn} onClick={onDone}>
          Done — Back to Courses
        </button>
      </div>
    </div>
  )
}

// ── Student Results History ───────────────────────────
export function StudentResults() {
  const { user } = useAuth()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('exam_sessions')
        .select('*, courses(title, duration_minutes, class, total_marks)')
        .eq('student_id', user.id)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false })
      setResults(data || [])
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) return <LoadingState />

  return (
    <div>
      <h2 style={cardStyles.sectionTitle}>My Exam Results</h2>
      {!results.length ? (
        <div style={cardStyles.empty}>
          <div style={cardStyles.emptyIcon}>📊</div>
          <h3>No results yet</h3>
          <p>Complete an exam to see your results here.</p>
        </div>
      ) : (
        <div style={cardStyles.card}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                {['Course','Class','Score','Percentage','Status','Date'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map(r => {
                const pct = (r.courses?.total_marks || 100) ? Math.round((r.score / (r.courses?.total_marks || 100)) * 100) : 0
                const pass = pct >= 50
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f0f2f8' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '500' }}>{r.courses?.title}</td>
                    <td style={{ padding: '14px 16px' }}>{r.courses?.class}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{fontWeight:'600'}}>{r.score}</span>
                      <span style={{color:'#718096'}}>/{r.courses?.total_marks || 100}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: pass ? '#10b981' : '#ef4444', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: pass ? '#10b981' : '#ef4444' }}>{pct}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ ...cardStyles.badge, background: pass ? '#dcfce7' : '#fee2e2', color: pass ? '#15803d' : '#dc2626' }}>
                        {pass ? 'Pass' : 'Fail'} · {getGrade(pct)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#718096', fontSize: '13px' }}>
                      {new Date(r.submitted_at).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Shared Helpers ─────────────────────────────────────
export function LoadingState() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', color: '#718096' }}>
      <div>⏳ Loading...</div>
    </div>
  )
}

const cardStyles = {
  welcomeBanner: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
    borderRadius: '16px',
    padding: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    color: '#fff',
  },
  greetSmall: { fontSize: '14px', color: 'rgba(255,255,255,0.65)', marginBottom: '4px' },
  greetName: { fontSize: '28px', fontWeight: '600', marginBottom: '8px' },
  greetSub: { color: 'rgba(255,255,255,0.65)', fontSize: '14px' },
  studentIllustration: { fontSize: '64px' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' },
  statCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e2e8f0',
    textAlign: 'center',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  statIcon: { width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', margin: '0 auto 12px' },
  statVal: { fontSize: '32px', fontWeight: '700', color: '#1a202c', marginBottom: '4px' },
  statLabel: { fontSize: '13px', color: '#718096' },
  card: { background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' },
  cardTitle: { fontSize: '17px', fontWeight: '600', color: '#1a202c', marginBottom: '4px' },
  actionBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '10px',
    background: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '500',
    fontFamily: "'DM Sans', sans-serif", color: '#1a202c', transition: 'all 0.15s',
  },
  sectionTitle: { fontSize: '22px', fontWeight: '600', color: '#1a202c', marginBottom: '20px' },
  courseGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
  courseCard: {
    background: '#fff', borderRadius: '14px', padding: '24px',
    border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px',
  },
  courseHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  courseIcon: { fontSize: '32px' },
  completedBadge: { background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '100px' },
  scheduledBadge: { background: '#fef3c7', color: '#92400e', fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '100px' },
  courseName: { fontSize: '17px', fontWeight: '600', color: '#1a202c' },
  courseDesc: { fontSize: '13px', color: '#718096', lineHeight: 1.5 },
  courseMeta: { display: 'flex', gap: '16px', fontSize: '12px', color: '#718096' },
  examTime: { fontSize: '12px', color: '#3b82f6', background: '#eff6ff', padding: '6px 10px', borderRadius: '6px' },
  scoreBox: { background: '#f0fdf4', color: '#15803d', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', textAlign: 'center' },
  startBtn: {
    background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '10px',
    padding: '12px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
    fontFamily: "'DM Sans', sans-serif", marginTop: 'auto',
  },
  empty: { textAlign: 'center', padding: '80px 40px', color: '#718096' },
  emptyIcon: { fontSize: '56px', marginBottom: '16px' },
  badge: { fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '100px', display: 'inline-block' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '20px', padding: '40px', width: '440px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  examInfoGrid: { display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8f9fc', borderRadius: '10px', padding: '16px', margin: '16px 0', textAlign: 'left' },
  examInfoItem: { display: 'flex', gap: '10px', fontSize: '14px', color: '#4a5568' },
  cancelBtn: { padding: '11px 24px', border: '1.5px solid #e2e8f0', borderRadius: '10px', background: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '500', fontFamily: "'DM Sans', sans-serif", color: '#4a5568' },
  startExamBtn: { padding: '11px 24px', border: 'none', borderRadius: '10px', background: '#1a1a2e', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: "'DM Sans', sans-serif" },
}

const examStyles = {
  shell: { display: 'flex', flexDirection: 'column', gap: '16px' },
  header: {
    background: '#fff', borderRadius: '14px', padding: '20px 24px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    border: '1px solid #e2e8f0',
  },
  courseTitle: { fontSize: '18px', fontWeight: '600', color: '#1a202c' },
  progress: { fontSize: '13px', color: '#718096', marginTop: '4px' },
  timer: {
    display: 'flex', alignItems: 'center', gap: '8px',
    border: '2px solid #e2e8f0', borderRadius: '12px', padding: '10px 20px',
    transition: 'color 0.3s, border-color 0.3s',
  },
  body: { display: 'grid', gridTemplateColumns: '1fr 200px', gap: '16px' },
  main: { background: '#fff', borderRadius: '14px', padding: '28px', border: '1px solid #e2e8f0' },
  qNum: { fontSize: '12px', color: '#718096', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' },
  qText: { fontSize: '18px', color: '#1a202c', lineHeight: 1.6, marginBottom: '24px', fontWeight: '500' },
  options: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' },
  option: {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '14px 18px', border: '1.5px solid #e2e8f0', borderRadius: '12px',
    background: '#fff', cursor: 'pointer', fontSize: '15px', textAlign: 'left',
    fontFamily: "'DM Sans', sans-serif", color: '#1a202c', transition: 'all 0.15s',
  },
  optionSelected: { border: '2px solid #10b981', background: '#f0fdf4' },
  optBubble: {
    width: '32px', height: '32px', borderRadius: '50%', background: '#f0f2f8',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px',
    color: '#4a5568', flexShrink: 0,
  },
  optBubbleSelected: { background: '#10b981', color: '#fff' },
  optText: { flex: 1 },
  navRow: { display: 'flex', gap: '12px', justifyContent: 'space-between' },
  navBtn: { padding: '11px 20px', border: '1.5px solid #e2e8f0', borderRadius: '10px', background: '#fff', cursor: 'pointer', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", color: '#4a5568' },
  navBtnPrimary: { padding: '11px 20px', border: 'none', borderRadius: '10px', background: '#1a1a2e', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: "'DM Sans', sans-serif" },
  submitBtn: { padding: '11px 20px', border: 'none', borderRadius: '10px', background: '#10b981', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: "'DM Sans', sans-serif" },
  sidebar: { background: '#fff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' },
  sidebarTitle: { fontSize: '12px', fontWeight: '600', color: '#718096', textTransform: 'uppercase', letterSpacing: '1px' },
  qGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' },
  qDot: { width: '32px', height: '32px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '500', fontFamily: "'DM Sans', sans-serif' " },
  legend: { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#718096' },
  dot: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', marginRight: '5px' },
  submitBtn2: { padding: '11px 16px', border: 'none', borderRadius: '10px', background: '#10b981', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: "'DM Sans', sans-serif", width: '100%' },
}

const reviewStyles = {
  shell: { maxWidth: '800px', margin: '0 auto' },
  scoreCard: { background: '#fff', borderRadius: '20px', padding: '40px', textAlign: 'center', border: '1px solid #e2e8f0', marginBottom: '32px' },
  scoreEmoji: { fontSize: '56px', marginBottom: '8px' },
  scoreTitle: { fontSize: '24px', fontWeight: '600', color: '#1a202c', marginBottom: '20px' },
  scoreCircle: { width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#fff' },
  scoreNum: { fontSize: '32px', fontWeight: '700' },
  scoreLabel: { fontSize: '12px', opacity: 0.8 },
  scoreSub: { color: '#718096', marginBottom: '20px' },
  scoreGrid: { display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' },
  gradeRow: { display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', margin: '16px 0' },
  gradeBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '14px 20px', borderRadius: '12px', minWidth: '100px' },
  gradeNum: { fontSize: '26px', fontWeight: '700' },
  gradeLabel: { fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8 },
  scoreItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '16px 24px', borderRadius: '12px', minWidth: '100px' },
  reviewTitle: { fontSize: '20px', fontWeight: '600', color: '#1a202c', marginBottom: '16px' },
  qList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  qItem: { background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' },
  qHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
  qNum2: { fontSize: '12px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' },
  qText2: { fontSize: '16px', color: '#1a202c', fontWeight: '500', marginBottom: '14px' },
  optList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  optRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: '1px solid', fontSize: '14px' },
  optLbl: { width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 },
  doneBtn: { background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px 32px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
}
