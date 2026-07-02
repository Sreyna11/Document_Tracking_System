# Agent Rules

## Data Fetching and State Management
- **Always** use **TanStack Query** (`@tanstack/react-query`) for all backend data fetching, caching, and state management instead of manual `useState`/`useEffect` combinations or `localStorage`.
- Ensure all mutations are followed by cache invalidations to maintain UI consistency.
- Use centralized API utilities (like `src/utils/api.js`) to include the Authorization header for all API calls.

## API Documentation
- **Always** add PHPDoc annotations (such as @param, @return, @tags) to Laravel Controllers and API endpoints to ensure they are properly documented by Dedoc Scramble.
