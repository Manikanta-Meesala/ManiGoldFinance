const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const { getConfig, saveConfig } = require('./config');
const { getDB, initDatabase, runBackup } = require('./database');
const { updateMonthlyExcel } = require('./excelHelper');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Set up dynamic storage for Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const config = getConfig();
    if (!config.storage_path) {
      return cb(new Error('Storage path not configured'));
    }
    const now = new Date();
    const yearFolder = now.getFullYear() + 'folder';
    // Format month as lowercase full name (e.g. june) + ' folder'
    const monthName = now.toLocaleString('en-US', { month: 'long' }).toLowerCase();
    const monthFolder = monthName + ' folder';

    const subDir = file.fieldname === 'video' ? 'videos' : 'images';
    const destDir = path.join(config.storage_path, yearFolder, monthFolder, subDir);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || (file.fieldname === 'video' ? '.webm' : '.jpg');
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ storage });

// Check if config.storage_path is set
app.use((req, res, next) => {
  const config = getConfig();
  const allowedPaths = ['/api/config', '/api/config/check'];
  if (!config.storage_path && !allowedPaths.includes(req.path)) {
    return res.status(400).json({ error: 'Storage path not configured. Please set the storage path first.' });
  }
  next();
});

// Serve dynamic media files
app.get('/api/media/:yearFolder/:monthFolder/:type/:filename', (req, res) => {
  const { yearFolder, monthFolder, type, filename } = req.params;
  const config = getConfig();
  if (!config.storage_path) {
    return res.status(400).send('Storage path not configured');
  }
  const filePath = path.join(config.storage_path, yearFolder, monthFolder, type, filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

// Configuration API endpoints
app.get('/api/config/check', (req, res) => {
  const config = getConfig();
  res.json({
    configured: !!config.storage_path,
    storagePath: config.storage_path || null
  });
});

app.post('/api/config', async (req, res) => {
  const { storagePath } = req.body;
  if (!storagePath) {
    return res.status(400).json({ error: 'Storage path is required' });
  }

  try {
    const absolutePath = path.resolve(storagePath);
    // Try to create the directory to verify write permissions
    if (!fs.existsSync(absolutePath)) {
      fs.mkdirSync(absolutePath, { recursive: true });
    }

    // Initialize database in that directory
    await initDatabase(absolutePath);

    // Save config
    saveConfig({ storage_path: absolutePath });
    
    // Trigger initial backup check
    await runBackup();

    res.json({ success: true, storagePath: absolutePath });
  } catch (err) {
    console.error('Error configuring storage path:', err);
    res.status(500).json({ error: 'Invalid or read-only storage path: ' + err.message });
  }
});

// Admin Authentication API endpoints
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const db = await getDB();
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ success: true, username: user.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

app.post('/api/change-password', async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  if (!username || !oldPassword || !newPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const db = await getDB();
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const match = await bcrypt.compare(oldPassword, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid old password' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE users SET password_hash = ? WHERE username = ?', [newHash, username]);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error during password change' });
  }
});

app.post('/api/change-username', async (req, res) => {
  const { currentUsername, newUsername } = req.body;
  if (!currentUsername || !newUsername) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const db = await getDB();
    const user = await db.get('SELECT * FROM users WHERE username = ?', [currentUsername]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.run('UPDATE users SET username = ? WHERE username = ?', [newUsername, currentUsername]);
    res.json({ success: true, message: 'Username changed successfully' });
  } catch (err) {
    console.error('Change username error:', err);
    res.status(500).json({ error: 'Server error during username change' });
  }
});

// File Upload endpoints
app.post('/api/upload/image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }
  const now = new Date();
  const yearFolder = now.getFullYear() + 'folder';
  const monthName = now.toLocaleString('en-US', { month: 'long' }).toLowerCase();
  const monthFolder = monthName + ' folder';
  
  // Return relative path for database storage
  const relativePath = `${yearFolder}/${monthFolder}/images/${req.file.filename}`;
  res.json({ relativePath });
});

app.post('/api/upload/video', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video uploaded' });
  }
  const now = new Date();
  const yearFolder = now.getFullYear() + 'folder';
  const monthName = now.toLocaleString('en-US', { month: 'long' }).toLowerCase();
  const monthFolder = monthName + ' folder';
  
  // Return relative path for database storage
  const relativePath = `${yearFolder}/${monthFolder}/videos/${req.file.filename}`;
  res.json({ relativePath });
});

