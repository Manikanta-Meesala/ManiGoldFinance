package com.manigold.finance.controller;

import com.manigold.finance.service.ConfigService;
import com.manigold.finance.service.DatabaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/config")
public class ConfigController {

    @Autowired
    private ConfigService configService;

    @Autowired
    private DatabaseService databaseService;

    @GetMapping("/check")
    public ResponseEntity<Map<String, Object>> checkConfig() {
        String path = configService.getStoragePath();
        Map<String, Object> response = new HashMap<>();
        response.put("configured", path != null && !path.trim().isEmpty());
        response.put("storagePath", path);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> setConfig(@RequestBody Map<String, String> body) {
        String storagePath = body.get("storagePath");
        if (storagePath == null || storagePath.trim().isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Storage path is required");
            return ResponseEntity.badRequest().body(error);
        }

        try {
            File dir = new File(storagePath).getAbsoluteFile();
            if (!dir.exists()) {
                dir.mkdirs();
            }

            databaseService.initDatabase(dir.getAbsolutePath());
            configService.saveStoragePath(dir.getAbsolutePath());
            databaseService.runBackup();

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("storagePath", dir.getAbsolutePath());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Invalid or read-only storage path: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }
}
