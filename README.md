# MockAdda

Free online mock test platform — [mockadda.com](https://mockadda.com)

## ✏️ How to add questions (the ONLY file you need to edit)

Open `questions.json` on GitHub. Each question looks like this:

```json
{ "q": "What is 8 × 7?", "opts": ["54", "56", "58", "64"], "ans": 1 }
```

- `q` → question text
- `opts` → exactly 4 answer choices (A, B, C, D)
- `ans` → correct answer index: **0=A, 1=B, 2=C, 3=D**

Add a new line, save (commit), and the site updates live within 60 seconds. That's it!

## ➕ How to add a new test

Inside any subject, add a new block to the `tests` array:

```json
{
  "id": "math3",
  "title": "Number Systems",
  "duration": 10,
  "difficulty": "Easy",
  "questions": [
    { "q": "Your question?", "opts": ["A", "B", "C", "D"], "ans": 0 }
  ]
}
```

## ➕ How to add a new subject

Add a new key in `questions.json` alongside `gk`, `math`, `science`, `english`:

```json
"reasoning": {
  "name": "Reasoning",
  "icon": "🧩",
  "color": "#f43f5e",
  "tests": [...]
}
```

## 📁 Project structure

```
mockadda/
├── index.html       ← app shell (don't touch)
├── app.js           ← quiz logic (don't touch)
├── questions.json   ← ADD ALL QUESTIONS HERE ✏️
├── netlify.toml     ← deploy config (don't touch)
└── README.md
```

## 🚀 Deployment

GitHub → Netlify auto-deploy. Every push to `main` goes live in ~60 seconds.
