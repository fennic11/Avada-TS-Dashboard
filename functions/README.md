# Avada TS Dashboard Functions

This is the backend API for the Avada TS Dashboard, built with Express.js and Firebase.

## Setup

### Prerequisites
- Node.js 18+
- Firebase CLI
- Firebase project

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your Firebase project details and other API keys

3. For development, you'll need a Firebase service account key:
   - Go to Firebase Console > Project Settings > Service Accounts
   - Generate a new private key
   - Save it as `serviceAccount.development.json` in the functions directory

### Firebase Configuration

1. Update `.firebaserc` with your Firebase project ID:
```json
{
  "projects": {
    "default": "your-actual-firebase-project-id"
  }
}
```

2. Update `firebase.json` if needed for your specific setup

3. Set environment variables in `.env`:
```
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_DATABASE_URL=https://your-firebase-project-id.firebaseio.com
FIREBASE_STORAGE_BUCKET=your-firebase-project-id.appspot.com
```

## Development

Start the development server:
```bash
npm run dev
```

The server will run on `http://localhost:5000`

## Deployment

### Deploy to Firebase Functions

1. Login to Firebase:
```bash
firebase login
```

2. Deploy functions:
```bash
npm run deploy
```

Or manually:
```bash
firebase deploy --only functions
```

### Environment Variables for Production

Set environment variables in Firebase Console:
1. Go to Firebase Console > Functions > Configuration
2. Add your environment variables under "Environment variables"

Required variables:
- `NODE_ENV=production`
- `MONGODB_URI`
- `SLACK_TOKEN`
- `TRELLO_API_KEY`
- `TRELLO_TOKEN`
- `BOARD_ID`
- `CRISP_API_KEY`
- `CRISP_SECRET_KEY`
- `CRISP_WEBSITE_ID`
- All webhook URLs

## API Endpoints

- `GET /` - Health check
- `GET /api/*` - API routes
- `POST /webhook/*` - Webhook endpoints

## Features

- MongoDB integration
- Firebase Admin SDK
- Slack notifications
- Trello integration
- Cron jobs for automated tasks
- CORS enabled for frontend integration

## File Structure

```
functions/
├── config/
│   ├── db.js          # MongoDB connection
│   └── firebase.js    # Firebase configuration
├── controllers/       # Route controllers
├── services/         # Business logic
├── models/           # Data models
├── routes/           # API routes
├── cron/             # Scheduled tasks
├── index.js          # Main server file
├── firebase.json     # Firebase configuration
├── .firebaserc       # Firebase project settings
└── package.json      # Dependencies
```