// Helper: slab interest calculation
function calculateInterestDetails(createdAtStr, principal, monthlyRate) {
  const createdDate = new Date(createdAtStr);
  const now = new Date();
  
  // Calculate exact days passed (minimum 0)
  const diffTime = Math.max(0, now - createdDate);
  const daysPassed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let billableDays;
  if (daysPassed <= 15) {
    billableDays = 15;
  } else if (daysPassed <= 30) {
    billableDays = 30;
  } else {
    billableDays = daysPassed;
  }

  const months = Math.floor(billableDays / 30);
  const days = billableDays % 30;
  
  // Interest = Principal * (Rate / 100) * Months + Principal * (Rate / 100) * (Days / 30)
  const interestAccrued = (principal * (monthlyRate / 100) * months) + (principal * (monthlyRate / 100) * (days / 30));
  const totalPayable = principal + interestAccrued;

  let durationText = '';
  if (daysPassed <= 15) {
    durationText = '15 Days (Min)';
  } else if (daysPassed <= 30) {
    durationText = '1 Month (Min)';
  } else {
    durationText = `${months} Month${months !== 1 ? 's' : ''} ${days} Day${days !== 1 ? 's' : ''}`;
  }

  return {
    daysPassed,
    months,
    days,
    durationText,
    interestAccrued: parseFloat(interestAccrued.toFixed(2)),
    totalPayable: parseFloat(totalPayable.toFixed(2))
  };
}

