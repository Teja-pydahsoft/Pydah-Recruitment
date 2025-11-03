# Faculty Recruitment System

A comprehensive recruitment automation system built with Node.js, Express, MongoDB, React, and Bootstrap.

## Features

- **Multi-role Authentication**: Super Admin, Panel Member, and Candidate portals
- **Dynamic Form Builder**: Create custom recruitment forms with various field types
- **Test Management**: Create and manage recruitment tests with automatic scoring
- **Interview Scheduling**: Schedule interviews with panel members and collect feedback
- **Candidate Profiles**: Comprehensive tabbed view of candidate information, test results, and interview feedback
- **Real-time Dashboard**: Analytics and insights for recruitment management

## Tech Stack

### Backend
- **Node.js** with **Express.js**
- **MongoDB** with **Mongoose**
- **JWT** for authentication
- **bcryptjs** for password hashing

### Frontend
- **React** with **React Router**
- **Bootstrap** for UI components
- **Axios** for API calls
- **Context API** for state management

## Project Structure

```
faculty-recruitment/
├── backend/                 # Backend API server
│   ├── config/             # Database configuration
│   ├── middleware/         # Authentication middleware
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API route handlers
│   ├── server.js           # Main server file
│   ├── package.json        # Backend dependencies
│   └── .env                # Environment variables
├── frontend/                # React frontend
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React context providers
│   │   ├── services/       # API service functions
│   │   └── App.js          # Main React app
│   └── package.json        # Frontend dependencies
├── .gitignore              # Git ignore rules
├── vite.config.js          # Vite configuration
└── README.md               # Project documentation
```

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your MongoDB connection string and JWT secret. To enable Google Drive resume uploads, add:
   ```env
   GOOGLE_DRIVE_FOLDER_ID=your_drive_folder_id
   GOOGLE_APPLICATION_CREDENTIALS=./config/credentials.json
   GOOGLE_DRIVE_OWNER_EMAIL=your-email@gmail.com  # Optional: folder owner email (auto-detected if not set)
   ```
   Place your Google service account JSON as `backend/config/credentials.json`.

   **Google Drive Upload Setup (Choose ONE method):**
   
   **Option 1: OAuth 2.0 (Recommended - No Admin Access Required)**
   
   This works for personal Google accounts and doesn't require admin access:
   
   1. Go to [Google Cloud Console](https://console.cloud.google.com/)
   2. Navigate to **APIs & Services** > **Credentials**
   3. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
   4. Configure OAuth consent screen (if first time):
      - User Type: **External**
      - App name: **Faculty Recruitment System**
      - Add scopes: `https://www.googleapis.com/auth/drive.file` and `https://www.googleapis.com/auth/drive`
      - Add your email as test user
   5. Create OAuth credentials:
      - Application type: **Web application**
      - Name: **Faculty Recruitment Web Client**
      - Authorized redirect URIs: `http://localhost:5000/api/drive/oauth/callback`
      - Click **Create**
   6. **Download the JSON file** and save it as `backend/config/oauth-credentials.json`
   7. Run the OAuth setup script:
      ```bash
      cd backend
      node scripts/getOAuthToken.js
      ```
   8. Follow the prompts to authorize and get your refresh token
   9. Add to `.env`:
      ```env
      GOOGLE_DRIVE_OAUTH_CREDENTIALS=./config/oauth-credentials.json
      GOOGLE_DRIVE_REFRESH_TOKEN=your_refresh_token_from_step_8
      GOOGLE_DRIVE_OWNER_EMAIL=teja@pydahsoft.in
      ```
   
   **Option 2: Service Account with Domain-Wide Delegation (Requires Google Workspace Admin)**
   
   If you have Google Workspace admin access:
   
   1. Enable Domain-Wide Delegation in Google Cloud Console for your service account
   2. Authorize in Google Workspace Admin Console (see detailed steps in code comments)
   3. Set `GOOGLE_DRIVE_OWNER_EMAIL` in `.env` with the folder owner's email
   
   The app automatically uses OAuth if configured, otherwise falls back to service account.

5. Start the backend server:
   ```bash
   npm start
   ```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user (Super Admin only)
- `GET /api/auth/profile` - Get current user profile

### Forms Management
- `GET /api/forms` - Get all forms (Super Admin)
- `POST /api/forms` - Create new form (Super Admin)
- `GET /api/forms/public/:uniqueLink` - Get public form for candidates
- `POST /api/forms/public/:uniqueLink/submit` - Submit form response
  - Accepts `application/json` (no files) or `multipart/form-data` (with files). When files are included, they are uploaded to Google Drive and stored in the candidate record.

### Tests Management
- `GET /api/tests` - Get all tests (Super Admin)
- `POST /api/tests` - Create new test (Super Admin)
- `GET /api/tests/take/:testLink` - Get test for candidates
- `POST /api/tests/:id/submit` - Submit test answers

### Interviews Management
- `GET /api/interviews` - Get all interviews
- `POST /api/interviews` - Create new interview (Super Admin)
- `POST /api/interviews/:id/feedback` - Submit interview feedback

### Candidates Management
- `GET /api/candidates` - Get all candidates (Super Admin)
- `GET /api/candidates/:id` - Get candidate profile with tabs
- `PUT /api/candidates/:id/status` - Update candidate status
- `PUT /api/candidates/:id/final-decision` - Set final decision

## User Roles & Permissions

### Super Admin
- Create and manage recruitment forms
- Create and manage tests
- Schedule interviews
- View all candidates and their profiles
- Make final hiring decisions
- Manage users and permissions

### Panel Member
- View assigned interviews
- Submit interview feedback and ratings
- View candidate profiles for assigned interviews

### Candidate
- Submit applications through public forms
- Take assigned tests
- View personal profile and application status
- View test results and interview feedback

## Database Schema

### User
- Personal information (name, email, password)
- Role (super_admin, panel_member, candidate)
- Profile details

### RecruitmentForm
- Form metadata (title, description, position)
- Dynamic form fields configuration
- Unique public link for sharing

### Candidate
- User reference and form reference
- Application data (dynamic based on form)
- Test results and scores
- Interview feedback and ratings
- Final decision status

### Test
- Questions with multiple types (MCQ, coding, subjective)
- Test configuration (duration, passing criteria)
- Candidate assignments and results

### Interview
- Interview details and scheduling
- Panel member assignments
- Candidate feedback collection
- Evaluation criteria

## Development

### Available Scripts

#### Backend
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

#### Frontend
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

### Environment Variables

Create a `.env` file in the backend directory:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/faculty_recruitment
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support or questions, please open an issue in the repository.
