# Deployment Guide - Tec Terminal Backend 2.0

## ✅ Pre-Deployment Checklist

1. **Build Status**: ✅ Build successful
2. **Dependencies**: All installed
3. **Database Migrations**: Configured in `postbuild` script

## 🚀 Deployment Steps

### For Platforms like Vercel, Railway, Render, etc.

#### 1. **Build Command**
```bash
npm run build
```
This will:
- Compile TypeScript to JavaScript
- Run Prisma migrations (`prisma migrate deploy`)

#### 2. **Start Command**
```bash
npm run start:prod
```
or
```bash
npm start
```

#### 3. **Install Command** (if needed)
```bash
npm ci
```
or
```bash
npm install
```

### Required Environment Variables

Make sure to set these in your deployment platform:

- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - Set to `production`
- `PORT` - Port number (default: 8000)
- `JWT_SECRET` - JWT secret key (if using authentication)
- Any other environment variables your app requires

### Platform-Specific Notes

#### Vercel
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm ci`
- Start Command: `npm run start:prod`

#### Railway
- Build Command: `npm run build`
- Start Command: `npm run start:prod`
- Railway will automatically detect Node.js and run the build

#### Render
- Build Command: `npm run build`
- Start Command: `npm run start:prod`
- Environment: Node

### Important Notes

1. **Prisma**: The `postinstall` script runs `prisma generate` automatically
2. **Migrations**: The `postbuild` script runs `prisma migrate deploy` automatically
3. **Database**: Ensure your database is accessible from the deployment platform
4. **Port**: The app listens on the port specified in the `PORT` environment variable (default: 8000)

### Testing Deployment Locally

Before deploying, test the production build locally:

```bash
# Build the project
npm run build

# Run in production mode
npm run start:prod
```

The server should start on `http://localhost:8000` (or your configured PORT).

### Troubleshooting

1. **Build fails**: Check that all TypeScript errors are resolved
2. **Database connection fails**: Verify `DATABASE_URL` is correct and database is accessible
3. **Prisma errors**: Ensure `DATABASE_URL` is set and migrations are up to date
4. **Port issues**: Make sure the `PORT` environment variable matches your platform's requirements

