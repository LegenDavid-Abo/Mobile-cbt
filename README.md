# 🎓 SchoolCBT Portal

A complete Computer-Based Testing (CBT) platform with three role-based dashboards, real-time exam timers, CSV/Excel user uploads, and Supabase backend.

---

## 🚀 Quick Setup (5 Steps)

### Step 1 — Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up / log in
2. Click **"New project"** and fill in your project details
3. Wait for the project to finish provisioning (~2 minutes)

### Step 2 — Run the Database Schema

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Open the file `supabase_schema.sql` from this project
3. Paste the entire contents into the SQL editor
4. Click **"Run"** (or press `Ctrl+Enter`)

This creates all tables, indexes, RLS policies, and a default Senior Admin account.

### Step 3 — Get Your Supabase Credentials

1. In Supabase dashboard, go to **Settings → API**
2. Copy your **Project URL** (e.g. `https://abcxyz.supabase.co`)
3. Copy your **anon/public key** (starts with `eyJhbGci...`)

### Step 4 — Configure Environment Variables

```bash
# In the project folder, copy the example file:
cp .env.example .env

# Open .env and fill in your credentials:
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 5 — Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Default Login Credentials

After running the schema, log in with:

| Field       | Value        |
|-------------|--------------|
| Student ID  | `SADMIN001`  |
| Password    | `password`   |
| Role        | Senior Admin |

**Change this password immediately after first login** (edit via the Manage Users page).

---

## 👤 User Roles

| Role | Permissions |
|------|-------------|
| **Student** | View class-filtered courses, take exams, see results |
| **Admin** | Manage courses/questions, view all students & results |
| **Senior Admin** | Everything + upload users (CSV/Excel), edit/delete/suspend any user |

---

## 📁 CSV/Excel Upload Format

Upload users via the "Upload Users" page (Senior Admin only).

**Required columns:**
- `student_id` — Unique ID (e.g. JSS1001, SS2045)
- `name` — Full name
- `password` — Plain text password (auto-hashed on upload)

**Optional columns:**
- `role` — `student` / `admin` / `senior_admin` (defaults to `student`)
- `class` — `JSS1` / `JSS2` / `JSS3` / `SS1` / `SS2` / `SS3` (auto-detected from ID if not provided)
- `email` — Email address

**Auto class detection from Student ID:**
- ID contains `JSS1` → Class = JSS1
- ID contains `SS2` (not JSS) → Class = SS2
- etc.

Download the template from the Upload page to get started.

---

## 🧪 How Exams Work

1. Admin/Senior Admin creates a **Course** with duration and optional exam date/time
2. Admin adds **Questions** (4 options, mark correct answer)
3. Students in the matching class see the course at the scheduled time
4. Student confirms start → timer begins
5. Answers are saved automatically; skipped questions show red, answered show green
6. Selecting an answer auto-advances to next question
7. When time runs out → auto-submit
8. After submission → full review with correct answers shown
9. Student sees score and pass/fail

---

## 🏗️ Project Structure

```
src/
├── lib/
│   └── supabase.js         # Supabase client
├── hooks/
│   └── useAuth.jsx         # Auth context + login/logout
├── components/
│   └── Layout.jsx          # Sidebar + top bar shell
├── pages/
│   ├── LoginPage.jsx       # Login page
│   ├── StudentPages.jsx    # Student home, courses, exam, results
│   ├── AdminPages.jsx      # Admin home, courses, questions, students
│   └── SeniorAdminPages.jsx # Senior admin home, upload, manage users
└── App.jsx                 # Router
```

---

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **Database**: Supabase (PostgreSQL)
- **Auth**: Custom (student ID + bcrypt password, stored in `users` table)
- **File Parsing**: PapaParse (CSV) + SheetJS/xlsx (Excel)
- **Password Hashing**: bcryptjs
- **Notifications**: react-hot-toast

---

## 🚢 Deploying to Production

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
# Follow prompts, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY as environment variables
```

### Netlify
```bash
npm run build
# Upload the `dist` folder to Netlify
# Add environment variables in Netlify dashboard → Site settings → Environment variables
```

---

## 🔒 Security Notes

- Passwords are hashed with bcrypt (10 rounds) on upload
- The plain_password field is stored for admin reference only — consider removing in production
- RLS policies allow all operations via the anon key (simplified for this setup)
- For production, tighten RLS policies to only allow users to read their own data

---

## 📞 Support

Contact your Senior Administrator for login credentials or account issues.
