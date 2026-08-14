package com.manigold.finance.controller;

import com.manigold.finance.service.DatabaseService;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class AuthController {

    @Autowired
    private DatabaseService databaseService;

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");

        if (username == null || password == null || username.trim().isEmpty() || password.trim().isEmpty()) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Username and password are required");
            return ResponseEntity.badRequest().body(err);
        }

        try (Connection conn = databaseService.getConnection();
             PreparedStatement stmt = conn.prepareStatement("SELECT * FROM users WHERE username = ?")) {
            stmt.setString(1, username);
            try (ResultSet rs = stmt.executeQuery()) {
                if (!rs.next()) {
                    Map<String, Object> err = new HashMap<>();
                    err.put("error", "Invalid credentials");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
                }
                String hash = rs.getString("password_hash");
                if (!BCrypt.checkpw(password, hash)) {
                    Map<String, Object> err = new HashMap<>();
                    err.put("error", "Invalid credentials");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
                }

                Map<String, Object> res = new HashMap<>();
                res.put("success", true);
                res.put("username", rs.getString("username"));
                return ResponseEntity.ok(res);
            }
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Server error during login");
            return ResponseEntity.internalServerError().body(err);
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String oldPassword = body.get("oldPassword");
        String newPassword = body.get("newPassword");

        if (username == null || oldPassword == null || newPassword == null ||
                username.trim().isEmpty() || oldPassword.trim().isEmpty() || newPassword.trim().isEmpty()) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "All fields are required");
            return ResponseEntity.badRequest().body(err);
        }

        try (Connection conn = databaseService.getConnection();
             PreparedStatement stmt = conn.prepareStatement("SELECT * FROM users WHERE username = ?")) {
            stmt.setString(1, username);
            try (ResultSet rs = stmt.executeQuery()) {
                if (!rs.next()) {
                    Map<String, Object> err = new HashMap<>();
                    err.put("error", "User not found");
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(err);
                }
                String hash = rs.getString("password_hash");
                if (!BCrypt.checkpw(oldPassword, hash)) {
                    Map<String, Object> err = new HashMap<>();
                    err.put("error", "Invalid old password");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
                }

                String newHash = BCrypt.hashpw(newPassword, BCrypt.gensalt(10));
                try (PreparedStatement updateStmt = conn.prepareStatement("UPDATE users SET password_hash = ? WHERE username = ?")) {
                    updateStmt.setString(1, newHash);
                    updateStmt.setString(2, username);
                    updateStmt.executeUpdate();
                }

                Map<String, Object> res = new HashMap<>();
                res.put("success", true);
                res.put("message", "Password changed successfully");
                return ResponseEntity.ok(res);
            }
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Server error during password change");
            return ResponseEntity.internalServerError().body(err);
        }
    }

    @PostMapping("/change-username")
    public ResponseEntity<Map<String, Object>> changeUsername(@RequestBody Map<String, String> body) {
        String currentUsername = body.get("currentUsername");
        String newUsername = body.get("newUsername");

        if (currentUsername == null || newUsername == null ||
                currentUsername.trim().isEmpty() || newUsername.trim().isEmpty()) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "All fields are required");
            return ResponseEntity.badRequest().body(err);
        }

        try (Connection conn = databaseService.getConnection();
             PreparedStatement stmt = conn.prepareStatement("SELECT * FROM users WHERE username = ?")) {
            stmt.setString(1, currentUsername);
            try (ResultSet rs = stmt.executeQuery()) {
                if (!rs.next()) {
                    Map<String, Object> err = new HashMap<>();
                    err.put("error", "User not found");
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(err);
                }

                try (PreparedStatement updateStmt = conn.prepareStatement("UPDATE users SET username = ? WHERE username = ?")) {
                    updateStmt.setString(1, newUsername);
                    updateStmt.setString(2, currentUsername);
                    updateStmt.executeUpdate();
                }

                Map<String, Object> res = new HashMap<>();
                res.put("success", true);
                res.put("message", "Username changed successfully");
                return ResponseEntity.ok(res);
            }
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Server error during username change");
            return ResponseEntity.internalServerError().body(err);
        }
    }
}
