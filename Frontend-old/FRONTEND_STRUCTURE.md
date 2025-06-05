# AI Lesson Maker - Frontend Page Structure

## Overview

The AI Lesson Maker platform has been reorganized with a new page structure that creates a clearer user journey and better separates different tools and functionalities.

## Page Structure

### Public Pages (Non-authenticated Users)

1. **Landing Page** (`/`)
   - Attractive marketing page with features, benefits and testimonials
   - Login and registration buttons
   - Only visible to non-authenticated users

2. **Login Page** (`/login`)
   - User login form
   - Link to registration page

3. **Registration Page** (`/register`)
   - New user registration form
   - Link to login page

4. **Email Verification Page** (`/verify-email`)
   - Prompts users to verify their email
   - Allows resending verification email

### Authenticated User Pages

1. **Dashboard** (`/dashboard`)
   - Central hub showing usage statistics (videos created, pending tasks, available credits)
   - Card-based navigation to different tools
   - Quick access to recent tasks

2. **AI Lesson Maker** (`/lesson-maker`)
   - The main video generation tool (previously the homepage)
   - Form on the left, video preview on the right
   - Back to dashboard button added

3. **AI Course Maker** (`/course-maker`)
   - Currently shows "Coming Soon" message
   - Will be implemented in a future update

4. **Tasks Page** (`/tasks`)
   - List of all current and past tasks
   - Queue status and position display
   - Task cancellation functionality

5. **Account Settings** (`/account`)
   - Team management
   - Subscription settings
   - Credit usage

6. **Profile Page** (`/profile`)
   - User profile settings
   - Password change
   - Email preferences

## Navigation

- The header menu has been updated to reflect the new structure
- The dashboard provides card-based navigation to all available tools
- Each tool page includes a "Back to Dashboard" button

## Benefits of the New Structure

- Clearer separation between different tools
- More professional landing page for non-authenticated users
- Central dashboard provides better overview of available tools and account status
- Consistent navigation throughout the application
- Easier to add new tools in the future

## Future Improvements

- More detailed analytics in the dashboard
- Recently used tools section
- Personalized dashboard based on user behavior
- Expanded course maker tool
