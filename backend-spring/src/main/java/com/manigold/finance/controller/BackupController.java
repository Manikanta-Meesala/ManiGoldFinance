package com.manigold.finance.controller;

import com.manigold.finance.service.DatabaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/backup")
public class BackupController {

    @Autowired
    private DatabaseService databaseService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> manualBackup() {
        try {
            String fileName = databaseService.runManualBackup();
            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            res.put("fileName", fileName);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Failed to create manual backup: " + e.getMessage());
            return ResponseEntity.internalServerError().body(err);
        }
    }
}
