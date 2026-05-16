package com.service;

import com.aft.compact.entity.TestRun;
import com.aft.compact.repository.TestRunRepository;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportExportService {

    private final TestRunRepository testRunRepository;

    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss");

    // ── Excel ─────────────────────────────────────────────────
    public byte[] generateExcel() throws Exception {
        List<TestRun> runs = testRunRepository.findAllByOrderByRunDateDesc();

        try (XSSFWorkbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            XSSFSheet sheet = wb.createSheet("Test Koşumları");

            // Başlık stili
            XSSFCellStyle headerStyle = wb.createCellStyle();
            headerStyle.setFillForegroundColor(
                    new XSSFColor(new byte[]{(byte)11,(byte)30,(byte)63}, null));
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            XSSFFont hFont = wb.createFont();
            hFont.setBold(true);
            hFont.setColor(new XSSFColor(
                    new byte[]{(byte)255,(byte)255,(byte)255}, null));
            hFont.setFontHeightInPoints((short) 11);
            headerStyle.setFont(hFont);

            // Başlığı dondur
            sheet.createFreezePane(0, 1);
            sheet.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(
                    0, 0, 0, 6));

            // Başarılı stili (yeşil)
            XSSFCellStyle okStyle = wb.createCellStyle();
            okStyle.setFillForegroundColor(
                    new XSSFColor(new byte[]{(byte)198,(byte)239,(byte)206}, null));
            okStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            okStyle.setAlignment(HorizontalAlignment.CENTER);

            // Başarısız stili (kırmızı)
            XSSFCellStyle failStyle = wb.createCellStyle();
            failStyle.setFillForegroundColor(
                    new XSSFColor(new byte[]{(byte)255,(byte)199,(byte)206}, null));
            failStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            failStyle.setAlignment(HorizontalAlignment.CENTER);

            // Başlık satırı
            String[] cols = {"ID","Senaryo","Tetikleyen",
                    "Tarih/Saat","Süre (sn)","Sonuç","Hata Özeti"};
            Row header = sheet.createRow(0);
            for (int i = 0; i < cols.length; i++) {
                Cell c = header.createCell(i);
                c.setCellValue(cols[i]);
                c.setCellStyle(headerStyle);
            }

            // Veri satırları
            int rowIdx = 1;
            for (TestRun run : runs) {
                Row row = sheet.createRow(rowIdx++);
                boolean ok = Boolean.TRUE.equals(run.getIsSuccess());
                XSSFCellStyle rowStyle = ok ? okStyle : failStyle;

                setCell(row, 0, String.valueOf(run.getId()),           rowStyle);
                setCell(row, 1, run.getScenario() != null
                        ? run.getScenario().getScenarioName() : "-",              rowStyle);
                setCell(row, 2, run.getTriggeredBy() != null
                        ? run.getTriggeredBy() : "-",                      rowStyle);
                setCell(row, 3, run.getRunDate() != null
                        ? run.getRunDate().format(FMT) : "-",              rowStyle);
                setCell(row, 4, run.getDurationInSeconds() != null
                        ? String.valueOf(run.getDurationInSeconds()) : "0",rowStyle);
                setCell(row, 5, ok ? "✓ BAŞARILI" : "✗ BAŞARISIZ",    rowStyle);
                setCell(row, 6, run.getErrorSummary() != null
                        ? run.getErrorSummary() : "",                      rowStyle);
            }

            // Otomatik sütun genişliği
            for (int i = 0; i < cols.length; i++) sheet.autoSizeColumn(i);
            // Hata özeti kolonu daha geniş
            sheet.setColumnWidth(6, 15000);

            wb.write(out);
            return out.toByteArray();
        }
    }

    private void setCell(Row row, int col, String val, CellStyle style) {
        Cell c = row.createCell(col);
        c.setCellValue(val);
        c.setCellStyle(style);
    }

    // ── PDF ───────────────────────────────────────────────────
    public byte[] generatePdf() throws Exception {
        List<TestRun> runs = testRunRepository.findAllByOrderByRunDateDesc();

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4.rotate());
            PdfWriter.getInstance(doc, out);
            doc.open();

            // Başlık
            Font titleFont = new Font(Font.HELVETICA, 16,
                    Font.BOLD, Color.decode("#0B1E3F"));
            Paragraph title = new Paragraph("AFT Compact — Test Koşum Raporu", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(8f);
            doc.add(title);

            Font subFont = new Font(Font.HELVETICA, 10,
                    Font.NORMAL, Color.GRAY);
            doc.add(new Paragraph(
                    "Toplam: " + runs.size() + "  |  Üretim: "
                            + java.time.LocalDateTime.now().format(FMT), subFont));
            doc.add(new Paragraph(" "));

            // Tablo
            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1f, 3f, 2f, 2.5f, 1.5f, 2f});

            Font hf = new Font(Font.HELVETICA, 9, Font.BOLD, Color.WHITE);
            for (String h : new String[]{"ID","Senaryo","Tetikleyen",
                    "Tarih","Süre","Sonuç"}) {
                PdfPCell cell = new PdfPCell(new Phrase(h, hf));
                cell.setBackgroundColor(Color.decode("#0B1E3F"));
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setPadding(5f);
                table.addCell(cell);
            }

            Font cf = new Font(Font.HELVETICA, 8);
            Color okColor   = Color.decode("#C6EFCE");
            Color failColor = Color.decode("#FFC7CE");

            for (TestRun run : runs) {
                boolean ok = Boolean.TRUE.equals(run.getIsSuccess());
                Color bg = ok ? okColor : failColor;

                addPdfCell(table, String.valueOf(run.getId()),  cf, bg);
                addPdfCell(table, run.getScenario() != null
                        ? run.getScenario().getScenarioName() : "-",       cf, bg);
                addPdfCell(table, run.getTriggeredBy() != null
                        ? run.getTriggeredBy() : "-",               cf, bg);
                addPdfCell(table, run.getRunDate() != null
                        ? run.getRunDate().format(FMT) : "-",       cf, bg);
                addPdfCell(table, run.getDurationInSeconds() != null
                        ? run.getDurationInSeconds() + "sn" : "0",  cf, bg);
                addPdfCell(table, ok ? "BAŞARILI" : "BAŞARISIZ",cf, bg);
            }

            doc.add(table);
            doc.close();
            return out.toByteArray();
        }
    }

    private void addPdfCell(PdfPTable table, String text,
                            Font font, Color bg) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "", font));
        cell.setBackgroundColor(bg);
        cell.setPadding(4f);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        table.addCell(cell);
    }
}