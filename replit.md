# replit.md

## Overview

Peaberry is a comprehensive coffee discovery platform serving the Greater Boston area. It's a full-stack web application that connects coffee enthusiasts with local cafés through interactive mapping, advanced search/filtering, user reviews, and personalized recommendations. The platform features both user-facing discovery tools and admin management capabilities for café data.

## System Architecture

The application follows a modern full-stack architecture with:

**Frontend**: React with TypeScript, built using Vite, styled with Tailwind CSS and shadcn/ui components
**Backend**: Express.js server with TypeScript
**Database**: PostgreSQL with Drizzle ORM for type-safe database operations
**Authentication**: Hybrid system combining traditional email/password (server-side) and Google OAuth (via Firebase)
**Maps Integration**: Google Maps API with Places API for location services
**Email Services**: SendGrid for transactional emails (password resets)
**Deployment**: Replit-optimized with autoscale deployment target

## Key Components

### Frontend Architecture
- **React Router**: Uses Wouter for lightweight client-side routing
- **State Management**: React Query (TanStack Query) for server state management
- **UI Framework**: shadcn/ui built on Radix UI primitives with Tailwind CSS
- **Maps**: Custom Google Maps integration with marker clustering and advanced markers
- **Forms**: React Hook Form with Zod validation
- **Authentication**: Context-based auth provider with Firebase integration

### Backend Architecture
- **API Design**: RESTful API with Express.js
- **Database Layer**: Drizzle ORM with PostgreSQL, featuring type-safe schema definitions
- **Authentication**: Passport.js with dual strategies (local + Firebase)
- **Session Management**: PostgreSQL-backed sessions with connect-pg-simple
- **Password Security**: bcrypt hashing with complexity validation
- **Rate Limiting**: Custom email rate limiting for password reset flows

### Database Schema
- **Users**: Complete user profiles with OAuth provider support and role-based access
- **Cafés**: Rich café data including location, amenities, and coffee specialties
- **Reviews/Ratings**: User-generated content with rating system
- **Favorites**: User bookmark system for preferred cafés
- **Specialized Tables**: Separate tables for roast levels and brewing methods with many-to-many relationships

## Data Flow

### User Authentication Flow
1. **Email/Password**: Traditional registration/login with server-side password hashing
2. **Google OAuth**: Firebase-handled OAuth with server-side user synchronization
3. **Password Reset**: Secure token-based reset with email delivery via SendGrid
4. **Session Management**: HTTP-only cookies with PostgreSQL session storage

### Café Discovery Flow
1. **Search & Filter**: Advanced filtering by location, roast levels, brewing methods, amenities
2. **Geolocation**: Distance-based sorting with user location detection
3. **Map Integration**: Interactive Google Maps with custom coffee cup markers and clustering
4. **Review System**: Independent rating system separate from Google ratings

### Admin Management Flow
1. **Café Management**: CRUD operations for café listings with status management (draft/published/archived)
2. **Google Places Integration**: Automated café data import from Google Places API
3. **Data Enrichment**: Manual addition of coffee-specific details (roast levels, brewing methods)
4. **User Management**: Admin dashboard for user oversight and role management

## External Dependencies

### Required APIs
- **Google Maps JavaScript API**: Core mapping functionality, Places API for autocomplete
- **Firebase Authentication**: Google OAuth provider and user management
- **SendGrid API**: Transactional email delivery service

### Third-Party Services
- **Neon Database**: PostgreSQL hosting (configured via DATABASE_URL)
- **Firebase Admin SDK**: Server-side Firebase operations
- **Google Places API**: Location data and café information import

### Development Dependencies
- **Drizzle Kit**: Database migrations and schema management
- **ESBuild**: Production server bundling
- **TypeScript**: Type safety across the entire stack

## Deployment Strategy

The application is configured for Replit's autoscale deployment with:

**Build Process**: 
- Frontend: Vite build outputting to `dist/public`
- Backend: ESBuild bundling server code to `dist/index.js`

**Environment Configuration**:
- Node.js 20 runtime with PostgreSQL 16 module
- Port 5000 mapped to external port 80
- Parallel workflow execution for development

**Production Considerations**:
- Firebase service account key security (excluded from version control)
- Environment-based secrets management for API keys
- Database connection pooling via Neon serverless driver
- Session store backed by PostgreSQL for horizontal scaling

**Security Features**:
- HTTP-only session cookies
- CSRF protection via session-based authentication
- Rate limiting on password reset endpoints
- Firebase webhook signature verification
- Secure password hashing with bcrypt

## Changelog

- June 18, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.