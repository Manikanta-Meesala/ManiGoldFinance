package com.manigold.finance.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.manigold.finance.service.DatabaseService;
import com.manigold.finance.service.ExcelService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api")
public class ReturnedLoansController {

    @Autowired
    private DatabaseService databaseService;

    @Autowired
    private ExcelService excelService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping("/loans/{id}/return")
    public ResponseEntity<Map<String, Object>> returnLoan(@PathVariable("id") String id, @RequestBody Map<String, Object> body) {
        String paidStatus = (String) body.get("paidStatus");
        String returnVideo = (String) body.get("returnVideo");
        Object totalInterestObj = body.get("totalInterestCollected");
        Object totalAmountPaidObj = body.get("totalAmountPaid");

        if (paidStatus == null || returnVideo == null || totalInterestObj == null || totalAmountPaidObj == null) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Missing return details");
            return ResponseEntity.badRequest().body(err);
        }

        try {
            double totalInterestCollected = Double.parseDouble(totalInterestObj.toString());
            double totalAmountPaid = Double.parseDouble(totalAmountPaidObj.toString());

            try (Connection conn = databaseService.getConnection()) {
                conn.setAutoCommit(false);
                try {
                    String selectSql = "SELECT * FROM active_loans WHERE loan_id = ?";
                    Map<String, Object> loan = null;
                    try (PreparedStatement stmt = conn.prepareStatement(selectSql)) {
                        stmt.setString(1, id);
                        try (ResultSet rs = stmt.executeQuery()) {
                            if (rs.next()) {
                                loan = new HashMap<>();
                                loan.put("loan_id", rs.getString("loan_id"));
                                loan.put("created_at", rs.getString("created_at"));
                                loan.put("customer_name", rs.getString("customer_name"));
                                loan.put("mobile_number", rs.getString("mobile_number"));
                                loan.put("gold_weight", rs.getDouble("gold_weight"));
                                loan.put("item_names", rs.getString("item_names"));
                                loan.put("item_images", rs.getString("item_images"));
                                loan.put("loan_amount", rs.getDouble("loan_amount"));
                                loan.put("daily_interest_rate", rs.getDouble("daily_interest_rate"));
                                loan.put("remarks", rs.getString("remarks"));
                                loan.put("year_folder", rs.getString("year_folder"));
                                loan.put("month_folder", rs.getString("month_folder"));
                            }
                        }
                    }

                    if (loan == null) {
                        conn.rollback();
                        Map<String, Object> err = new HashMap<>();
                        err.put("error", "Active loan not found");
                        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(err);
                    }

                    String returnedAt = Instant.now().toString();

                    String insertSql = """
                        INSERT INTO returned_loans (
                            loan_id, created_at, returned_at, customer_name, mobile_number, gold_weight,
                            item_names, item_images, loan_amount, daily_interest_rate, remarks,
                            return_video, total_interest_collected, total_amount_paid, paid_status,
                            year_folder, month_folder
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """;

                    try (PreparedStatement stmt = conn.prepareStatement(insertSql)) {
                        stmt.setString(1, (String) loan.get("loan_id"));
                        stmt.setString(2, (String) loan.get("created_at"));
                        stmt.setString(3, returnedAt);
                        stmt.setString(4, (String) loan.get("customer_name"));
                        stmt.setString(5, (String) loan.get("mobile_number"));
                        stmt.setDouble(6, (Double) loan.get("gold_weight"));
                        stmt.setString(7, (String) loan.get("item_names"));
                        stmt.setString(8, (String) loan.get("item_images"));
                        stmt.setDouble(9, (Double) loan.get("loan_amount"));
                        stmt.setDouble(10, (Double) loan.get("daily_interest_rate"));
                        stmt.setString(11, (String) loan.get("remarks"));
                        stmt.setString(12, returnVideo);
                        stmt.setDouble(13, totalInterestCollected);
                        stmt.setDouble(14, totalAmountPaid);
                        stmt.setString(15, paidStatus);
                        stmt.setString(16, (String) loan.get("year_folder"));
                        stmt.setString(17, (String) loan.get("month_folder"));
                        stmt.executeUpdate();
                    }

                    try (PreparedStatement stmt = conn.prepareStatement("DELETE FROM active_loans WHERE loan_id = ?")) {
                        stmt.setString(1, id);
                        stmt.executeUpdate();
                    }

                    conn.commit();

                    excelService.updateMonthlyExcel((String) loan.get("year_folder"), (String) loan.get("month_folder"));

                    Map<String, Object> res = new HashMap<>();
                    res.put("success", true);
                    res.put("message", "Loan returned successfully");
                    return ResponseEntity.ok(res);

                } catch (Exception ex) {
                    conn.rollback();
                    throw ex;
                } finally {
                    conn.setAutoCommit(true);
                }
            }

        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Server error returning loan: " + e.getMessage());
            return ResponseEntity.internalServerError().body(err);
        }
    }

    @GetMapping("/returned-loans")
    public ResponseEntity<List<Map<String, Object>>> getReturnedLoans(@RequestParam(value = "search", required = false) String search) {
        List<Map<String, Object>> result = new ArrayList<>();

        try (Connection conn = databaseService.getConnection()) {
            String sql = "SELECT * FROM returned_loans";
            if (search != null && !search.trim().isEmpty()) {
                sql += " WHERE loan_id LIKE ? OR customer_name LIKE ? OR mobile_number LIKE ? OR item_names LIKE ? OR returned_at LIKE ?";
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
                        loan.put("loan_id", rs.getString("loan_id"));
                        loan.put("created_at", rs.getString("created_at"));
                        loan.put("returned_at", rs.getString("returned_at"));
                        loan.put("customer_name", rs.getString("customer_name"));
                        loan.put("mobile_number", rs.getString("mobile_number"));
                        loan.put("gold_weight", rs.getDouble("gold_weight"));
                        loan.put("item_names", rs.getString("item_names"));
                        
                        String itemImagesRaw = rs.getString("item_images");
                        try {
                            List<String> images = objectMapper.readValue(itemImagesRaw, new TypeReference<List<String>>() {});
                            loan.put("item_images", images);
                        } catch (Exception ex) {
                            loan.put("item_images", new ArrayList<>());
                        }

                        loan.put("loan_amount", rs.getDouble("loan_amount"));
                        loan.put("daily_interest_rate", rs.getDouble("daily_interest_rate"));
                        loan.put("remarks", rs.getString("remarks"));
                        loan.put("return_video", rs.getString("return_video"));
                        loan.put("total_interest_collected", rs.getDouble("total_interest_collected"));
                        loan.put("total_amount_paid", rs.getDouble("total_amount_paid"));
                        loan.put("paid_status", rs.getString("paid_status"));
                        loan.put("year_folder", rs.getString("year_folder"));
                        loan.put("month_folder", rs.getString("month_folder"));

                        result.add(loan);
                    }
                }
            }

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