// Module 1: Active Loans API endpoints
app.post('/api/loans', async (req, res) => {
  const {
    customerName,
    mobileNumber,
    goldWeight,
    itemNames,
    itemImages, // JSON array of relative paths
    loanAmount,
    interestRate,
    remarks
  } = req.body;

  if (!customerName || !mobileNumber || !goldWeight || !itemNames || !loanAmount || !interestRate) {
    return res.status(400).json({ error: 'Required fields are missing' });
  }

  try {
    const db = await getDB();
    
    // Generate Loan ID: MGF-YYYYMMDD-XXXX
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
    
    // Count active and returned loans created today to generate sequential index
    const datePattern = now.toISOString().split('T')[0] + '%';
    const activeCount = await db.get('SELECT COUNT(*) as count FROM active_loans WHERE created_at LIKE ?', [datePattern]);
    const returnedCount = await db.get('SELECT COUNT(*) as count FROM returned_loans WHERE created_at LIKE ?', [datePattern]);
    const nextSeq = (activeCount.count + returnedCount.count + 1).toString().padStart(4, '0');
    const loanId = `MGF-${dateStr}-${nextSeq}`;

    const createdAt = now.toISOString();
    const yearFolder = now.getFullYear() + 'folder';
    const monthName = now.toLocaleString('en-US', { month: 'long' }).toLowerCase();
    const monthFolder = monthName + ' folder';

    await db.run(`
      INSERT INTO active_loans (
        loan_id, created_at, customer_name, mobile_number, gold_weight, 
        item_names, item_images, loan_amount, daily_interest_rate, remarks, 
        year_folder, month_folder
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      loanId,
      createdAt,
      customerName,
      mobileNumber,
      parseFloat(goldWeight),
      itemNames,
      JSON.stringify(itemImages || []),
      parseFloat(loanAmount),
      parseFloat(interestRate),
      remarks || '',
      yearFolder,
      monthFolder
    ]);

    await updateMonthlyExcel(yearFolder, monthFolder);

    res.json({ success: true, loanId });
  } catch (err) {
    console.error('Error creating active loan:', err);
    res.status(500).json({ error: 'Server error during loan creation' });
  }
});

app.get('/api/loans', async (req, res) => {
  const { search } = req.query;

  try {
    const db = await getDB();
    let query = 'SELECT * FROM active_loans';
    let params = [];

    if (search) {
      query += ` WHERE loan_id LIKE ? 
                 OR customer_name LIKE ? 
                 OR mobile_number LIKE ? 
                 OR item_names LIKE ? 
                 OR created_at LIKE ?`;
      const searchParam = `%${search}%`;
      params = [searchParam, searchParam, searchParam, searchParam, searchParam];
    }

    const loans = await db.all(query, params);

    // Calculate interest metrics dynamically for each active loan
    const calculatedLoans = loans.map(loan => {
      const calculation = calculateInterestDetails(loan.created_at, loan.loan_amount, loan.daily_interest_rate);
      return {
        ...loan,
        item_images: JSON.parse(loan.item_images),
        daysPassed: calculation.daysPassed,
        monthsPassed: calculation.months,
        extraDays: calculation.days,
        durationText: calculation.durationText,
        interestAccrued: calculation.interestAccrued,
        totalPayable: calculation.totalPayable
      };
    });

    res.json(calculatedLoans);
  } catch (err) {
    console.error('Error fetching active loans:', err);
    res.status(500).json({ error: 'Server error fetching active loans' });
  }
});

app.delete('/api/loans/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDB();
    const loan = await db.get('SELECT year_folder, month_folder FROM active_loans WHERE loan_id = ?', [id]);
    await db.run('DELETE FROM active_loans WHERE loan_id = ?', [id]);
    if (loan) {
      await updateMonthlyExcel(loan.year_folder, loan.month_folder);
    }
    res.json({ success: true, message: 'Loan deleted successfully' });
  } catch (err) {
    console.error('Error deleting loan:', err);
    res.status(500).json({ error: 'Server error deleting loan' });
  }
});

// Module 2: Returned Loans API endpoints
app.post('/api/loans/:id/return', async (req, res) => {
  const { id } = req.params;
  const { paidStatus, returnVideo, totalInterestCollected, totalAmountPaid } = req.body;

  if (!paidStatus || !returnVideo || totalInterestCollected === undefined || totalAmountPaid === undefined) {
    return res.status(400).json({ error: 'Missing return details' });
  }

  try {
    const db = await getDB();

    // Use transaction to ensure move and delete happen atomically
    await db.run('BEGIN TRANSACTION');

    const loan = await db.get('SELECT * FROM active_loans WHERE loan_id = ?', [id]);
    if (!loan) {
      await db.run('ROLLBACK');
      return res.status(404).json({ error: 'Active loan not found' });
    }

    const returnedAt = new Date().toISOString();

    await db.run(`
      INSERT INTO returned_loans (
        loan_id, created_at, returned_at, customer_name, mobile_number, gold_weight,
        item_names, item_images, loan_amount, daily_interest_rate, remarks,
        return_video, total_interest_collected, total_amount_paid, paid_status,
        year_folder, month_folder
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      loan.loan_id,
      loan.created_at,
      returnedAt,
      loan.customer_name,
      loan.mobile_number,
      loan.gold_weight,
      loan.item_names,
      loan.item_images,
      loan.loan_amount,
      loan.daily_interest_rate,
      loan.remarks,
      returnVideo,
      parseFloat(totalInterestCollected),
      parseFloat(totalAmountPaid),
      paidStatus, // 'Paid' or 'Unpaid'
      loan.year_folder,
      loan.month_folder
    ]);

    await db.run('DELETE FROM active_loans WHERE loan_id = ?', [id]);

    await db.run('COMMIT');

    await updateMonthlyExcel(loan.year_folder, loan.month_folder);

    res.json({ success: true, message: 'Loan returned successfully' });
  } catch (err) {
    console.error('Error returning loan:', err);
    try {
      const db = await getDB();
      await db.run('ROLLBACK');
    } catch (_) {}
    res.status(500).json({ error: 'Server error returning loan' });
  }
});

