# JobReadiness Portal

This is a technical AI/ML project built as part of a NAVTTC AI/ML course at Netsol Institute. The goal was to create a professional placement readiness portal that analyzes student profiles using machine learning and delivers a polished multi-page web experience.

## Project Summary

I developed a "JobReadiness Portal" that:
- collects student profile inputs like CGPA, projects, internships, skills, DSA practice, segment, and region
- cleans and preprocesses dataset values for stable model training
- trains backend machine learning models using Python and scikit-learn
- exposes a prediction API via Flask
- connects a modern Next.js frontend with a separate result page for better UX

This project helped me learn real AI/ML workflow, solve data issues, and build a working full-stack product.

## What I Learned

- AI/ML pipeline from preprocessing to deployment
- handling missing dataset values and model training stability
- building an API backend with Flask
- creating a clean multi-page frontend using Next.js and TypeScript
- designing a professional candidate readiness experience

## Challenges and Solutions

- Challenge: missing and inconsistent dataset values produced training issues
- Solution: imputed numeric values with median, categorical values with mode, and cleaned the training data

- Challenge: UI dropdown and form clarity in the analysis flow
- Solution: enhanced dropdown visibility and split the app into two pages (`Home` and `Result`)

- Challenge: preserving prediction state while navigating between pages
- Solution: stored prediction results in session storage and routed users to a dedicated result page

## Tech Stack

- Python
- Flask
- pandas
- scikit-learn
- Next.js
- TypeScript
- CSS Modules

## How to Run

1. Start the Flask backend:
   ```powershell
   python app.py
   ```

2. Start the Next.js frontend from the `frontend` folder:
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

3. Open the frontend in your browser at:
   ```text
   http://localhost:3000
   ```

## Project Context

This is a technical session project for NAVTTC AI/ML course, completed as part of the curriculum at Netsol Institute.

Special thanks to my mentor, Sir Awais, for guidance and support throughout this project.

## Notes

- The backend model is designed to predict readiness based on student profile values.
- The frontend is built as an interactive portal with a dedicated result page.
- The user flow is optimized for professional candidate readiness analysis.
