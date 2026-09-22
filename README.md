# English Proficiency Diagnostic Assessment

A full-stack diagnostic web application that assesses candidates across all 4 core English language skills: **Listening**, **Reading**, **Writing**, and **Speaking**. 

The application evaluates candidates against standard IELTS band criteria, providing both section-by-section breakdown scores and detailed diagnostic feedback on grammar, vocabulary, pronunciation, and fluency.

---

## Features & Assessment Flow

The candidate journey follows a focused, 10-step sequence designed to simulate realistic test conditions:

1. **Welcome & Target Setting**: The candidate selects their target band score (5.0 to 9.0 in 0.5 increments) and reviews the structure of the 4 sections.
2. **Listening**: Candidate listens to an audio dialogue (university study suite booking) and answers 4 comprehension questions.
3. **Transition Pause**: Brief pause between sections explaining what comes next.
4. **Reading**: Candidate reads an academic text and answers 4 analytical comprehension questions.
5. **Authentication Gate**: Before proceeding to AI-evaluated modules, the candidate signs in with Google. This secures submissions and associates the resulting report with their identity.
6. **Writing**: Candidate completes an essay prompt with real-time word and character counters.
7. **Transition Pause**: Second brief pause before the speaking section.
8. **Speaking**: Candidate records spoken responses to two prompt questions using their microphone. Includes audio preview players to review or re-record each answer independently before submitting.
9. **Preparing**: Progress indicator while the backend processes speech transcription and AI evaluation in parallel.
10. **Results**: A single comprehensive report showing:
    - Overall band score and comparison to user's target.
    - Individual scores for Listening, Reading, Writing, and Speaking.
    - Writing evaluation breakdown (Task Response, Cohesion, Lexical Resource, Grammatical Accuracy) with line-by-line grammar mistakes and suggested corrections.
    - Speaking evaluation breakdown (Fluency, Pronunciation, Vocabulary, Grammar) with verbatim Whisper transcripts and highlighted phrases.
    - "What to Practise First" diagnostic highlighting the candidate's weakest area with actionable recommendations.

---

## Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript (Vite)
- **Styling**: Tailwind CSS with custom dark / light theme support
- **State & Transitions**: React Hooks, Framer Motion
- **Audio Capture**: Web Audio API (MediaRecorder) producing standard WebM audio blobs
- **Audio Preview**: HTML5 Audio with 60 FPS animation-frame scrubbing and time display
- **Authentication**: `@react-oauth/google` (Google Identity Services)

### Backend
- **Language**: Go 1.22+
- **HTTP Routing**: `go-chi/chi` with CORS, compression, and request logging
- **Database**: SQLite with WAL (Write-Ahead Logging) via `modernc.org/sqlite` (pure Go, no CGO dependency)
- **Speech-to-Text**: Groq Whisper (`whisper-large-v3-turbo`) for fast audio transcription
- **Rubric Evaluation**: LLM evaluation (Groq `llama-3.3-70b-versatile` with Google Gemini fallback) structured with JSON schema validation
- **Auth Verification**: Google token verification and stateless JWT session signing

---

## Project Structure

```text
├── backend/
│   ├── ai/            # Groq & Gemini transcription and scoring services
│   ├── config/        # Environment and application configuration
│   ├── db/            # SQLite schema initialization and migrations
│   ├── handlers/      # HTTP handlers (auth, test content, submission)
│   ├── middleware/    # JWT auth guard, CORS, logger
│   ├── models/        # Data models and evaluation structs
│   ├── scorer/        # Deterministic scoring for Listening and Reading
│   ├── Dockerfile     # Alpine-based production container
│   ├── main.go        # Server entry point
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/  # Audio players, recorders, theme switcher
│   │   ├── views/       # Section views (Welcome, Listening, Reading, etc.)
│   │   ├── services/    # Backend API client
│   │   ├── types.ts     # TypeScript interfaces and types
│   │   ├── App.tsx      # Main application state machine
│   │   └── main.tsx
│   ├── package.json
│   └── .env.example
└── README.md
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+) or [Bun](https://bun.sh/)
- [Go](https://go.dev/) (v1.22+)

### 1. Environment Configuration

#### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env`:

```env
PORT=8080
ENV=development
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...
JWT_SECRET=your_secret_key_here
DATABASE_PATH=./data/english_test.db
CORS_ORIGIN=http://localhost:5173
```

> **Note**: Both `GROQ_API_KEY` and `GEMINI_API_KEY` can be configured. Groq is used as the primary engine for Whisper transcription and rubric grading, with Gemini available as a fallback.

#### Frontend (`frontend/.env`)
Copy `frontend/.env.example` to `frontend/.env`:

```env
VITE_API_URL=http://localhost:8080
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

---

### 2. Running Locally

#### Option A: Running from the repository root
```bash
# Install dependencies
bun install   # or npm install

# Start both backend and frontend concurrently
bun run dev   # or npm run dev
```

#### Option B: Running services separately

**Backend:**
```bash
cd backend
go run main.go
# Server runs at http://localhost:8080
```

**Frontend:**
```bash
cd frontend
bun install   # or npm install
bun run dev   # or npm run dev
# App opens at http://localhost:5173
```

---

## Production Deployment

### Docker (EC2 / VPS)
The backend includes a lightweight `Dockerfile` based on Alpine Linux.

1. Build the Linux binary (cross-compile for your server architecture, e.g. ARM64 or AMD64):
   ```bash
   # For ARM64 (e.g. AWS Graviton):
   CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags="-w -s" -o server .

   # For AMD64 (e.g. standard x86):
   CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o server .
   ```

2. Build and run the Docker container:
   ```bash
   docker build -t matalabs-backend .
   docker run -d --name matalabs-backend \
     -p 8085:8080 \
     --env-file .env \
     -v $(pwd)/data:/app/data \
     matalabs-backend
   ```

### Frontend (Netlify / Vercel / CloudFront)
1. Build the production bundle:
   ```bash
   cd frontend
   bun run build   # or npm run build
   ```
2. Deploy the generated `dist/` directory.
3. Configure `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID` in your hosting dashboard's environment settings.

---

## API Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status check | No |
| `GET` | `/api/test/content` | Retrieves diagnostic test questions and passage | No |
| `POST` | `/api/auth/google` | Verifies Google ID token and returns session JWT | No |
| `POST` | `/api/test/submit` | Evaluates full test (writing + speaking) and persists result | Yes (Bearer JWT) |
| `GET` | `/api/test/results/:id` | Fetches saved diagnostic test result by ID | Yes (Bearer JWT) |

---

## Evaluation & Scoring Methodology

- **Listening & Reading**: Scored deterministically against answer keys and mapped to the standard IELTS 0–9 band scale.
- **Writing**: Analyzed across four official IELTS assessment criteria:
  - Task Response
  - Coherence & Cohesion
  - Lexical Resource
  - Grammatical Range & Accuracy
- **Speaking**: Transcribed via Whisper, then analyzed for:
  - Fluency & Coherence
  - Lexical Variety
  - Grammatical Accuracy
  - Pronunciation Clarity
- **Error Handling**: If an audio recording is empty or corrupt, the system flags the issue clearly with diagnostic notes rather than returning an uncalibrated default score.
