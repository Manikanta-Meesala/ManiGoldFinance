package com.manigold.finance.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.manigold.finance.util.InterestCalculator;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileOutputStream;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class ExcelService {

    @Autowired
    private DatabaseService databaseService;

    @Autowired
    private ConfigService configService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("M/d/yyyy, h:mm:ss a")
            .withZone(ZoneId.systemDefault());

    public void updateMonthlyExcel(String yearFolder, String monthFolder) {
        try {
            String storagePath = configService.getStoragePath();
            if (storagePath == null) return;

            try (Connection conn = databaseService.getConnection();
                 Workbook workbook = new XSSFWorkbook()) {

                // Active Loans Sheet
                Sheet activeSheet = workbook.createSheet("Active Loans");
                createActiveLoansSheet(conn, activeSheet, yearFolder, monthFolder);

                // Returned Loans Sheet
                Sheet returnedSheet = workbook.createSheet("Returned Loans");
                createReturnedLoansSheet(conn, returnedSheet, yearFolder, monthFolder);

                // Target directory
                File destDir = new File(storagePath, yearFolder + File.separator + monthFolder);
                if (!destDir.exists()) {
                    destDir.mkdirs();
                }

                File excelFile = new File(destDir, "records.xlsx");
                try (FileOutputStream fos = new FileOutputStream(excelFile)) {
                    workbook.write(fos);
                }
                System.out.println("Excel records updated at: " + excelFile.getAbsolutePath());
            }
        } catch (Exception e) {
            System.err.println("Error generating monthly Excel: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void createActiveLoansSheet(Connection conn, Sheet sheet, String yearFolder, String monthFolder) throws Exception {
        Row headerRow = sheet.createRow(0);
        String[] headers = {
                "Loan ID", "Created At", "Customer Name", "Mobile Number", "Gold Weight (grams)",
                "Item Names", "Item Images (Filenames)", "Principal Amount (INR)", "Interest Rate (per Month)",
                "Days Passed", "Duration", "Interest Accrued (INR)", "Total Payable (INR)", "Remarks"
        };
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
        }

        String sql = "SELECT * FROM active_loans WHERE year_folder = ? AND month_folder = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, yearFolder);
            stmt.setString(2, monthFolder);
            try (ResultSet rs = stmt.executeQuery()) {
                int rowNum = 1;
                while (rs.next()) {
                    Row row = sheet.createRow(rowNum++);

                    String loanId = rs.getString("loan_id");
                    String createdAt = rs.getString("created_at");
                    String customerName = rs.getString("customer_name");
                    String mobileNumber = rs.getString("mobile_number");
                    double goldWeight = rs.getDouble("gold_weight");
                    String itemNames = rs.getString("item_names");
                    String itemImagesRaw = rs.getString("item_images");
                    double loanAmount = rs.getDouble("loan_amount");
                    double rate = rs.getDouble("daily_interest_rate");
                    String remarks = rs.getString("remarks");

                    InterestCalculator.ActiveInterestResult calc = InterestCalculator.calculateActiveInterest(createdAt, loanAmount, rate);

                    String filenames = extractFilenames(itemImagesRaw);
                    String formattedDate = formatDateTime(createdAt);

                    row.createCell(0).setCellValue(loanId != null ? loanId : "");
                    row.createCell(1).setCellValue(formattedDate);
                    row.createCell(2).setCellValue(customerName != null ? customerName : "");
                    row.createCell(3).setCellValue(mobileNumber != null ? mobileNumber : "");
                    row.createCell(4).setCellValue(goldWeight);
                    row.createCell(5).setCellValue(itemNames != null ? itemNames : "");
                    row.createCell(6).setCellValue(filenames);
                    row.createCell(7).setCellValue(loanAmount);
                    row.createCell(8).setCellValue(rate + "%");
                    row.createCell(9).setCellValue(calc.daysPassed);
                    row.createCell(10).setCellValue(calc.durationText);
                    row.createCell(11).setCellValue(calc.interestAccrued);
                    row.createCell(12).setCellValue(calc.totalPayable);
                    row.createCell(13).setCellValue(remarks != null ? remarks : "");
                }
            }
        }
    }

    private void createReturnedLoansSheet(Connection conn, Sheet sheet, String yearFolder, String monthFolder) throws Exception {
        Row headerRow = sheet.createRow(0);
        String[] headers = {
                "Loan ID", "Created At", "Returned At", "Customer Name", "Mobile Number", "Gold Weight (grams)",
                "Item Names", "Item Images (Filenames)", "Return Video (Filename)", "Principal Amount (INR)",
                "Interest Rate (per Month)", "Interest Collected (INR)", "Total Amount Paid (INR)", "Paid Status", "Remarks"
        };
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
        }

        String sql = "SELECT * FROM returned_loans WHERE year_folder = ? AND month_folder = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, yearFolder);
            stmt.setString(2, monthFolder);
            try (ResultSet rs = stmt.executeQuery()) {
                int rowNum = 1;
                while (rs.next()) {
                    Row row = sheet.createRow(rowNum++);

                    String loanId = rs.getString("loan_id");
                    String createdAt = rs.getString("created_at");
                    String returnedAt = rs.getString("returned_at");
                    String customerName = rs.getString("customer_name");
                    String mobileNumber = rs.getString("mobile_number");
                    double goldWeight = rs.getDouble("gold_weight");
                    String itemNames = rs.getString("item_names");
                    String itemImagesRaw = rs.getString("item_images");
                    String returnVideo = rs.getString("return_video");
                    double loanAmount = rs.getDouble("loan_amount");
                    double rate = rs.getDouble("daily_interest_rate");
                    double interestCollected = rs.getDouble("total_interest_collected");
                    double totalPaid = rs.getDouble("total_amount_paid");
                    String paidStatus = rs.getString("paid_status");
                    String remarks = rs.getString("remarks");

                    String filenames = extractFilenames(itemImagesRaw);
                    String videoFilename = returnVideo != null && !returnVideo.isEmpty() ? new File(returnVideo).getName() : "";

                    row.createCell(0).setCellValue(loanId != null ? loanId : "");
                    row.createCell(1).setCellValue(formatDateTime(createdAt));
                    row.createCell(2).setCellValue(formatDateTime(returnedAt));
                    row.createCell(3).setCellValue(customerName != null ? customerName : "");
                    row.createCell(4).setCellValue(mobileNumber != null ? mobileNumber : "");
                    row.createCell(5).setCellValue(goldWeight);
                    row.createCell(6).setCellValue(itemNames != null ? itemNames : "");
                    row.createCell(7).setCellValue(filenames);
                    row.createCell(8).setCellValue(videoFilename);
                    row.createCell(9).setCellValue(loanAmount);
                    row.createCell(10).setCellValue(rate + "%");
                    row.createCell(11).setCellValue(interestCollected);
                    row.createCell(12).setCellValue(totalPaid);
                    row.createCell(13).setCellValue(paidStatus != null ? paidStatus : "");
                    row.createCell(14).setCellValue(remarks != null ? remarks : "");
                }
            }
        }
    }

    private String extractFilenames(String jsonArrayStr) {
        if (jsonArrayStr == null || jsonArrayStr.isEmpty()) return "";
        try {
            List<String> paths = objectMapper.readValue(jsonArrayStr, List.class);
            List<String> names = new ArrayList<>();
            for (String p : paths) {
                names.add(new File(p).getName());
            }
            return String.join(", ", names);
        } catch (Exception e) {
            return jsonArrayStr;
        }
    }

    private String formatDateTime(String isoStr) {
        if (isoStr == null || isoStr.isEmpty()) return "";
        try {
            Instant inst = Instant.parse(isoStr);
            return formatter.format(inst);
        } catch (Exception e) {
            return isoStr;
        }
    }
}
