package com.manigold.finance.controller;

import com.manigold.finance.service.DatabaseService;
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
import java.util.*;

@RestController
@RequestMapping("/api/external-loans")
public class ExternalLoansController {

    @Autowired
    private DatabaseService databaseService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> createExternalLoan(@RequestBody Map<String, Object> body) {
        String originalLoanId = (String) body.get("originalLoanId");
        String externalShopName = (String) body.get("externalShopName");
        Object amountReceivedObj = body.get("amountReceived");
        Object externalInterestRateObj = body.get("externalInterestRate");

        if (originalLoanId == null || externalShopName == null || amountReceivedObj == null || externalInterestRateObj == null) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Required fields are missing");
            return ResponseEntity.badRequest().body(err);
        }

        try {
            double amountReceived = Double.parseDouble(amountReceivedObj.toString());
            double externalInterestRate = Double.parseDouble(externalInterestRateObj.toString());

            LocalDate today = LocalDate.now();
            String dateStr = today.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
            String datePattern = today.toString() + "%";

            try (Connection conn = databaseService.getConnection()) {
                int count = 0;
                try (PreparedStatement stmt = conn.prepareStatement("SELECT COUNT(*) as count FROM external_loans WHERE created_at LIKE ?")) {
                    stmt.setString(1, datePattern);
                    try (ResultSet rs = stmt.executeQuery()) {
                        if (rs.next()) count = rs.getInt("count");
                    }
                }

                int seqNum = count + 1;
                String externalLoanId = String.format("EX-MGF-%s-%04d", dateStr, seqNum);
                String createdAt = Instant.now().toString();

                String sql = """
                    INSERT INTO external_loans (
                        external_loan_id, original_loan_id, created_at, external_shop_name, 
                        amount_received, external_interest_rate
                    ) VALUES (?, ?, ?, ?, ?, ?)
                """;

                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setString(1, externalLoanId);
                    stmt.setString(2, originalLoanId);
                    stmt.setString(3, createdAt);
                    stmt.setString(4, externalShopName);
                    stmt.setDouble(5, amountReceived);
                    stmt.setDouble(6, externalInterestRate);
                    stmt.executeUpdate();
                }

                Map<String, Object> res = new HashMap<>();
                res.put("success", true);
                res.put("externalLoanId", externalLoanId);
                return ResponseEntity.ok(res);
            }
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Server error creating external loan: " + e.getMessage());
            return ResponseEntity.internalServerError().body(err);
        }
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getExternalLoans(@RequestParam(value = "search", required = false) String search) {
        List<Map<String, Object>> result = new ArrayList<>();

        try (Connection conn = databaseService.getConnection()) {
            String sql = "SELECT * FROM external_loans";
            if (search != null && !search.trim().isEmpty()) {
                sql += " WHERE external_loan_id LIKE ? OR original_loan_id LIKE ? OR external_shop_name LIKE ? OR created_at LIKE ?";
            }

            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                if (search != null && !search.trim().isEmpty()) {
                    String param = "%" + search.trim() + "%";
                    for (int i = 1; i <= 4; i++) {
                        stmt.setString(i, param);
                    }
                }

                try (ResultSet rs = stmt.executeQuery()) {
                    while (rs.next()) {
                        Map<String, Object> loan = new HashMap<>();
                        String externalLoanId = rs.getString("external_loan_id");
                        String originalLoanId = rs.getString("original_loan_id");
                        String createdAt = rs.getString("created_at");
                        String externalShopName = rs.getString("external_shop_name");
                        double amountReceived = rs.getDouble("amount_received");
                        double externalInterestRate = rs.getDouble("external_interest_rate");
                        int receivedBack = rs.getInt("received_back");
                        String receivedBackDate = rs.getString("received_back_date");

                        loan.put("external_loan_id", externalLoanId);
                        loan.put("original_loan_id", originalLoanId);
                        loan.put("created_at", createdAt);
                        loan.put("external_shop_name", externalShopName);
                        loan.put("amount_received", amountReceived);
                        loan.put("external_interest_rate", externalInterestRate);
                        loan.put("received_back", receivedBack);
                        loan.put("received_back_date", receivedBackDate);

                        InterestCalculator.ExternalInterestResult calc = InterestCalculator.calculateExternalInterest(
                                createdAt, amountReceived, externalInterestRate, receivedBack == 1, receivedBackDate
                        );

                        loan.put("daysPassed", calc.daysPassed);
                        loan.put("runningInterest", calc.runningInterest);
                        loan.put("totalOutstanding", calc.totalOutstanding);

                        result.add(loan);
                    }
                }
            }

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PutMapping("/{id}/receive-back")
    public ResponseEntity<Map<String, Object>> receiveBackExternalLoan(@PathVariable("id") String id) {
        try (Connection conn = databaseService.getConnection();
             PreparedStatement stmt = conn.prepareStatement("UPDATE external_loans SET received_back = 1, received_back_date = ? WHERE external_loan_id = ?")) {
            stmt.setString(1, Instant.now().toString());
            stmt.setString(2, id);
            stmt.executeUpdate();

            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            res.put("message", "External loan received back successfully");
            return ResponseEntity.ok(res);

        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Server error updates");
            return ResponseEntity.internalServerError().body(err);
        }
    }
}
