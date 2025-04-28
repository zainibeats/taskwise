#!/usr/bin/env node

/**
 * This script syncs users from the config/users.yml file to the database.
 * Run this script after making changes to the config file.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import fetch from 'node-fetch';

// Get current directory (for ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Default config path
const CONFIG_PATH = path.join(rootDir, 'config', 'users.yml');

// Default API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';

/**
 * Load the user configuration from YAML file
 */
function loadUserConfig(configPath = CONFIG_PATH) {
  try {
    if (!fs.existsSync(configPath)) {
      console.error(`User config file not found at ${configPath}`);
      process.exit(1);
    }

    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(fileContents);
    
    // Ensure the config has a users array
    if (!config || !config.users) {
      console.error('Invalid user config format');
      process.exit(1);
    }
    
    return config;
  } catch (error) {
    console.error('Error loading user config:', error);
    process.exit(1);
  }
}

/**
 * Sync users to the database
 */
async function syncUsers() {
  try {
    const config = loadUserConfig();
    
    console.log(`Loaded ${config.users.length} users from config`);
    
    // Send to API
    const response = await fetch(`${API_URL}/api/users/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Users synced successfully:', result);
  } catch (error) {
    console.error('Error syncing users:', error);
    process.exit(1);
  }
}

// Run the sync if called directly
syncUsers();

export default syncUsers; 