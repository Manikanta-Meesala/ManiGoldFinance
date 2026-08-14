package com.manigold.finance.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.manigold.finance.service.DatabaseService;
import com.manigold.finance.service.ExcelService;
import com.manigold.finance.util.InterestCalculator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.*;

@RestController
@RequestMapping("/api/loans")
public class ActiveLoansController {

    @Autowired
    private DatabaseService databaseService;

    @Autowired
    private ExcelService excelService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping
    public ResponseEntity<Map<String, Object>> createActiveLoan(@RequestBody Map<String, Object> body) {
        String customerName = (String) body.get("customerName");
        String mobileNumber = (String) body.get("mobileNumber");
        Object goldWeightObj = body.get("goldWeight");
        String itemNames = (String) body.get("itemNames");
        Object itemImagesObj = body.get("itemImages");
        Object loanAmountObj = body.get("loanAmount");
        Object interestRateObj = body.get("interestRate");
        String remarks = (String) body.getOrDefault("remarks", "");

        if (customerName == null || mobileNumber == null || goldWeightObj == null ||
                itemNames == null || loanAmountObj == null || interestRateObj == null) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Required fields are missing");
            return ResponseEntity.badRequest().body(err);
        }

        try {
            double goldWeight = Double.parseDouble(goldWeightObj.toString());
            double loanAmount = Double.parseDouble(loanAmountObj.toString());
            double interestRate = Double.parseDouble(interestRateObj.toString());

            String itemImagesJson = "[]";
            if (itemImagesObj instanceof List) {
                itemImagesJson = objectMapper.writeValueAsString(itemImagesObj);
            } else if (itemImagesObj instanceof String) {
                itemImagesJson = (String) itemImagesObj;
            }

            LocalDate today = LocalDate.now();
            String dateStr = today.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
            String datePattern = today.toString() + "%";

            try (Connection conn = databaseService.getConnection()) {
                int activeCount = 0;
                try (PreparedStatement stmt = conn.prepareStatement("SELECT COUNT(*) as count FROM active_loans WHERE created_at LIKE ?")) {
                    stmt.setString(1, datePattern);
                    try (ResultSet rs = stmt.executeQuery()) {
                        if (rs.next()) activeCount = rs.getInt("count");
                    }
                }

                int returnedCount = 0;
                try (PreparedStatement stmt = conn.prepareStatement("SELECT COUNT(*) as count FROM returned_loans WHERE created_at LIKE ?")) {
                    stmt.setString(1, datePattern);
                    try (ResultSet rs = stmt.executeQuery()) {
                        if (rs.next()) returnedCount = rs.getInt("count");
                    }
                }

                int seqNum = activeCount + returnedCount + 1;
                String loanId = String.format("MGF-%s-%04d", dateStr, seqNum);

                String createdAt = Instant.now().toString();
                String yearFolder = today.getYear() + "folder";
                String monthName = today.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH).toLowerCase();
                String monthFolder = monthName + " folder";

                String sql = """
                    INSERT INTO active_loans (
                        loan_id, created_at, customer_name, mobile_number, gold_weight, 
                        item_names, item_images, loan_amount, daily_interest_rate, remarks, 
                        year_folder, month_folder
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;

                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setString(1, loanId);
                    stmt.setString(2, createdAt);
                    stmt.setString(3, customerName);
                    stmt.setString(4, mobileNumber);
                    stmt.setDouble(5, goldWeight);
                    stmt.setString(6, itemNames);
                    stmt.setString(7, itemImagesJson);
                    stmt.setDouble(8, loanAmount);
                    stmt.setDouble(9, interestRate);
                    stmt.setString(10, remarks != null ? remarks : "");
                    stmt.setString(11, yearFolder);
                    stmt.setString(12, monthFolder);
                    stmt.executeUpdate();
                }

                excelService.updateMonthlyExcel(yearFolder, monthFolder);

                Map<String, Object> res = new HashMap<>();
                res.put("success", true);
                res.put("loanId", loanId);
                return ResponseEntity.ok(res);
            }
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Server error during loan creation: " + e.getMessage());
            return ResponseEntity.internalServerError().body(err);
        }
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getActiveLoans(@RequestParam(value = "search", required = false) String search) {
        List<Map<String, Object>> result = new ArrayList<>();

        try (Connection conn = databaseService.getConnection()) {
            String sql = "SELECT * FROM active_loans";
            if (search != null && !search.trim().isEmpty()) {
                sql += " WHERE loan_id LIKE ? OR customer_name LIKE ? OR mobile_number LIKE ? OR item_names LIKE ? OR created_at LIKE ?";
            }

            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                if (search != null && !search.trim().isEmpty()) {
                    String param = "%" + search.trim() + "%";
                    for (int i = 1; i <= 5; i++) {
                        stmt.setString(i, param);
                    }
                }

                try (ResultSet rs = stmt.executeQuery()) {
                    while (rs.next()) {
                        Map<String, Object> loan = new HashMap<>();
                        String loanId = rs.getString("loan_id");
                        String createdAt = rs.getString("created_at");
                        String customerName = rs.getString("customer_name");
                        String mobileNumber = rs.getString("mobile_number");
                        double goldWeight = rs.getDouble("gold_weight");
                        String itemNames = rs.getString("item_names");
                        String itemImagesRaw = rs.getString("item_images");
                        double loanAmount = rs.getDouble("loan_amount");
                        double interestRate = rs.getDouble("daily_interest_rate");
                        String remarks = rs.getString("remarks");
                        String yearFolder = rs.getString("year_folder");
                        String monthFolder = rs.getString("month_folder");

                        loan.put("loan_id", loanId);
                        loan.put("created_at", createdAt);
                        loan.put("customer_name", customerName);
                        loan.put("mobile_number", mobileNumber);
                        loan.put("gold_weight", goldWeight);
                        loan.put("item_names", itemNames);
                        
                        try {
                            List<String> images = objectMapper.readValue(itemImagesRaw, new TypeReference<List<String>>() {});
                            loan.put("item_images", images);
                        } catch (Exception ex) {
                            loan.put("item_images", new ArrayList<>());
                        }

                        loan.put("loan_amount", loanAmount);
                        loan.put("daily_interest_rate", interestRate);
                        loan.put("remarks", remarks);
                        loan.put("year_folder", yearFolder);
                        loan.put("month_folder", monthFolder);

                        InterestCalculator.ActiveInterestResult calc = InterestCalculator.calculateActiveInterest(createdAt, loanAmount, interestRate);
                        loan.put("daysPassed", calc.daysPassed);
                        loan.put("monthsPassed", calc.monthsPassed);
                        loan.put("extraDays", calc.extraDays);
                        loan.put("durationText", calc.durationText);
                        loan.put("interestAccrued", calc.interestAccrued);
                        loan.put("totalPayable", calc.totalPayable);

                        result.add(loan);
                    }
                }
            }

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteActiveLoan(@PathVariable("id") String id) {
        try (Connection conn = databaseService.getConnection()) {
            String yearFolder = null;
            String monthFolder = null;

            try (PreparedStatement stmt = conn.prepareStatement("SELECT year_folder, month_folder FROM active_loans WHERE loan_id = ?")) {
                stmt.setString(1, id);
                try (ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        yearFolder = rs.getString("year_folder");
                        monthFolder = rs.getString("month_folder");
                    }
                }
            }

            try (PreparedStatement stmt = conn.prepareStatement("DELETE FROM active_loans WHERE loan_id = ?")) {
                stmt.setString(1, id);
                stmt.executeUpdate();
            }

            if (yearFolder != null && monthFolder != null) {
                excelService.updateMonthlyExcel(yearFolder, monthFolder);
            }

            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            res.put("message", "Loan deleted successfully");
            return ResponseEntity.ok(res);

        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Server error deleting loan");
            return ResponseEntity.internalServerError().body(err);
        }
    }
}