app.get('/api/returned-loans', async (req, res) => {
  const { search } = req.query;

  try {
    const db = await getDB();
    let query = 'SELECT * FROM returned_loans';
    let params = [];

    if (search) {
      query += ` WHERE loan_id LIKE ? 
                 OR customer_name LIKE ? 
                 OR mobile_number LIKE ? 
                 OR item_names LIKE ? 
                 OR returned_at LIKE ?`;
      const searchParam = `%${search}%`;
      params = [searchParam, searchParam, searchParam, searchParam, searchParam];
    }

    const loans = await db.all(query, params);
    
    const formattedLoans = loans.map(loan => ({
      ...loan,
      item_images: JSON.parse(loan.item_images)
    }));

    res.json(formattedLoans);
  } catch (err) {
    console.error('Error fetching returned loans:', err);
    res.status(500).json({ error: 'Server error fetching returned loans' });
  }
});

// Module 3: External Shop Loans API endpoints
app.post('/api/external-loans', async (req, res) => {
  const {
    originalLoanId,
    externalShopName,
    amountReceived,
    externalInterestRate
  } = req.body;

  if (!originalLoanId || !externalShopName || !amountReceived || !externalInterestRate) {
    return res.status(400).json({ error: 'Required fields are missing' });
  }

  try {
    const db = await getDB();
    
    // Generate External Loan ID: EX-MGF-YYYYMMDD-XXXX
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const count = await db.get('SELECT COUNT(*) as count FROM external_loans WHERE created_at LIKE ?', [now.toISOString().split('T')[0] + '%']);
    const nextSeq = (count.count + 1).toString().padStart(4, '0');
    const externalLoanId = `EX-MGF-${dateStr}-${nextSeq}`;

    await db.run(`
      INSERT INTO external_loans (
        external_loan_id, original_loan_id, created_at, external_shop_name, 
        amount_received, external_interest_rate
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      externalLoanId,
      originalLoanId,
      now.toISOString(),
      externalShopName,
      parseFloat(amountReceived),
      parseFloat(externalInterestRate)
    ]);

    res.json({ success: true, externalLoanId });
  } catch (err) {
    console.error('Error creating external loan:', err);
    res.status(500).json({ error: 'Server error creating external loan' });
  }
});

// Helper for external loan interest calculation (standard days passed logic)
function calculateExternalInterest(createdAtStr, principal, monthlyRate, receivedBack, receivedBackDateStr) {
  const createdDate = new Date(createdAtStr);
  const endDate = receivedBack ? new Date(receivedBackDateStr) : new Date();
  
  const diffTime = Math.max(0, endDate - createdDate);
  const daysPassed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Calculate running interest based on actual days:
  // Interest = Principal * (Rate % / 100) * (Days Passed / 30)
  const interest = principal * (monthlyRate / 100) * (daysPassed / 30);
  const outstanding = principal + interest;

  return {
    daysPassed,
    interest: parseFloat(interest.toFixed(2)),
    outstanding: parseFloat(outstanding.toFixed(2))
  };
}

app.get('/api/external-loans', async (req, res) => {
  const { search } = req.query;

  try {
    const db = await getDB();
    let query = 'SELECT * FROM external_loans';
    let params = [];

    if (search) {
      query += ` WHERE external_loan_id LIKE ? 
                 OR original_loan_id LIKE ? 
                 OR external_shop_name LIKE ? 
                 OR created_at LIKE ?`;
      const searchParam = `%${search}%`;
      params = [searchParam, searchParam, searchParam, searchParam];
    }

    const loans = await db.all(query, params);

    const calculatedLoans = loans.map(loan => {
      const calculation = calculateExternalInterest(
        loan.created_at,
        loan.amount_received,
        loan.external_interest_rate,
        loan.received_back,
        loan.received_back_date
      );
      return {
        ...loan,
        daysPassed: calculation.daysPassed,
        runningInterest: calculation.interest,
        totalOutstanding: calculation.outstanding
      };
    });

    res.json(calculatedLoans);
  } catch (err) {
    console.error('Error fetching external loans:', err);
    res.status(500).json({ error: 'Server error fetching external loans' });
  }
});

app.put('/api/external-loans/:id/receive-back', async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDB();
    const now = new Date().toISOString();
    await db.run(
      'UPDATE external_loans SET received_back = 1, received_back_date = ? WHERE external_loan_id = ?',
      [now, id]
    );
    res.json({ success: true, message: 'External loan received back successfully' });
  } catch (err) {
    console.error('Error receiving back external loan:', err);
    res.status(500).json({ error: 'Server error updates' });
  }
});

// Dashboard Statistics endpoint
app.get('/api/dashboard', async (req, res) => {
  try {
    const db = await getDB();

    const activeCount = await db.get('SELECT COUNT(*) as count FROM active_loans');
    const returnedCount = await db.get('SELECT COUNT(*) as count FROM returned_loans');
    const externalCount = await db.get('SELECT COUNT(*) as count FROM external_loans');
    const activeAmount = await db.get('SELECT SUM(loan_amount) as total FROM active_loans');
    
    // Returned today count
    const todayPattern = new Date().toISOString().split('T')[0] + '%';
    const returnedToday = await db.get('SELECT COUNT(*) as count FROM returned_loans WHERE returned_at LIKE ?', [todayPattern]);

    res.json({
      totalActiveLoans: activeCount.count || 0,
      totalReturnedLoans: returnedCount.count || 0,
      totalExternalLoans: externalCount.count || 0,
      totalActiveAmount: activeAmount.total || 0,
      returnedTodayCount: returnedToday.count || 0
    });
  } catch (err) {
    console.error('Error generating dashboard stats:', err);
    res.status(500).json({ error: 'Server error fetching dashboard metrics' });
  }
});

// Export Excel Endpoint
app.get('/api/export-excel', async (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) {
    return res.status(400).json({ error: 'Year and Month are required' });
  }

  const yearFolder = year + 'folder';
  const monthFolder = month.toLowerCase() + ' folder';

  try {
    const config = getConfig();
    if (!config.storage_path) {
      return res.status(400).json({ error: 'Storage path not configured' });
    }

    // Force update the Excel sheet so it has latest active loans calculations
    await updateMonthlyExcel(yearFolder, monthFolder);

    const excelPath = path.join(config.storage_path, yearFolder, monthFolder, 'records.xlsx');
    if (fs.existsSync(excelPath)) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=loans_record_${year}_${month}.xlsx`);
      res.sendFile(excelPath);
    } else {
      res.status(404).json({ error: 'Excel record not found for the specified period.' });
    }
  } catch (err) {
    console.error('Failed to export Excel:', err);
    res.status(500).json({ error: 'Failed to generate Excel file: ' + err.message });
  }
});

