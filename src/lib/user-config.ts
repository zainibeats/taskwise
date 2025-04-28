import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import bcrypt from 'bcrypt';
import getDbConnection from './db';

// User type definition
export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: 'admin' | 'user';
  active: number;
  email: string | null;
  created_at?: string;
  updated_at?: string;
}

// User config type definition
export interface UserConfig {
  users: {
    username: string;
    role?: string;
    email?: string;
    active?: boolean;
  }[];
}

// User session type definition
export interface UserSession {
  id: string;
  user_id: number;
  expires_at: string;
  created_at: string;
}

// Default config path
const CONFIG_PATH = path.join(process.cwd(), 'config', 'users.yml');

/**
 * Load the user configuration from YAML file
 */
export function loadUserConfig(configPath = CONFIG_PATH): UserConfig {
  try {
    if (!fs.existsSync(configPath)) {
      console.warn(`User config file not found at ${configPath}, using default empty config`);
      return { users: [] };
    }

    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(fileContents) as UserConfig;
    
    // Ensure the config has a users array
    if (!config || !config.users) {
      console.warn('Invalid user config format, using default empty config');
      return { users: [] };
    }
    
    return config;
  } catch (error) {
    console.error('Error loading user config:', error);
    return { users: [] };
  }
}

/**
 * Synchronize users from config to database
 */
export async function syncUsersToDatabase(): Promise<void> {
  const config = loadUserConfig();
  const db = getDbConnection();
  
  // Get existing users from the database
  const existingUsers = db.prepare('SELECT id, username, email, role, active FROM users').all() as User[];
  const existingUserMap = new Map(existingUsers.map(user => [user.username, user]));
  
  // Process each user in the config
  for (const configUser of config.users) {
    const existingUser = existingUserMap.get(configUser.username);
    
    if (existingUser) {
      // Update existing user
      db.prepare(`
        UPDATE users 
        SET 
          email = ?, 
          role = ?, 
          active = ?
        WHERE username = ?
      `).run(
        configUser.email || existingUser.email,
        configUser.role || existingUser.role || 'user',
        configUser.active !== undefined ? (configUser.active ? 1 : 0) : (existingUser.active ? 1 : 0),
        configUser.username
      );
    } else {
      // Insert new user without password (password will be set on first login)
      db.prepare(`
        INSERT INTO users (username, email, role, active)
        VALUES (?, ?, ?, ?)
      `).run(
        configUser.username,
        configUser.email || null,
        configUser.role || 'user',
        configUser.active !== undefined ? (configUser.active ? 1 : 0) : 1
      );
    }
  }
  
  // Optionally: Disable users that are no longer in the config
  // Uncomment this if you want to automatically disable removed users
  /*
  const configUsernames = new Set(config.users.map(u => u.username));
  for (const existingUser of existingUsers) {
    if (!configUsernames.has(existingUser.username)) {
      db.prepare('UPDATE users SET active = 0 WHERE username = ?').run(existingUser.username);
    }
  }
  */
}

/**
 * Get a user by username
 */
export function getUserByUsername(username: string): User | null {
  const db = getDbConnection();
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | null;
}

/**
 * Set a user's password
 */
export async function setUserPassword(username: string, password: string): Promise<boolean> {
  try {
    const db = getDbConnection();
    const user = getUserByUsername(username);
    
    if (!user) {
      return false;
    }
    
    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Update the user's password
    db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(passwordHash, username);
    
    return true;
  } catch (error) {
    console.error('Error setting password:', error);
    return false;
  }
}

/**
 * Verify a user's password
 */
export async function verifyUserPassword(username: string, password: string): Promise<User | null> {
  try {
    const user = getUserByUsername(username);
    
    if (!user || !user.password_hash || !user.active) {
      return null;
    }
    
    // Verify the password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (passwordMatch) {
      // Update last login time
      const db = getDbConnection();
      db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE username = ?').run(username);
      
      return user;
    }
    
    return null;
  } catch (error) {
    console.error('Error verifying password:', error);
    return null;
  }
}

/**
 * Check if a user needs to set their password
 */
export function userNeedsPasswordSetup(username: string): boolean {
  const user = getUserByUsername(username);
  return !!user && !user.password_hash;
}

/**
 * Update the last login time for a user
 */
export function updateUserLastLogin(userId: number): void {
  const db = getDbConnection();
  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
} 