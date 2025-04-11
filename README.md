# Peaberry: Boston Coffee Discovery Platform

## Project Overview

Peaberry is a dynamic coffee discovery platform serving the Greater Boston area, designed to connect coffee enthusiasts with local cafés through innovative search, mapping, and personalization features. The application allows users to discover, review, and favorite cafés while also providing café owners the ability to claim and manage their business listings.

## Features

### User Features
- **Interactive Map View**: Browse cafés on a Google Maps interface with custom coffee cup icons
- **Advanced Search & Filtering**: Find cafés by:
  - Neighborhood (Boston, Cambridge, Somerville, etc.)
  - Roast levels (Light, Medium, Dark)
  - Brewing methods (Pour Over, Espresso, Aeropress, French Press, Siphon)
  - Amenities (WiFi, Power outlets, Food)
  - Price level
- **Sorting Options**: 
  - Default (relevance)
  - Distance from user location
  - Highest rating
  - Most reviews
- **List View**: Browse cafés with pagination (9 cafés per page)
- **Detailed Café Pages**: View comprehensive information about each café
- **Review System**: Rate and review cafés (independent from Google ratings)
- **User Profiles**: Save favorite cafés for quick access
- **Authentication**: Secure login/registration system

### Admin Features
- **Dashboard**: Manage all café listings from a central admin panel
- **Café Management**:
  - Manual café creation
  - Edit café details
  - Archive and permanently delete listings
  - Status management (draft, published, archived)
- **Data Enrichment**: Add coffee-specific details (roast levels, brewing methods)
- **Google Places Integration**: Import café data from Google Places API
- **Location Input**: Google Places Autocomplete for accurate address and coordinate entry

### Map Features
- **Custom Markers**: Coffee cup icons with color-coded status indicators
- **Marker Clustering**: Efficient display of multiple locations using color-coded density
- **Interactive Popups**: Enhanced with:
  - Roast level tags
  - Brewing method tags
  - Rating display
  - Favorite indicator
- **Geolocation**: Distance calculations and sorting by proximity

## Technical Stack

### Frontend
- **Framework**: React (Vite)
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)
- **UI Components**: Shadcn/UI with Radix UI primitives
- **Styling**: Tailwind CSS
- **Form Handling**: React Hook Form with Zod validation
- **Map Integration**: Google Maps JavaScript API with custom styling
- **Icons**: Lucide React

### Backend
- **Server**: Express.js
- **Database**: PostgreSQL with Neon Serverless
- **ORM**: Drizzle ORM
- **Authentication**: Passport.js with bcrypt/scrypt password hashing
- **Session Management**: Express Session with PostgreSQL store
- **API Integration**: Google Places API for café data

### DevOps
- **Workflow Management**: Replit Workflows
- **Environment Management**: Vite + TypeScript
- **Type Safety**: Full TypeScript implementation with shared schema types

## Data Architecture

### Core Entities
- **Users**: Account information and authentication data
- **Cafés**: Core café information (name, location, description, etc.)
- **Roast Levels**: Light, Medium, Dark options for each café
- **Brewing Methods**: Pour Over, Espresso, Aeropress, French Press, Siphon options
- **Ratings**: User reviews and ratings for cafés
- **Favorites**: User-saved favorite cafés

### Schema Highlights
- Latitude/longitude stored as text in the database, converted from numbers during API imports
- Explicit modeling of relations using Drizzle ORM
- Comprehensive filtering capabilities built into schema design

## Development Achievements

- Implemented comprehensive database schema with Drizzle ORM
- Created robust authentication system with password security
- Developed interactive Google Maps integration with marker clustering
- Built responsive UI with mobile-first design principles
- Implemented café filtering and search functionality
- Created admin interface for café management
- Added distance calculation with proper geolocation
- Enhanced performance with pagination and efficient data loading
- Implemented manual café creation with Google Places Autocomplete

## Future Plans

- Enhanced user profile features
- Café owner portal for business management
- Social features for sharing favorite cafés
- Mobile application development
- Advanced analytics for café owners
- Event listings for café special events

---

## Getting Started

### Prerequisites
- Node.js (version 18 or higher)
- PostgreSQL database
- Google Maps API key
- Google Places API key

### Environment Variables
Required environment variables include:
- `DATABASE_URL`: PostgreSQL connection string
- `GOOGLE_MAPS_API_KEY`: API key for Google Maps
- `VITE_GOOGLE_MAPS_API_KEY`: Same key exposed to frontend

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run database migrations: `npm run db:push`
5. Start development server: `npm run dev`

### Default User Credentials
- Username: `testuser`
- Password: `password`