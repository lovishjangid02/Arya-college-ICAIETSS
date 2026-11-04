# ICETIS-2026 — International Conference on Emerging Technologies and Innovative Solutions

Official website for the **1st International Conference on Emerging Technologies and Innovative Solutions (ICETIS-2026)** organized by **Arya College of Engineering & Technology (AIET)**, Jaipur, Rajasthan, India.

📅 **Dates:** December 18–19, 2026  
📍 **Venue:** Arya Institute of Engineering & Technology (AIET), SP-40, RIICO Industrial Area, Kukas, Jaipur, Rajasthan 302028  
🏆 **Indexing:** Technically sponsored & proceedings submitted to Scopus, Web of Science, and Springer CCIS.

---

## ✨ Features & Architecture

- **Immersive Lumen Roof Day/Night Atmosphere:**
  - Full-screen cinematic hero featuring the authentic Arya College of Engineering campus entrance.
  - Live procedural **WebGL2 Fog Fragment Shader** with dynamic 5-octave `fbm` value noise and domain warping.
  - Sinking and rising physics transition clock (`requestAnimationFrame`).
  - Dual-segmented glassmorphism Day/Night toggle with active highlight indicators.
  - Full `localStorage` persistence with Day Mode default for first-time visitors (zero FOUC).
- **Golden & White Luxury Design System:**
  - Primary Gold (`#D4AF37`), Champagne Gold (`#E6C875`), and Soft Gold (`#F3E5AB`) paired with Warm White (`#FFFDF5`), Pure White (`#FFFFFF`), and Deep Navy (`#111827`).
  - High-contrast, elegant typography using Google's *Instrument Sans*.
- **Comprehensive Conference Sections:**
  - **About:** Overview of ICETIS-2026 and Arya College of Engineering & Technology profile.
  - **Technical Tracks:** 6 tracks covering AI/ML, Cyber-Physical IoT, Cloud/Quantum Security, Big Data Healthcare, Green Smart Grids, and 5G/6G VLSI.
  - **Important Dates & Countdown:** Interactive live timer counting down to December 18, 2026.
  - **Call for Papers & Guidelines:** IEEE/Springer author guidelines, plagiarism thresholds, and template download triggers.
  - **Registration Details:** Dynamic INR (₹) / USD ($) currency switcher with tier pricing tables and bank NEFT/RTGS details.
  - **Publication & Indexing:** Scopus, Web of Science, Springer CCIS series, and SCI Q1/Q2 partner journals.
  - **Keynote Speakers & Committee:** Leadership hierarchy and distinguished speaker cards.
  - **Venue & Jaipur Heritage:** Campus location connectivity (NH-48, Airport, Railway) and Pink City tourist landmarks.
  - **Contact & Helpdesk:** Direct coordinates and interactive message inquiry form.
- **Interactive Modals:**
  - "Register Now" modal with full form validation.
  - "Submit Your Paper" modal with manuscript dropzone and track selection.
  - Toast notification system for instant user feedback.
  - Off-canvas responsive drawer navigation for mobile devices ($\le 820\text{px}$).

---

## 🚀 How to Run Locally

### Option 1: Native PowerShell Server
Run the included PowerShell server script:
```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 8080
```
Then open [http://localhost:8080/](http://localhost:8080/) in your browser.

### Option 2: Any Static Web Server
You can open `index.html` directly in any modern web browser or use any static server:
```bash
# Python
python -m http.server 8080

# Node / npx
npx serve .
```

---

## 📁 Repository Structure

```
├── index.html                           # Semantic HTML5 conference structure & modals
├── css/
│   └── style.css                        # Golden & White theme, Day/Night engine & responsive CSS
├── js/
│   └── main.js                          # WebGL2 fog shader, Lumen Roof physics & UI controllers
├── assets/
│   └── images/
│       └── arya-campus.jpg              # Arya College of Engineering main campus photograph
├── serve.ps1                            # Lightweight local development server
└── README.md                            # Project documentation
```

---

## 📜 License
Copyright © 2026 Arya College of Engineering & Technology, Jaipur. All rights reserved.

