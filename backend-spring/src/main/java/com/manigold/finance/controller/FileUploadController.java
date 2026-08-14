package com.manigold.finance.controller;

import com.manigold.finance.service.ConfigService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Random;

@RestController
@RequestMapping("/api/upload")
public class FileUploadController {

    @Autowired
    private ConfigService configService;

    private final Random random = new Random();

    @PostMapping("/image")
    public ResponseEntity<Map<String, Object>> uploadImage(@RequestParam("image") MultipartFile file) {
        return processUpload(file, "images", ".jpg");
    }

    @PostMapping("/video")
    public ResponseEntity<Map<String, Object>> uploadVideo(@RequestParam("video") MultipartFile file) {
        return processUpload(file, "videos", ".webm");
    }

    private ResponseEntity<Map<String, Object>> processUpload(MultipartFile file, String subDir, String defaultExt) {
        String storagePath = configService.getStoragePath();
        if (storagePath == null || storagePath.trim().isEmpty()) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Storage path not configured");
            return ResponseEntity.badRequest().body(err);
        }

        if (file == null || file.isEmpty()) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "No file uploaded");
            return ResponseEntity.badRequest().body(err);
        }

        try {
            LocalDate now = LocalDate.now();
            String yearFolder = now.getYear() + "folder";
            String monthName = now.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH).toLowerCase();
            String monthFolder = monthName + " folder";

            File destDir = new File(storagePath, yearFolder + File.separator + monthFolder + File.separator + subDir);
            if (!destDir.exists()) {
                destDir.mkdirs();
            }

            String originalName = file.getOriginalFilename();
            String ext = defaultExt;
            if (originalName != null && originalName.contains(".")) {
                ext = originalName.substring(originalName.lastIndexOf("."));
            }

            String prefix = subDir.equals("videos") ? "video" : "image";
            long timestamp = System.currentTimeMillis();
            int randVal = Math.abs(random.nextInt(900000000)) + 100000000;
            String filename = String.format("%s-%d-%d%s", prefix, timestamp, randVal, ext);

            File targetFile = new File(destDir, filename);
            file.transferTo(targetFile);

            String relativePath = String.format("%s/%s/%s/%s", yearFolder, monthFolder, subDir, filename);
            Map<String, Object> res = new HashMap<>();
            res.put("relativePath", relativePath);
            return ResponseEntity.ok(res);

        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Failed to upload file: " + e.getMessage());
            return ResponseEntity.internalServerError().body(err);
        }
    }
}
