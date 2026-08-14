const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const { getDB } = require('./database');
const { getConfig } = require('./config');

// Helper: slab interest calculation matching server.js
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
  
  // Interest calculation: Principal * (Rate / 100) * Months + Principal * (Rate / 100) * (Days / 30)
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
    durationText,
    interestAccrued: parseFloat(interestAccrued.toFixed(2)),
    totalPayable: parseFloat(totalPayable.toFixed(2))
  };
}

async function updateMonthlyExcel(yearFolder, monthFolder) {
  try {
    const config = getConfig();
    if (!config.storage_path) return;

    const db = await getDB();
    
    // Get Active Loans
    const activeLoans = await db.all(
      'SELECT * FROM active_loans WHERE year_folder = ? AND month_folder = ?',
      [yearFolder, monthFolder]
    );

    // Get Returned Loans
    const returnedLoans = await db.all(
      'SELECT * FROM returned_loans WHERE year_folder = ? AND month_folder = ?',
      [yearFolder, monthFolder]
    );

    // Prepare workbook
    const wb = xlsx.utils.book_new();

    // Map Active Loans
    const activeData = activeLoans.map(loan => {
      const calc = calculateInterestDetails(loan.created_at, loan.loan_amount, loan.daily_interest_rate);
      let images = '';
      try {
        images = JSON.parse(loan.item_images).map(img => img.split('/').pop()).join(', ');
      } catch (e) {
        images = loan.item_images;
      }

      return {
        'Loan ID': loan.loan_id,
        'Created At': new Date(loan.created_at).toLocaleString(),
        'Customer Name': loan.customer_name,
        'Mobile Number': loan.mobile_number,
        'Gold Weight (grams)': loan.gold_weight,
        'Item Names': loan.item_names,
        'Item Images (Filenames)': images,
        'Principal Amount (INR)': loan.loan_amount,
        'Interest Rate (per Month)': loan.daily_interest_rate + '%',
        'Days Passed': calc.daysPassed,
        'Duration': calc.durationText,
        'Interest Accrued (INR)': calc.interestAccrued,
        'Total Payable (INR)': calc.totalPayable,
        'Remarks': loan.remarks || ''
      };
    });

    // Map Returned Loans
    const returnedData = returnedLoans.map(loan => {
      let images = '';
      try {
        images = JSON.parse(loan.item_images).map(img => img.split('/').pop()).join(', ');
      } catch (e) {
        images = loan.item_images;
      }

      return {
        'Loan ID': loan.loan_id,
        'Created At': new Date(loan.created_at).toLocaleString(),
        'Returned At': new Date(loan.returned_at).toLocaleString(),
        'Customer Name': loan.customer_name,
        'Mobile Number': loan.mobile_number,
        'Gold Weight (grams)': loan.gold_weight,
        'Item Names': loan.item_names,
        'Item Images (Filenames)': images,
        'Return Video (Filename)': loan.return_video ? loan.return_video.split('/').pop() : '',
        'Principal Amount (INR)': loan.loan_amount,
        'Interest Rate (per Month)': loan.daily_interest_rate + '%',
        'Interest Collected (INR)': loan.total_interest_collected,
        'Total Amount Paid (INR)': loan.total_amount_paid,
        'Paid Status': loan.paid_status,
        'Remarks': loan.remarks || ''
      };
    });

    // Create sheets
    const wsActive = xlsx.utils.json_to_sheet(activeData);
    const wsReturned = xlsx.utils.json_to_sheet(returnedData);

    xlsx.utils.book_append_sheet(wb, wsActive, 'Active Loans');
    xlsx.utils.book_append_sheet(wb, wsReturned, 'Returned Loans');

    // Make sure folder exists
    const destDir = path.join(config.storage_path, yearFolder, monthFolder);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const excelPath = path.join(destDir, 'records.xlsx');
    xlsx.writeFile(wb, excelPath);
    console.log(`Excel records updated for ${yearFolder}/${monthFolder} at ${excelPath}`);
  } catch (err) {
    console.error('Error generating monthly Excel:', err);
  }
}

module.exports = {
  updateMonthlyExcel,
  calculateInterestDetails
};
