package com.manigold.finance.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.HashMap;
import java.util.Map;

@Service
public class ConfigService {

    private static final String CONFIG_FILE_NAME = "config.json";
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String getStoragePath() {
        File file = new File(CONFIG_FILE_NAME);
        if (file.exists()) {
            try {
                Map<?, ?> map = objectMapper.readValue(file, Map.class);
                Object path = map.get("storage_path");
                if (path != null && !path.toString().trim().isEmpty()) {
                    return path.toString().trim();
                }
            } catch (Exception e) {
                System.err.println("Error reading config.json: " + e.getMessage());
            }
        }
        return null;
    }

    public boolean saveStoragePath(String storagePath) {
        try {
            File file = new File(CONFIG_FILE_NAME);
            Map<String, String> map = new HashMap<>();
            map.put("storage_path", storagePath);
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(file, map);
            return true;
        } catch (Exception e) {
            System.err.println("Error writing config.json: " + e.getMessage());
            return false;
        }
    }
}
