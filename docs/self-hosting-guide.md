# TaskWise Self-Hosting Guide

This guide provides detailed instructions for self-hosting the TaskWise application, with special attention to common pitfalls and cross-origin issues.

## Prerequisites

- A server or machine with Docker and Docker Compose installed
- Basic understanding of command line interfaces
- Your server's IP address or hostname

## Setup Options

### Option 1: Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/zainibeats/taskwise
   cd taskwise
   ```

2. **Create environment configuration**
   Copy the example environment file:
   ```bash
   cp env.example .env
   ```
   
   Edit the `.env` file with your preferred text editor and set:
   - Your Google AI API key

3. **Configure the docker-compose.yml file**
   The default `docker-compose.yml` is already set up for self-hosting. You just need to:
   
   - Edit the file and replace `YOUR_SERVER_IP` with your actual server IP address or hostname:
   
   ```yaml
   services:
     taskwise:
       build:
         args:
           - NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:3100
   ```
   
   For example, if your server's IP is 192.168.1.10, you would set:
   ```yaml
   - NEXT_PUBLIC_API_URL=http://192.168.1.10:3100
   ```

4. **Build and start the application**
   ```bash
   export GOOGLE_AI_API_KEY=your_google_ai_api_key_here
   docker-compose up -d
   ```
   
   For Windows PowerShell:
   ```powershell
   $env:GOOGLE_AI_API_KEY="your_google_ai_api_key_here"
   docker-compose up -d
   ```

5. **Create an admin user**
   After the container starts, you need to create an initial admin user:
   ```bash
   docker-compose exec taskwise npm run create-admin
   ```
   
   Follow the prompts to enter username, email, and password for the admin.

6. **Access the application**
   Open a browser and navigate to `http://YOUR_SERVER_IP:3000`

## User Management

TaskWise includes a comprehensive user management system with role-based access control.

### Creating Admin Users

There are two ways to create admin users:

#### Option 1: Using the CLI Script (Recommended)

```bash
# For local installation
npm run create-admin

# For Docker installation
docker-compose exec taskwise npm run create-admin
```

#### Option 2: Using the Configuration File

1. Edit the `config/users.yml` file:
   ```yaml
   users:
     - username: admin
       role: admin
       email: admin@example.com
       active: true
     - username: user1
       role: user
       email: user1@example.com
       active: true
   ```

2. Sync the users to the database:
   ```bash
   # For local installation
   npm run sync-users

   # For Docker installation
   docker-compose exec taskwise npm run sync-users
   ```

3. Users will be prompted to set a password on first login.

### Using the Admin Interface

Once you have an admin account:

1. Log in to TaskWise with your admin credentials
2. Navigate to `/admin` to access the admin dashboard
3. Use the admin dashboard to:
   - Create new users
   - Edit existing users
   - Deactivate users
   - Reset passwords

For detailed user management instructions, see [User Management Guide](user-management-guide.md).

### User Data Separation

Each user has their own:
- Tasks
- Categories
- Priority settings
- UI preferences

Data is completely isolated between users.

## For Developers

If you're developing TaskWise locally and want to use Docker, use the development-specific Docker Compose file:

```bash
# Start the application in development mode
docker-compose -f docker-compose.dev.yml up
```

This configuration:
- Maps port 9002 for the web UI (instead of 3000)
- Sets NODE_ENV to development
- Mounts your local directory for hot reloading
- Runs the application in development mode

## Troubleshooting Cross-Origin Issues

### Symptom: Tasks Only Save to localStorage

If you notice that tasks are only saved to localStorage when accessing from devices other than the server itself, this indicates a cross-origin issue with the API URL configuration.

### Solution:

1. **Check your API URL configuration**
   - Ensure `NEXT_PUBLIC_API_URL` in the docker-compose.yml build args is set to your server's actual IP or hostname, not localhost.
   - Remember: `localhost` in a browser refers to the user's local machine, not your server!

2. **Rebuild the Docker container**
   The `NEXT_PUBLIC_API_URL` is embedded during the build process, so you must rebuild:
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

3. **Verify browser console**
   - Open your browser's developer tools (F12)
   - Check the console for any CORS or network errors
   - Verify that API requests are going to your server IP, not to localhost

## Using a Domain Name

For a production deployment, you may want to use a domain name instead of an IP address.

1. **Configure your domain DNS**
   - Point your domain to your server's IP address
   - Consider setting up subdomains if needed (e.g., api.taskwise.example.com)

2. **Update configuration**
   - In docker-compose.yml, set:
     ```yaml
     - NEXT_PUBLIC_API_URL=http://YOUR_DOMAIN:3100
     ```
   - If using nginx or another reverse proxy, you can route traffic without exposing the port:
     ```yaml
     - NEXT_PUBLIC_API_URL=http://api.YOUR_DOMAIN
     ```

3. **Optional: Set up HTTPS**
   - For secure access, consider setting up HTTPS with Let's Encrypt
   - If using HTTPS, update URLs to use `https://` instead of `http://`
   - See [SSL Setup Guide](ssl-setup-guide.md) for detailed instructions

## Data Backup

TaskWise stores all data in a SQLite database file located in the `data/` directory. To back up your data:

1. **Create a backup script**
   ```bash
   #!/bin/bash
   BACKUP_DIR="/path/to/backups"
   DATE=$(date +"%Y%m%d_%H%M%S")
   cp -r ./data "${BACKUP_DIR}/taskwise_${DATE}"
   ```

2. **Set up a cron job**
   ```
   0 2 * * * /path/to/backup_script.sh
   ```

## Updating TaskWise

To update to a new version of TaskWise:

1. **Pull the latest changes**
   ```bash
   git pull origin main
   ```

2. **Rebuild and restart**
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

## Security Considerations

1. **API Key Security**
   - Keep your Google AI API key secure
   - Consider using Docker secrets or a dedicated environment variable management solution

2. **Firewall Configuration**
   - Only expose the necessary ports (3000 for web UI, 3100 for API)
   - Consider limiting access to trusted IP ranges

3. **Regular Updates**
   - Keep your system, Docker, and TaskWise updated with security patches 

4. **User Passwords**
   - Enforce strong password policies
   - Regularly review active user accounts
   - Deactivate accounts that are no longer needed 