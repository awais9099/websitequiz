# Learn Italian with Iqra — Project Summary

## Overview
A website for "Learn Italian with Iqra" — an Italian language teaching platform with landing page, quiz tool, video library, student management with Firebase authentication, group-based course management, and patente True/False quiz system.

## Tech Stack
- **Frontend:** Vanilla HTML/CSS/JS (no frameworks)
- **Design:** Mobile-first responsive (95% users on phones)
- **Backend:** Firebase (Auth + Firestore)
- **Video Hosting:** Bunny.net (`player.mediadelivery.net/embed/`)
- **PDF Generation:** jsPDF
- **Translation:** Google Translate API (free)
- **Text-to-Speech:** Web Speech API

## Pages

| Page | File | Description |
|------|------|-------------|
| Landing | `index.html` | Hero, courses, contact, why us, testimonials, ticker bar |
| Login | `login.html` | Student login/register with Firebase auth |
| Videos | `videos.html` | Auth-gated video library with multi-course tabs |
| Quiz | `quiz.html` | Teacher-operated quiz tool with PDF reports |
| Manage | `manage.html` | Admin panel (Students/Groups/Questions/Patente) |
| Patente Quiz | `patente-quiz.html` | Self-service True/False exam simulator |

## Features Implemented

### Authentication & Students
- Firebase email/password auth
- Student self-registration to link profiles
- Teacher creates profiles (students activate by registering)
- Multi-course enrollment (`groupIds` array)
- Role-based access (teacher/student)

### Groups & Videos
- Groups organized by level (A2, B1, Patente)
- Sections (weeks) within groups
- Videos stored in Firestore for multi-user access
- Teacher can view as student (debug panel)

### Quiz System
- **Teacher Quiz:** Random questions, mark correct/wrong, PDF report, WhatsApp share
- **Patente Quiz:** Official exam format (30 questions, 20-min timer, VERO/FALSO)
- Question management with add/edit/delete/filter

### Patente Quiz Features
- DOCX import (paste text, parse DOMANDE VERE/FALSE)
- Firestore storage for quiz questions
- Tab navigation (1-10, 11-20, 21-30)
- Timer with warning at 2 minutes
- Pass/fail: max 3 errors allowed
- Grid shows answered/unanswered/wrong status
- **Translation:** English & Urdu via Google Translate API
- **Read Aloud:** Italian TTS + translation TTS
- **Corregi:** Submit with 1+ answer, confirmation if unattempted
- **Unattempted = Wrong:** Marked as wrong in scoring and grid

### Patente Tricks
- Searchable tricks section (Firestore)
- Pagination (15 per page)
- Only visible to students in patente groups

### UI/UX
- Floating WhatsApp button
- Scrolling ticker bar
- Responsive tables with scroll wrappers
- Touch targets (44px min) for mobile
- Debug banner for teacher view-as mode

## Firebase Structure

### Collections
- `students` — name, email, phone, role, level, groupIds[], isActive, isPending
- `groups` — name, level, createdAt
- `sections` — groupId, title, order, createdAt
- `videos` — sectionId, groupId, title, topics, description, url, thumbnail, notesUrl, order
- `patenteTricks` — word, description, imageUrl
- `patenteQuizzes` — title, blockNumber, questions[{text, answer, order}]

## Key Files

| File | Purpose |
|------|---------|
| `js/firebase-config.js` | Firebase project configuration |
| `js/auth.js` | Firebase helpers, CRUD operations |
| `js/quiz.js` | Teacher quiz engine |
| `js/manage.js` | Admin panel logic |
| `js/videos.js` | Video library, pagination, tabs |
| `js/patente-quiz.js` | Self-service quiz engine |
| `js/docx-parser.js` | DOCX text parser |
| `js/pdf-report.js` | jsPDF report generation |
| `css/style.css` | All styles, responsive breakpoints |

## Social Links
- WhatsApp: +39 351 708 0455
- TikTok: @impara.italiano
- YouTube: @LearnItalianwithme-iy6ir

## GitHub
- Repo: `https://github.com/awais9099/websitequiz.git`
- Pages: `https://awais9099.github.io/websitequiz/`