// Manual Backup API endpoint
app.post('/api/backup', async (req, res) => {
  try {
    const config = getConfig();
    if (!config.storage_path) {
      return res.status(400).json({ error: 'Storage path not configured' });
    }
    const dbPath = path.join(config.storage_path, 'ManiGoldFinance.db');
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database file not found' });
    }
    const backupsPath = path.join(config.storage_path, 'backups');
    if (!fs.existsSync(backupsPath)) {
      fs.mkdirSync(backupsPath, { recursive: true });
    }
    const now = new Date();
    const timestamp = now.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
    const backupFile = path.join(backupsPath, `manual_backup_${timestamp}.db`);
    
    fs.copyFileSync(dbPath, backupFile);
    res.json({ success: true, fileName: path.basename(backupFile) });
  } catch (err) {
    console.error('Manual backup error:', err);
    res.status(500).json({ error: 'Failed to create manual backup: ' + err.message });
  }
});

// Start express server
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Try to load DB if storage path is already configured in config.json
  const config = getConfig();
  if (config.storage_path) {
    try {
      await initDatabase(config.storage_path);
      console.log(`Database initialized at: ${config.storage_path}`);
      
      // Check backup on startup
      await runBackup();
      
      // Set daily backup check interval (24 hours)
      setInterval(async () => {
        await runBackup();
      }, 24 * 60 * 60 * 1000);

    } catch (err) {
      console.error('Error initializing database on startup:', err);
    }
  } else {
    console.log('Storage path not configured yet. Server is waiting for configuration...');
  }
});
