package com.manigold.finance.controller;

import com.manigold.finance.service.DatabaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private DatabaseService databaseService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();

        try (Connection conn = databaseService.getConnection()) {
            // totalActiveLoans
            long activeCount = 0;
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery("SELECT COUNT(*) as count FROM active_loans")) {
                if (rs.next()) activeCount = rs.getLong("count");
            }

            // totalReturnedLoans
            long returnedCount = 0;
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery("SELECT COUNT(*) as count FROM returned_loans")) {
                if (rs.next()) returnedCount = rs.getLong("count");
            }

            // totalExternalLoans
            long externalCount = 0;
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery("SELECT COUNT(*) as count FROM external_loans")) {
                if (rs.next()) externalCount = rs.getLong("count");
            }

            // totalActiveAmount
            double activeAmount = 0.0;
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery("SELECT SUM(loan_amount) as total FROM active_loans")) {
                if (rs.next()) activeAmount = rs.getDouble("total");
            }

            // returnedTodayCount
            String todayPattern = LocalDate.now().toString() + "%";
            long returnedToday = 0;
            try (PreparedStatement stmt = conn.prepareStatement("SELECT COUNT(*) as count FROM returned_loans WHERE returned_at LIKE ?")) {
                stmt.setString(1, todayPattern);
                try (ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) returnedToday = rs.getLong("count");
                }
            }

            stats.put("totalActiveLoans", activeCount);
            stats.put("totalReturnedLoans", returnedCount);
            stats.put("totalExternalLoans", externalCount);
            stats.put("totalActiveAmount", activeAmount);
            stats.put("returnedTodayCount", returnedToday);

            return ResponseEntity.ok(stats);

        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Server error fetching dashboard metrics");
            return ResponseEntity.internalServerError().body(err);
        }
    }
}
