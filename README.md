# TT-Showcase - Student Portal

A Next.js student portal application for TecTerminal, providing students with access to courses, payments, attendance, and academic progress.

## Features

- 🔐 **Authentication** - JWT-based authentication with secure token management
- 📊 **Dashboard** - Overview of courses, payments, attendance, and notifications
- 👤 **Profile Management** - View and update student information
- 📚 **Courses** - Enrolled courses with batch details
- 💳 **Payments** - Payment history with invoice viewing
- 📅 **Attendance** - Attendance records with filtering
- 🔔 **Notifications** - Real-time notifications
- 🎫 **Support Tickets** - Ticket management system
- 📈 **Academic Progress** - Performance tracking and statistics

## Tech Stack

- **Framework:** Next.js 16.1.1 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **State Management:** TanStack Query (React Query)
- **Forms:** React Hook Form + Yup
- **HTTP Client:** Axios

## Prerequisites

- Node.js 18+
- npm or yarn
- Access to TecTerminal backend API

## Quick Start

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd tt-showcase
   npm install
   ```

2. **Configure environment:**
   Create `.env.local` in the project root:
   ```env
   API_BASE_URL=https://your-api-domain.com
   NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.com
   NODE_ENV=development
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
tt-showcase/
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── api/         # API proxy routes
│   │   ├── auth/        # Authentication pages
│   │   ├── dashboard/   # Dashboard page
│   │   └── ...          # Other feature pages
│   ├── components/      # React components
│   ├── lib/            # Utilities & API clients
│   ├── providers/      # React providers
│   └── types/          # TypeScript definitions
├── public/             # Static assets
└── docs/              # Documentation
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `API_BASE_URL` | Backend API base URL | Yes |
| `NEXT_PUBLIC_API_BASE_URL` | Public API base URL | Yes |
| `NODE_ENV` | Environment (development/production) | Yes |

## Authentication

The application uses JWT tokens stored in httpOnly cookies. All API requests are proxied through Next.js API routes for security.

## Available Routes

### Public
- `/` - Home (redirects to login/dashboard)
- `/login` - Student login
- `/forgot-password` - Password recovery
- `/reset-password` - Password reset

### Protected
- `/dashboard` - Student dashboard
- `/profile` - Profile management
- `/courses` - Enrolled courses
- `/payments` - Payment history
- `/attendance` - Attendance records
- `/batches` - Batch schedules
- `/notifications` - Notifications
- `/tickets` - Support tickets
- `/academic-progress` - Academic progress

## Documentation

Detailed documentation is available in the `docs/` directory:
- API integration guides
- Implementation summaries
- Route documentation

## License

[Your License Here]
