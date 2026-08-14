package com.manigold.finance.controller;

import com.manigold.finance.service.ConfigService;
import com.manigold.finance.service.ExcelService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/export-excel")
public class ExportExcelController {

    @Autowired
    private ConfigService configService;

    @Autowired
    private ExcelService excelService;

    @GetMapping
    public ResponseEntity<?> exportExcel(
            @RequestParam(value = "year", required = false) String year,
            @RequestParam(value = "month", required = false) String month) {

        if (year == null || month == null || year.trim().isEmpty() || month.trim().isEmpty()) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Year and Month are required");
            return ResponseEntity.badRequest().body(err);
        }

        String yearFolder = year.trim() + "folder";
        String monthFolder = month.trim().toLowerCase() + " folder";

        try {
            String storagePath = configService.getStoragePath();
            if (storagePath == null || storagePath.trim().isEmpty()) {
                Map<String, Object> err = new HashMap<>();
                err.put("error", "Storage path not configured");
                return ResponseEntity.badRequest().body(err);
            }

            excelService.updateMonthlyExcel(yearFolder, monthFolder);

            File excelFile = new File(storagePath, yearFolder + File.separator + monthFolder + File.separator + "records.xlsx");
            if (!excelFile.exists()) {
                Map<String, Object> err = new HashMap<>();
                err.put("error", "Excel record not found for the specified period.");
                return ResponseEntity.status(404).body(err);
            }

            Resource resource = new FileSystemResource(excelFile);
            String downloadFilename = String.format("loans_record_%s_%s.xlsx", year, month);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + downloadFilename + "\"")
                    .body(resource);

        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Failed to generate Excel file: " + e.getMessage());
            return ResponseEntity.internalServerError().body(err);
        }
    }
}
