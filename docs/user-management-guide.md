# TaskWise User Management Guide

This guide provides detailed instructions for managing user accounts in TaskWise, particularly for self-hosted instances.

## Overview

TaskWise includes a comprehensive user management system with:

- Role-based access control (admin/user roles)
- Admin interface for user management
- API endpoints for user CRUD operations
- Secure password storage with bcrypt
- Session-based authentication

## Initial Setup

When self-hosting TaskWise, you'll need to create an initial administrator account.

### Creating the Initial Admin Account

There are two ways to create the initial admin account:

#### Option 1: Using the CLI Script (Recommended)

The simplest way is to use the included admin creation script:

```bash
# Run the create-admin script
npm run create-admin
```

Follow the prompts to enter username, email, and password for the admin account.

#### Option 2: Using the Configuration File

You can also define users in the `config/users.yml` file:

```yaml
users:
  - username: admin
    role: admin
    email: admin@example.com
    active: true
```

Then run the sync script to apply these changes:

```bash
npm run sync-users
```

Note: Users created this way will be prompted to set a password on first login.

## Docker Setup for User Management

When using Docker for self-hosting, you can create an admin user by running the create-admin script inside the container:

```bash
# Run the admin creation script inside the Docker container
docker-compose exec taskwise npm run create-admin
```

## Accessing the Admin Interface

Once you have an admin account:

1. Log in to TaskWise using your admin credentials
2. Navigate to `/admin` to access the admin dashboard
3. From here, you can manage users, view statistics, and configure system settings

## User Management Functions

### Creating Users

From the admin dashboard, you can create new users by:

1. Clicking on the "User Management" tab
2. Filling out the "Create New User" form with:
   - Username (required)
   - Email (required) 
   - Password (required for new users)
   - Role (admin/user)
   - Active status

### Editing Users

To edit an existing user:

1. Locate the user in the user list
2. Click the "Edit" button next to their entry
3. Modify details in the edit dialog:
   - Username
   - Email
   - Role
   - Active status
   - Password (leave blank to keep current)
4. Click "Update User" to save changes

### Deactivating Users

Rather than deleting users, it's often better to deactivate them:

1. Edit the user
2. Toggle the "Active" switch to disable the account
3. Save changes

Deactivated users cannot log in but their data remains intact.

### Resetting Passwords

To reset a user's password:

1. Edit the user
2. Enter a new password in the password field
3. Save changes

## API Endpoints

TaskWise provides the following API endpoints for user management:

- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create a new user
- `GET /api/admin/users/:id` - Get a specific user
- `PUT /api/admin/users/:id` - Update a user
- `DELETE /api/admin/users/:id` - Delete/deactivate a user

These endpoints are only accessible to users with the admin role.

## Security Considerations

### Password Storage

All passwords are hashed using bcrypt before storage. Plain-text passwords are never stored in the database.

### Session Management

TaskWise uses secure HTTP-only cookies for session management. Sessions expire after 24 hours of inactivity.

### Role-Based Access

- **Admin users** have access to the admin interface and all management functions
- **Regular users** can only access their own tasks and basic account functions

## Troubleshooting

### Lost Admin Password

If you lose access to all admin accounts:

1. Stop the TaskWise server
2. Run the admin creation script to create a new admin account:
   ```bash
   npm run create-admin
   ```
3. Restart the server and log in with the new admin credentials

### User Cannot Log In

1. Check if the user account is marked as active in the admin interface
2. Verify the username is correctly spelled
3. Reset the password if necessary

## Best Practices

1. **Create dedicated admin accounts** rather than sharing a single admin login
2. **Regularly review user accounts** and deactivate those no longer needed
3. **Set strong password requirements** for all users
4. **Limit admin access** to only those who need it

## For Developers

If you're extending TaskWise's user management system:

- Authentication logic is in `src/lib/auth-utils.ts`
- User API endpoints are in `src/app/api/admin/users/`
- Admin UI components are in `src/app/admin/components/` 