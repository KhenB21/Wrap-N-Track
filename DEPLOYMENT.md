# Wrap-N-Track Deployment Configuration

This repository is configured for deployment on DigitalOcean App Platform using the provided database credentials.

## Database Configuration

The application is configured to use the DigitalOcean Managed PostgreSQL database with the following credentials:

- **Host**: wrapntrackdb-do-user-22907915-0.k.db.ondigitalocean.com
- **Port**: 25060
- **Database**: defaultdb
- **Username**: doadmin
- **Password**: AVNS_j8FcQJEuDrwQ7GpJjDk
- **SSL Mode**: Required

## Deployment Files

### `.do/app.yaml`
DigitalOcean App Platform configuration file that defines:
- Service configuration with Node.js environment
- Environment variables for database connection
- Build and run commands
- CORS settings for production

### Environment Variables
The following environment variables are configured in the deployment:

**Database:**
- `DB_USER=doadmin`
- `DB_HOST=wrapntrackdb-do-user-22907915-0.k.db.ondigitalocean.com`
- `DB_NAME=defaultdb`
- `DB_PASSWORD=AVNS_j8FcQJEuDrwQ7GpJjDk`
- `DB_PORT=25060`

**Application:**
- `NODE_ENV=production`
- `JWT_SECRET=917d905af041889478c9a3b0d0c7a4f7af9848504d45a36ca73d6caad0f173e3`
- `CORS_ORIGIN=https://wrap-n-track.ondigitalocean.app`

**Email:**
- `EMAIL_USER=marckhennethbolima@gmail.com`
- `EMAIL_PASSWORD=pibm swva qtrz vmod`

**Frontend:**
- `REACT_APP_API_URL=https://wrap-n-track.ondigitalocean.app`
- `REACT_APP_WS_URL=wss://wrap-n-track.ondigitalocean.app`

## Deployment Process

### Automatic Deployment
The app is configured for automatic deployment from the `main` branch:

1. **Build Process**: 
   - `npm run build` - Installs dependencies and builds the React frontend
   - Static files are copied to the `/build` directory
   - Server serves both API routes and static files

2. **Runtime**:
   - `npm start` - Starts the Express server
   - Server runs on the PORT specified by DigitalOcean
   - Static files served from `/build` directory
   - API routes available at `/api/*`

### Manual Deployment
If deploying manually:

1. Install dependencies: `npm install`
2. Build the application: `npm run build`
3. Start the server: `npm start`

## Application Structure

- **Backend**: Express.js server in `/Website/server`
- **Frontend**: React application in `/Website/client`
- **Mobile**: React Native app in `/Mobile`
- **Build Output**: Static files in `/build`

## Database Schema
The application will automatically create necessary database tables and constraints on first run.

## Features Configured
- Full-stack Node.js + React application
- PostgreSQL database with SSL connection
- WebSocket support for real-time updates
- File upload handling with multer
- JWT authentication
- Email notifications via nodemailer
- CORS configured for production domain

## Security Notes
- Database uses SSL with `rejectUnauthorized: false` for DigitalOcean managed database compatibility
- JWT secret is configured for authentication
- CORS is restricted to the production domain
- Sensitive credentials should be managed via environment variables in production

## Troubleshooting

### Database Connection Issues
- Verify the database hostname is reachable
- Check that SSL is properly configured
- Ensure the database credentials are correct

### Build Issues
- Clear node_modules and package-lock.json if needed
- Ensure Node.js version matches the engine requirement (18.x)
- Check for any missing dependencies

### Runtime Issues
- Check environment variables are properly set
- Verify the PORT variable is set by the platform
- Check server logs for detailed error messages