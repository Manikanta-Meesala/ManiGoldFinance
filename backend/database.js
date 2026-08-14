const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');

let dbInstance = null;

async function getDB() {
  if (dbInstance) {
    return dbInstance;
  }
  const { getConfig } = require('./config');
  const config = getConfig();
  if (!config.storage_path) {
    throw new Error('Storage path not configured');
  }
  return await initDatabase(config.storage_path);
}

async function initDatabase(storagePath) {
  // Ensure the directory exists
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }

  const dbPath = path.join(storagePath, 'ManiGoldFinance.db');
  
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Create tables
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS active_loans (
      loan_id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      mobile_number TEXT NOT NULL,
      gold_weight REAL NOT NULL,
      item_names TEXT NOT NULL,
      item_images TEXT NOT NULL, -- JSON string array
      loan_amount REAL NOT NULL,
      daily_interest_rate REAL NOT NULL,
      remarks TEXT,
      year_folder TEXT NOT NULL,
      month_folder TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS returned_loans (
      loan_id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      returned_at TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      mobile_number TEXT NOT NULL,
      gold_weight REAL NOT NULL,
      item_names TEXT NOT NULL,
      item_images TEXT NOT NULL, -- JSON string array
      loan_amount REAL NOT NULL,
      daily_interest_rate REAL NOT NULL,
      remarks TEXT,
      return_video TEXT NOT NULL,
      total_interest_collected REAL NOT NULL,
      total_amount_paid REAL NOT NULL,
      paid_status TEXT NOT NULL, -- 'Paid' or 'Unpaid'
      year_folder TEXT NOT NULL,
      month_folder TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS external_loans (
      external_loan_id TEXT PRIMARY KEY,
      original_loan_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      external_shop_name TEXT NOT NULL,
      amount_received REAL NOT NULL,
      external_interest_rate REAL NOT NULL,
      received_back INTEGER DEFAULT 0, -- 0 or 1
      received_back_date TEXT
    );
  `);

  // Initialize default admin user if none exists
  const adminExists = await dbInstance.get('SELECT * FROM users WHERE username = ?', ['admin']);
  if (!adminExists) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await dbInstance.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', ['admin', passwordHash]);
    console.log('Default admin user created.');
  }

  // Set up backups folder in storage path if it doesn't exist
  const backupsPath = path.join(storagePath, 'backups');
  if (!fs.existsSync(backupsPath)) {
    fs.mkdirSync(backupsPath, { recursive: true });
  }

  return dbInstance;
}

// Function to handle database backups
async function runBackup() {
  try {
    const { getConfig } = require('./config');
    const config = getConfig();
    if (!config.storage_path) return;

    const dbPath = path.join(config.storage_path, 'ManiGoldFinance.db');
    if (!fs.existsSync(dbPath)) return;

    const backupsPath = path.join(config.storage_path, 'backups');
    if (!fs.existsSync(backupsPath)) {
      fs.mkdirSync(backupsPath, { recursive: true });
    }

    // Get current date formatted for filename
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const backupFile = path.join(backupsPath, `backup_${dateStr}.db`);

    // Only backup if the file for today doesn't exist already
    if (!fs.existsSync(backupFile)) {
      fs.copyFileSync(dbPath, backupFile);
      console.log(`Auto-backup completed: ${backupFile}`);
      return backupFile;
    }
  } catch (err) {
    console.error('Failed to run backup:', err);
  }
}

module.exports = {
  getDB,
  initDatabase,
  runBackup
};
