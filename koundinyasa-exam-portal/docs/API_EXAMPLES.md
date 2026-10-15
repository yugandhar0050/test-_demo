# API quick examples

All protected endpoints use `Authorization: Bearer <token>`.

Register: `POST /api/auth/register` with `firstName`, `lastName`, `studentId`, `phone`, `email`, `password`, and `confirmPassword`.

Login: `POST /api/auth/login` with `{ "id": "294001", "password": "..." }`.

Create exam (admin): `POST /api/admin/exams` with `title`, `startsAt`, `endsAt`, `durationMinutes`, `totalMarks`, `passingMarks`, and optional `status`.

Add MCQ (admin): `POST /api/admin/exams/:id/questions` with `questionText`, `questionType`, `options`, `correctAnswer`, `marks`, `negativeMarks`, and `displayOrder`.
