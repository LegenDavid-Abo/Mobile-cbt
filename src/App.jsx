import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import {
  StudentHome, StudentCourses, StudentResults,
  ExamConfirmModal, ExamPage, ResultsReview
} from './pages/StudentPages'
import {
  AdminHome, CoursesAdmin, QuestionsAdmin,
  StudentsAdmin, ResultsAdmin
} from './pages/AdminPages'
import {
  SeniorAdminHome, UploadUsers, ManageUsers
} from './pages/SeniorAdminPages'

// Admin also gets CoursesAdmin, QuestionsAdmin, StudentsAdmin, ResultsAdmin

export default function App() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState('home')
  const [examCourse, setExamCourse] = useState(null)
  const [examConfirm, setExamConfirm] = useState(null)
  const [examResult, setExamResult] = useState(null)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", color: '#718096' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <div>Loading portal...</div>
        </div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  // Exam flow takes over full screen (within layout)
  const renderContent = () => {
    // Exam in progress
    if (examCourse) {
      return <ExamPage course={examCourse} onComplete={(result) => { setExamCourse(null); setExamResult(result) }} />
    }

    // Exam results review
    if (examResult) {
      return <ResultsReview result={examResult} onDone={() => { setExamResult(null); setPage('courses') }} />
    }

    // Student pages
    if (user.role === 'student') {
      switch (page) {
        case 'home': return <StudentHome setPage={setPage} />
        case 'courses': return (
          <>
            <StudentCourses onStartExam={(course) => setExamConfirm(course)} />
            {examConfirm && (
              <ExamConfirmModal
                course={examConfirm}
                onConfirm={() => { setExamCourse(examConfirm); setExamConfirm(null) }}
                onCancel={() => setExamConfirm(null)}
              />
            )}
          </>
        )
        case 'results': return <StudentResults />
        default: return <StudentHome setPage={setPage} />
      }
    }

    // Admin pages
    if (user.role === 'admin') {
      switch (page) {
        case 'home': return <AdminHome />
        case 'courses': return <CoursesAdmin />
        case 'questions': return <QuestionsAdmin />
        case 'students': return <StudentsAdmin />
        case 'results': return <ResultsAdmin />
        default: return <AdminHome />
      }
    }

    // Senior Admin pages
    if (user.role === 'senior_admin') {
      switch (page) {
        case 'home': return <SeniorAdminHome />
        case 'users': return <ManageUsers />
        case 'upload': return <UploadUsers />
        case 'courses': return <CoursesAdmin />
        case 'questions': return <QuestionsAdmin />
        case 'results': return <ResultsAdmin />
        default: return <SeniorAdminHome />
      }
    }

    return <div>Unknown role</div>
  }

  // Override page title during exam
  const effectivePage = examCourse ? 'exam' : examResult ? 'review' : page

  return (
    <Layout page={page} setPage={(p) => { setPage(p); setExamCourse(null); setExamResult(null); setExamConfirm(null) }}>
      {renderContent()}
    </Layout>
  )
}
