package com.controller;

import com.aft.compact.service.ReportExportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Slf4j
public class ReportController {
    private final ReportExportService reportExportService;

    private static final DateTimeFormatter FILE_DATE =
            DateTimeFormatter.ofPattern("yyyyMMdd");

    @GetMapping("/excel")
    public ResponseEntity<byte[]> downloadExcel() {
        try {
            byte[] data = reportExportService.generateExcel();
            String fn = "aft_rapor_" + LocalDate.now().format(FILE_DATE) + ".xlsx";
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + fn + "\"")
                    .contentType(MediaType.parseMediaType(
                            "application/vnd.openxmlformats-officedocument" +
                                    ".spreadsheetml.sheet"))
                    .body(data);
        } catch (Exception e) {
            log.error("[REPORT] Excel hatası: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/pdf")
    public ResponseEntity<byte[]> downloadPdf() {
        try {
            byte[] data = reportExportService.generatePdf();
            String fn = "aft_rapor_" + LocalDate.now().format(FILE_DATE) + ".pdf";
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + fn + "\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(data);
        } catch (Exception e) {
            log.error("[REPORT] PDF hatası: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
