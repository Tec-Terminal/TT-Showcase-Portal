# TT-Showcase - Student Portal

A comprehensive Next.js student portal application integrated with the Tec Terminal backend API.

## Features

- 🔐 **Authentication** - Secure JWT-based authentication with token refresh
- 📊 **Dashboard** - Overview of courses, payments, attendance, and notifications
- 👤 **Profile Management** - View and update student profile information
- 📚 **Courses** - View enrolled courses with batch information
- 💳 **Payments** - Payment history with pagination and invoice viewing
- 📅 **Attendance** - Attendance records with year/month filtering
- 👥 **Batches** - View batch schedules and faculty information
- 🔔 **Notifications** - Real-time notifications with mark as read functionality
- 🎫 **Support Tickets** - View and manage support tickets
- 📈 **Academic Progress** - Track academic performance and statistics

## Tech Stack

- **Framework:** Next.js 16.1.1
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Authentication:** JWT with httpOnly cookies
- **API Integration:** RESTful API with proxy routes

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Access to the Tec Terminal backend API

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd TT-Showcase
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create environment file:
```bash
# Create .env.local file
cp .env.example .env.local
```

4. Configure environment variables in `.env.local`:
```env
API_BASE_URL=https://your-api-domain.com
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.com
NODE_ENV=development
```

5. Run the development server:
```bash
npm run dev
# or
yarn dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
TT-Showcase/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── api/               # API routes (proxy, auth)
│   │   ├── dashboard/         # Dashboard page
│   │   ├── profile/           # Profile page
│   │   ├── courses/           # Courses page
│   │   ├── payments/          # Payments page
│   │   ├── attendance/        # Attendance page
│   │   ├── batches/           # Batches page
│   │   ├── notifications/     # Notifications page
│   │   ├── tickets/           # Tickets page
│   │   ├── academic-progress/ # Academic progress page
│   │   └── login/             # Login page
│   ├── components/            # React components
│   │   ├── layout/           # Layout components (Sidebar, MainLayout)
│   │   ├── profile/          # Profile components
│   │   └── ui/               # UI components (LoadingSpinner, ErrorBoundary)
│   ├── lib/                  # Utilities and helpers
│   │   ├── api/              # API client functions
│   │   ├── auth.ts           # Authentication utilities
│   │   └── utils/            # Utility functions
│   └── types/                # TypeScript type definitions
├── docs/                     # Documentation
│   ├── STUDENT_PORTAL_NEXTJS_INTEGRATION_GUIDE.md
│   ├── STUDENT_PORTAL_API_ROUTES.md
│   ├── STUDENT_PORTAL_IMPLEMENTATION_SUMMARY.md
│   └── STUDENT_PORTAL_ROUTES_DOCUMENTATION.md
└── public/                   # Static assets
```

## API Integration

The application integrates with the Tec Terminal backend API. All API endpoints are prefixed with `/portal/student`.

### Authentication Flow

1. User logs in via `/login` page
2. Frontend calls `/api/auth/login` which proxies to backend `/auth/login`
3. Backend returns JWT tokens (accessToken, refreshToken)
4. Tokens are stored in httpOnly cookies
5. All subsequent API calls include the token in Authorization header

### API Client Usage

**Server Components:**
```typescript
import { apiClient } from '@/lib/api/client';

const data = await apiClient('/portal/student/dashboard');
```

**Client Components:**
```typescript
import { clientApiClient } from '@/lib/api/client-client';

const data = await clientApiClient('/portal/student/profile');
```

## Available Routes

### Public Routes
- `/` - Home (redirects to login or dashboard)
- `/login` - Student login

### Protected Routes
- `/dashboard` - Student dashboard
- `/profile` - Profile management
- `/courses` - Enrolled courses
- `/payments` - Payment history and invoices
- `/attendance` - Attendance records
- `/batches` - Batch schedules
- `/notifications` - Notifications
- `/tickets` - Support tickets
- `/academic-progress` - Academic progress

See `docs/STUDENT_PORTAL_ROUTES_DOCUMENTATION.md` for complete route documentation.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `API_BASE_URL` | Backend API base URL | Yes |
| `NEXT_PUBLIC_API_BASE_URL` | Public API base URL | Yes |
| `NODE_ENV` | Environment (development/production) | Yes |

## Development

### Running in Development Mode

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Documentation

- **Integration Guide:** `docs/STUDENT_PORTAL_NEXTJS_INTEGRATION_GUIDE.md`
- **API Routes Reference:** `docs/STUDENT_PORTAL_API_ROUTES.md`
- **Implementation Summary:** `docs/STUDENT_PORTAL_IMPLEMENTATION_SUMMARY.md`
- **Routes Documentation:** `docs/STUDENT_PORTAL_ROUTES_DOCUMENTATION.md`

## Best Practices

1. **Server Components:** Used for initial data fetching (dashboard, courses, batches)
2. **Client Components:** Used for interactive features (forms, pagination, filtering)
3. **Type Safety:** TypeScript types defined in `src/types/student-portal.types.ts`
4. **Error Handling:** Comprehensive error handling at all levels
5. **Authentication:** Protected routes check authentication before rendering
6. **Loading States:** Loading indicators shown during data fetching
7. **Pagination:** Implemented for list endpoints

## Security

- JWT tokens stored in httpOnly cookies
- Secure flag enabled in production
- SameSite cookie policy
- Token refresh mechanism
- Protected routes with authentication checks

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Follow the existing code structure
2. Use TypeScript for type safety
3. Follow the component patterns established
4. Add proper error handling
5. Update documentation as needed

## Support

For issues or questions:
1. Check the documentation in `docs/`
2. Review the API routes reference
3. Contact the development team

## License

[Your License Here]

## Version

1.0.0 - Initial implementation with all core features
