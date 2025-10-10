# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a full-stack Chinese personal website/blog system built with:
- **Frontend**: Vue 3 + Vite + Element Plus + Pinia
- **Backend**: Node.js + Express + MongoDB + JWT authentication  
- **Email**: Inbucket temporary email service for development
- **Architecture**: RESTful API with modular MVC structure

## Common Development Commands

### Setup and Installation
```bash
# Install all dependencies (frontend + backend)
npm run setup

# First-time email service setup
npm run email:setup

# Start complete development environment
npm run dev
```

### Development Workflow
```bash
# Start individual services
npm run dev:frontend    # Vue frontend on port 3000
npm run dev:backend     # Node.js backend on port 8001
npm run email:start     # Inbucket email service on port 9000

# Email service management
npm run email:status    # Check email service status
npm run email:logs      # View email service logs
npm run email:stop      # Stop email service
npm run email:clean     # Clean email containers
```

### Testing and Quality
```bash
# Backend tests
npm run test
npm run test:backend

# Code linting and formatting
npm run lint            # Lint both frontend and backend
npm run lint:fix        # Auto-fix linting issues
npm run format          # Format with Prettier

# Type checking (frontend only)
npm run type-check
```

### Building and Deployment
```bash
# Build for production
npm run build

# Production start
npm start

# PM2 deployment
npm run deploy:pm2

# Health checks and monitoring
npm run backup          # Run backup script
scripts/health-check.sh # System health check
```

## Project Architecture

### Frontend Structure (`frontend/src/`)
- **`/api/`** - API client functions organized by resource (auth.js, articles.js, etc.)
- **`/components/`** - Reusable Vue components (AuthGuard, MarkdownEditor, etc.)
- **`/views/`** - Page-level components and route handlers
- **`/stores/`** - Pinia state management stores
- **`/router/`** - Vue Router configuration
- **`/composables/`** - Vue 3 composition functions
- **`/plugins/`** - Vue plugins (backgroundManager, etc.)
- **`/styles/`** - Global CSS/SCSS styling

### Backend Structure (`backend/src/`)
- **`/routes/`** - Express route definitions (organized by resource + admin routes)
- **`/controllers/`** - Business logic handlers 
- **`/models/`** - Mongoose MongoDB schemas
- **`/middleware/`** - Express middleware (auth, validation, security, etc.)
- **`/services/`** - Business service layer
- **`/config/`** - Configuration files (database, email domains, etc.)
- **`/utils/`** - Utility functions and helpers

### Key Features
- **Blog System**: Markdown editor with real-time preview, article management
- **User Management**: JWT authentication, user profiles, permission system
- **Admin Panel**: Complete admin interface for content and user management
- **Email System**: Development uses Inbucket, production uses Postfix
- **Temporary Email**: Built-in temporary email service with domain management
- **File Upload**: Image upload with Sharp processing
- **Security**: Rate limiting, CORS, Helmet security headers
- **Background Management**: Dynamic page backgrounds with admin controls

## API Architecture

### Authentication Flow
- JWT tokens for session management
- Email verification required for registration
- Role-based permissions (user, admin)
- Rate limiting on auth endpoints

### Key API Patterns
- RESTful endpoints under `/api/` prefix
- Consistent response format: `{ success: boolean, data: any, message: string }`
- Request validation using express-validator and Joi
- Error handling with custom error middleware
- Activity logging for admin actions

### Database Models
- **User**: User accounts with roles and email verification
- **Article**: Blog posts with Markdown content
- **Comment**: Nested commenting system
- **Category/Tag**: Content organization
- **TempEmail**: Temporary email management
- **ActivityLog**: System activity tracking

## Development Guidelines

### Code Style (defined in .eslintrc.js)
- ES2021 syntax with modules
- Single quotes, semicolons required
- 2-space indentation
- 100 character line limit
- Prefer const over let, no var
- Arrow functions preferred

### File Organization
- Keep related functionality together (controllers, routes, models for same resource)
- Use descriptive file names that match their primary export
- Place reusable logic in `/utils/` or `/services/`
- Admin-specific routes go in `/routes/admin/` subfolder

### Environment Configuration
- Development: Uses local MongoDB, Inbucket email
- Production: External MongoDB, Postfix email
- Environment variables in `.env` files (see `.env.example`)
- Docker Compose for development email services

### Email Service Architecture
- Development: Inbucket container for testing email flows
- Production: Postfix + external SMTP for real email delivery  
- Domain management for temporary email addresses
- Email verification system for user registration

## Common Development Tasks

### Adding New API Endpoints
1. Create route in appropriate `/routes/` file
2. Add controller function in `/controllers/`
3. Add validation middleware if needed
4. Update frontend API client in `/api/`
5. Add frontend UI components in `/components/` or `/views/`

### Database Schema Changes
1. Update Mongoose model in `/models/`
2. Consider migration script if data structure changes
3. Update related controllers and validation
4. Test with existing data

### Frontend Component Development  
1. Create component in appropriate `/components/` subdirectory
2. Use Element Plus components for consistency
3. Follow Vue 3 Composition API patterns
4. Add to router if it's a page-level component
5. Update Pinia stores for state management

### Running Single Tests
Currently uses Jest for backend testing:
```bash
cd backend && npm test -- --testNamePattern="specific test name"
```

### Docker Development
- Use `docker-compose.dev.yml` for development services
- Inbucket email service runs in container
- Backend and frontend run natively for hot reload

## Important Notes

- The backend runs on port 8001 (not 8000) - update API calls accordingly
- Email verification is required for user registration
- Admin routes have separate rate limiting and authentication
- File uploads are processed with Sharp for image optimization
- The system supports both traditional email and temporary email services
- Background management system allows dynamic page styling