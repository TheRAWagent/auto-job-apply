# Auto Job Apply Architecture

Popup UI
│
├── Resume PDF
├── Resume Markdown
├── Settings
│
↓
Background Service Worker
│
├── LLM Provider
├── Storage
├── Prompt Templates
└── Cache
│
↓
Content Script
│
├── Detect form fields
├── Extract labels/questions
├── Autofill straightforward fields
└── Ask background for complex answers

