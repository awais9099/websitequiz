# Learn Italian with Iqra - Project Summary

## Overview
Italian language teaching platform with landing page, quiz tool, video library, student management with Firebase, patente quiz system, and course card management.

## Tech Stack
- **Frontend**: Vanilla HTML/CSS/JS (no frameworks)
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Videos**: Bunny.net CDN
- **Hosting**: GitHub Pages
- **Domain**: `awais9099.github.io/websitequiz/`

## Firebase Project
- **Name**: `learn-italian-iqra`
- **Project ID**: `learn-italian-iqra`
- **Free tier**: €0/month
- **Collections**: `students`, `groups`, `sections`, `videos`, `patenteTricks`, `patenteQuizzes`, `patenteQuizzesTest`, `courseCards`, `quizHistory`

---

## Pages

| Page | File | Description |
|------|------|-------------|
| Landing | `index.html` | Hero, ticker bar, course cards, testimonials, floating WhatsApp |
| Login | `login.html` | Firebase auth, registration, forgot/change password, pending profile linking |
| Videos | `videos.html` | Auth-gated, multi-course tabs, patente tricks, TTS |
| Quiz Tool | `quiz.html` | Teacher enters name+phone, picks level, random questions, PDF report |
| Patente Quiz | `patente-quiz.html` | True/False exam simulator, 30 questions, 20-min timer |
| Manage | `manage.html` | Admin panel for students/groups/questions/history/settings |

---

## Features Implemented

### Landing Page
- Scrolling ticker bar with announcements
- Hero section with stats
- Course cards (A2, B1, Patente)
- Upcoming courses flash banner (top)
- Testimonials section
- Floating WhatsApp button
- Responsive mobile-first design

### Authentication
- Firebase Auth (email/password)
- Student registration with pending profile linking
- Password reset via email
- Change password functionality
- Role-based access (student/teacher)

### Navbar Visibility
| Link | Not Logged In | Logged In | Patente Student | Teacher |
|------|--------------|-----------|-----------------|---------|
| Courses | ✓ | ✓ | ✓ | ✓ |
| Why Us | ✓ | ✓ | ✓ | ✓ |
| Contact | ✓ | ✓ | ✓ | ✓ |
| Videos | ✓ | ✓ | ✓ | ✓ |
| Quiz Tool | ✗ | ✓ | ✓ | ✓ |
| Patente Quiz | ✗ | ✗ | ✓ | ✓ |
| Manage | ✓ | ✓ | ✓ | ✓ |

### Student Management
- Add/Edit/Delete students
- Course assignment (A2, B1, Patente)
- Multi-course enrollment via `groupIds` array
- Student filters by course type
- Course expiry date with automatic access blocking
- Deactivate/Activate students
- View as student (teacher preview)
- Password reset for students

### Group Management
- CRUD for groups
- Sections → Videos hierarchy
- Group archiving (archive/unarchive)
- Show/hide archived groups filter
- Deactivate whole group (bulk)
- Visual indicators (greyed out for archived, orange border for inactive)

### Video Library
- Auth-gated content
- Multi-course tabs for students
- Patente tricks tab
- Video player overlay
- Notes PDF links
- Teacher view-as banner

### Quiz Tool
- Teacher enters student name+phone
- Random question selection
- 30 questions per quiz
- Score circle visualization
- PDF report generation (jsPDF)
- WhatsApp share

### Question Management
- Add/Edit/Delete questions
- Filter by level (A2/B1)
- 30 sample questions included
- Question text, options, correct answer

### Patente Quiz
- Purple theme
- 30 random questions from `patenteQuizzesTest` collection
- 20-minute timer
- True/False (VERO/FALSO) answers
- Tab navigation (10 questions per tab)
- Question grid with status colors
- Correggi button (enabled with 1+ answer)
- Confirmation dialog for unattempted questions
- Results overlay with score, pass/fail, review
- Fixed image area (200x200 desktop, 150px mobile)

### TTS (Text-to-Speech)
- Italian read aloud
- English translation read
- Urdu translation read
- Punjabi translation read
- Stop button (appears when audio playing)
- Auto-stops on answer/navigation
- Separate stop button (not same as Read)

### Translation
- English via Google Translate API
- Urdu via Google Translate API
- Punjabi via Google Translate API
- In-memory cache
- Read translation aloud button

### Course Expiry
- Date picker in student creation modal
- Stored in Firestore as `expiryDate`
- Expiry status in manage panel (green/orange/red)
- Access blocked when expired (red screen with WhatsApp contact)

### Course Cards (Upcoming Courses)
- Firebase Storage for image upload
- Image cards (just image, no overlay)
- Info cards (title, date, schedule, price)
- Active/Inactive toggle
- Flash banner at top of landing page
- WhatsApp enrollment link

### Open Source Patente Questions
- 7,139 questions from GitHub `Ed0ardo/QuizPatenteB` (MIT license)
- 25 official Italian patente topics
- Saved to `patenteQuizzesTest` collection
- Imported via manage panel
- 30 random questions per quiz attempt

---

