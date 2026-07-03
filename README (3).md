# MockAdda v2 – Testbook-style Quiz Platform

Free mock test platform for SSC, Banking, Railways, Teaching & Civil Services exams.

## ✏️ How to add questions

Open `questions.json`. Find the exam you want, then add inside its `questions` array:

```json
{ "q": "Your question?", "opts": ["Option A", "Option B", "Option C", "Option D"], "ans": 0 }
```

`ans` = correct answer index: **0=A, 1=B, 2=C, 3=D**

## ➕ How to add a new exam

Inside any category (e.g. `ssc`), add to the `exams` object:

```json
"ssc_gd": {
  "name": "SSC GD",
  "fullname": "Staff Selection Commission General Duty Constable",
  "tests": [
    {
      "id": "ssc_gd_1",
      "title": "SSC GD Mock Test 1",
      "duration": 10,
      "difficulty": "Easy",
      "questions": [
        { "q": "Question?", "opts": ["A","B","C","D"], "ans": 0 }
      ]
    }
  ]
}
```

## ➕ How to add a new category

```json
"state_exams": {
  "name": "State Exams",
  "icon": "🗺️",
  "color": "#f43f5e",
  "exams": { ... }
}
```

## 📁 Project structure

```
mockadda/
├── index.html       ← app shell
├── app.js           ← all UI logic
├── questions.json   ← ALL questions & exams here ✏️
├── netlify.toml     ← deploy config
└── README.md
```
