package com.manigold.finance.controller;

import com.manigold.finance.service.ConfigService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.nio.file.Files;

@RestController
@RequestMapping("/api/media")
public class MediaController {

    @Autowired
    private ConfigService configService;

    @GetMapping("/{yearFolder}/{monthFolder}/{type}/{filename}")
    public ResponseEntity<Resource> getMedia(
            @PathVariable("yearFolder") String yearFolder,
            @PathVariable("monthFolder") String monthFolder,
            @PathVariable("type") String type,
            @PathVariable("filename") String filename) {

        String storagePath = configService.getStoragePath();
        if (storagePath == null || storagePath.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        File file = new File(storagePath, yearFolder + File.separator + monthFolder + File.separator + type + File.separator + filename);
        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }

        try {
            Resource resource = new FileSystemResource(file);
            String contentType = Files.probeContentType(file.toPath());
            if (contentType == null) {
                if (filename.endsWith(".webm")) {
                    contentType = "video/webm";
                } else if (filename.endsWith(".mp4")) {
                    contentType = "video/mp4";
                } else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
                    contentType = "image/jpeg";
                } else if (filename.endsWith(".png")) {
                    contentType = "image/png";
                } else {
                    contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
                }
            }

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, contentType)
                    .body(resource);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