## Firestore Collections

### students
```json
{
  "uid": "string",
  "name": "string",
  "email": "string",
  "phone": "string",
  "role": "student|teacher",
  "level": "A2|B1|patente",
  "groupIds": ["groupId1", "groupId2"],
  "isActive": true,
  "expiryDate": "2026-09-01",
  "isPending": false,
  "createdAt": "2026-01-01T00:00:00"
}
```

### groups
```json
{
  "name": "string",
  "level": "A2|B1|patente",
  "isArchived": false,
  "createdAt": "2026-01-01T00:00:00"
}
```

### sections
```json
{
  "groupId": "string",
  "title": "string",
  "order": 1,
  "createdAt": "2026-01-01T00:00:00"
}
```

### videos
```json
{
  "sectionId": "string",
  "title": "string",
  "url": "string (Bunny.net embed)",
  "thumbnail": "string (optional)",
  "topics": "string (optional)",
  "notesUrl": "string (optional)",
  "description": "string (optional)",
  "order": 1,
  "createdAt": "2026-01-01T00:00:00"
}
```

### patenteTricks
```json
{
  "title": "string",
  "description": "string",
  "imageUrl": "string (optional)",
  "createdAt": "2026-01-01T00:00:00"
}
```

### patenteQuizzes
```json
{
  "title": "string",
  "blockNumber": 1,
  "questions": [
    {"text": "string", "answer": true, "image": "string (optional)"}
  ],
  "totalQuestions": 30,
  "createdAt": "2026-01-01T00:00:00"
}
```

### patenteQuizzesTest
```json
{
  "title": "string",
  "blockNumber": 1,
  "questions": [
    {"text": "string", "answer": true, "image": "string (optional)"}
  ],
  "totalQuestions": 30,
  "source": "github",
  "createdAt": "2026-01-01T00:00:00"
}
```

### courseCards
```json
{
  "title": "string",
  "description": "string (optional)",
  "startDate": "2026-01-15",
  "schedule": "string (optional)",
  "price": "string (optional)",
  "imageUrl": "string (optional, Firebase Storage URL)",
  "isActive": true,
  "createdAt": "2026-01-01T00:00:00"
}
```

---

## File Structure

```
websiteQuiz/
├── index.html              # Landing page
├── login.html              # Authentication
├── videos.html             # Video library
├── quiz.html               # Quiz tool
├── patente-quiz.html       # Patente True/False quiz
├── manage.html             # Admin panel
├── css/
│   └── style.css           # All styles
├── js/
│   ├── firebase-config.js  # Firebase config
│   ├── auth.js             # Firebase helpers, CRUD, Storage
│   ├── landing.js          # Landing page logic
│   ├── videos.js           # Video library logic
│   ├── quiz.js             # Quiz tool logic
│   ├── patente-quiz.js     # (not used, inline in HTML)
│   ├── manage.js           # Admin panel logic
│   ├── pdf-report.js       # PDF generation
│   └── questions.json.js   # Sample questions
└── images/
    └── iqra_logo.png       # Logo
```

---

## Pending / Future Features

### Quiz History (In Progress)
- Store quiz attempts in `quizHistory` collection
- Student view: My History section
- Teacher view: Student history in manage panel
- Data: score, errors, time taken, date, detailed answers

### Hybrid Hosting
- Static JSON for quiz data (faster load)
- Firestore for real-time data
- Better performance on slow connections

### ElevenLabs Voice Cloning
- Clone teacher's voice for TTS
- More natural Italian pronunciation
- Creator plan: $22/month or API ~$192 one-time

### Firebase Transfer
- Transfer project to Iqra's account
- She manages billing/support directly

---

## Known Limitations

1. **TTS on iOS**: Limited voice support, some languages may not work
2. **Firebase Auth**: Cannot delete accounts client-side (needs Admin SDK)
3. **Image Upload**: No compression before upload (could optimize)
4. **Offline**: No offline support (requires internet)

---

## Recent Changes

| Date | Change |
|------|--------|
| 2026-07-07 | Added course expiry date for students |
| 2026-07-07 | Replaced patente-quiz with clean purple theme version |
| 2026-07-07 | Navbar and ticker bar scroll with page |
| 2026-07-07 | Hide Patente Quiz from navbar unless patente student/teacher |
| 2026-07-07 | Hide Quiz Tool from navbar when not logged in |
| 2026-07-07 | Course cards feature with Firebase Storage upload |
| 2026-07-07 | Moved upcoming courses to top flash banner |
| 2026-07-07 | Fixed TTS stop button disappearing on re-click |

---

## Deployment

### GitHub Pages
- **URL**: `https://awais9099.github.io/websitequiz/`
- **Repo**: `https://github.com/awais9099/websitequiz.git`
- **Auto-deploy**: Push to main branch

### Firebase Console
- **Auth**: Enable Email/Password
- **Firestore**: Create database, set rules
- **Storage**: Enable for image uploads

---

## Teacher Contact
- **WhatsApp**: +39 351 708 0455
- **Platform**: Learn Italian with Iqra
