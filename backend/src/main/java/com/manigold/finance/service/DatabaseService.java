package com.manigold.finance.service;

import org.mindrot.jbcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.sql.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DatabaseService {

    @Autowired
    private ConfigService configService;

    @PostConstruct
    public void initOnStartup() {
        String path = configService.getStoragePath();
        if (path != null && !path.trim().isEmpty()) {
            try {
                initDatabase(path);
                runBackup();
                System.out.println("SQLite Database initialized on startup at: " + path);
            } catch (Exception e) {
                System.err.println("Failed to initialize database on startup: " + e.getMessage());
            }
        }
    }

    public synchronized Connection getConnection() throws SQLException {
        String storagePath = configService.getStoragePath();
        if (storagePath == null || storagePath.trim().isEmpty()) {
            throw idleConfigException();
        }
        File dbDir = new File(storagePath);
        if (!dbDir.exists()) {
            dbDir.mkdirs();
        }
        File dbFile = new File(dbDir, "ManiGoldFinance.db");
        String url = "jdbc:sqlite:" + dbFile.getAbsolutePath();
        return DriverManager.getConnection(url);
    }

    private IllegalStateException idleConfigException() {
        return new IllegalStateException("Storage path not configured");
    }

    public synchronized void initDatabase(String storagePath) throws SQLException {
        File dir = new File(storagePath);
        if (!dir.exists()) {
            dir.mkdirs();
        }

        File backupsDir = new File(dir, "backups");
        if (!backupsDir.exists()) {
            backupsDir.mkdirs();
        }

        File dbFile = new File(dir, "ManiGoldFinance.db");
        String url = "jdbc:sqlite:" + dbFile.getAbsolutePath();

        try (Connection conn = DriverManager.getConnection(url);
             Statement stmt = conn.createStatement()) {

            stmt.execute("""
                CREATE TABLE IF NOT EXISTS users (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT UNIQUE NOT NULL,
                  password_hash TEXT NOT NULL
                );
            """);

            stmt.execute("""
                CREATE TABLE IF NOT EXISTS active_loans (
                  loan_id TEXT PRIMARY KEY,
                  created_at TEXT NOT NULL,
                  customer_name TEXT NOT NULL,
                  mobile_number TEXT NOT NULL,
                  gold_weight REAL NOT NULL,
                  item_names TEXT NOT NULL,
                  item_images TEXT NOT NULL,
                  loan_amount REAL NOT NULL,
                  daily_interest_rate REAL NOT NULL,
                  remarks TEXT,
                  year_folder TEXT NOT NULL,
                  month_folder TEXT NOT NULL
                );
            """);

            stmt.execute("""
                CREATE TABLE IF NOT EXISTS returned_loans (
                  loan_id TEXT PRIMARY KEY,
                  created_at TEXT NOT NULL,
                  returned_at TEXT NOT NULL,
                  customer_name TEXT NOT NULL,
                  mobile_number TEXT NOT NULL,
                  gold_weight REAL NOT NULL,
                  item_names TEXT NOT NULL,
                  item_images TEXT NOT NULL,
                  loan_amount REAL NOT NULL,
                  daily_interest_rate REAL NOT NULL,
                  remarks TEXT,
                  return_video TEXT NOT NULL,
                  total_interest_collected REAL NOT NULL,
                  total_amount_paid REAL NOT NULL,
                  paid_status TEXT NOT NULL,
                  year_folder TEXT NOT NULL,
                  month_folder TEXT NOT NULL
                );
            """);

            stmt.execute("""
                CREATE TABLE IF NOT EXISTS external_loans (
                  external_loan_id TEXT PRIMARY KEY,
                  original_loan_id TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  external_shop_name TEXT NOT NULL,
                  amount_received REAL NOT NULL,
                  external_interest_rate REAL NOT NULL,
                  received_back INTEGER DEFAULT 0,
                  received_back_date TEXT
                );
            """);

            // Create admin user if not exists
            try (PreparedStatement checkStmt = conn.prepareStatement("SELECT * FROM users WHERE username = ?")) {
                checkStmt.setString(1, "admin");
                try (ResultSet rs = checkStmt.executeQuery()) {
                    if (!rs.next()) {
                        String hash = BCrypt.hashpw("admin123", BCrypt.gensalt(10));
                        try (PreparedStatement insertStmt = conn.prepareStatement("INSERT INTO users (username, password_hash) VALUES (?, ?)")) {
                            insertStmt.setString(1, "admin");
                            insertStmt.setString(2, hash);
                            insertStmt.executeUpdate();
                            System.out.println("Default admin user created.");
                        }
                    }
                }
            }
        }
    }

    @Scheduled(fixedRate = 24 * 60 * 60 * 1000)
    public void scheduledBackup() {
        runBackup();
    }

    public synchronized String runBackup() {
        try {
            String storagePath = configService.getStoragePath();
            if (storagePath == null) return null;

            File dbFile = new File(storagePath, "ManiGoldFinance.db");
            if (!dbFile.exists()) return null;

            File backupsDir = new File(storagePath, "backups");
            if (!backupsDir.exists()) {
                backupsDir.mkdirs();
            }

            String dateStr = LocalDate.now().toString(); // YYYY-MM-DD
            File backupFile = new File(backupsDir, "backup_" + dateStr + ".db");

            if (!backupFile.exists()) {
                Files.copy(dbFile.toPath(), backupFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
                System.out.println("Auto-backup completed: " + backupFile.getAbsolutePath());
                return backupFile.getAbsolutePath();
            }
        } catch (Exception e) {
            System.err.println("Failed to run backup: " + e.getMessage());
        }
        return null;
    }

    public synchronized String runManualBackup() throws IOException {
        String storagePath = configService.getStoragePath();
        if (storagePath == null) {
            throw new IllegalStateException("Storage path not configured");
        }
        File dbFile = new File(storagePath, "ManiGoldFinance.db");
        if (!dbFile.exists()) {
            throw new IllegalStateException("Database file not found");
        }
        File backupsDir = new File(storagePath, "backups");
        if (!backupsDir.exists()) {
            backupsDir.mkdirs();
        }
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss"));
        File backupFile = new File(backupsDir, "manual_backup_" + timestamp + ".db");
        Files.copy(dbFile.toPath(), backupFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
        return backupFile.getName();
    }
}
