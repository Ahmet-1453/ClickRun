package com.service;

import com.aft.compact.entity.TestRun;
import com.aft.compact.repository.TestRunRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DailyReportService {

    private final TestRunRepository testRunRepository;
    private final JavaMailSender    mailSender;

    @Value("${aft.report.admin-email:admin@example.com}")
    private String adminEmail;

    private static final DateTimeFormatter TR =
            DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final DateTimeFormatter TS =
            DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss");

    // Her sabah 08:00
    @Scheduled(cron = "0 0 8 * * ?")
    public void sendDailyReport() {
        LocalDate     yesterday = LocalDate.now().minusDays(1);
        LocalDateTime start     = yesterday.atStartOfDay();
        LocalDateTime end       = yesterday.atTime(23, 59, 59);

        List<TestRun> runs    = testRunRepository.findByRunDateBetween(start, end);
        long total   = runs.size();
        long success = runs.stream().filter(
                r -> Boolean.TRUE.equals(r.getIsSuccess())).count();
        long fail    = total - success;
        double rate  = total > 0 ? (success * 100.0 / total) : 0;

        String subject = String.format(
                "[AFT Compact] %s Tarihli Günlük Rapor — %d/%d Başarılı",
                yesterday.format(TR), success, total);

        String html = buildHtml(yesterday.format(TR),
                total, success, fail, rate);

        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper h = new MimeMessageHelper(msg, true, "UTF-8");
            h.setFrom("noreply@aftcompact.local", "AFT Compact");
            h.setTo(adminEmail);
            h.setSubject(subject);
            h.setText(html, true);
            mailSender.send(msg);
            log.info("[MAIL] Günlük rapor gönderildi → {}", adminEmail);
        } catch (Exception e) {
            log.error("[MAIL] Gönderilemedi: {}", e.getMessage(), e);
        }
    }

    private String buildHtml(String date, long total,
                             long success, long fail, double rate) {
        String rateColor = rate >= 80 ? "#22D3A5"
                : rate >= 50 ? "#FFC542" : "#FF4A6E";
        String rateFmt   = String.format("%.1f", rate);

        return "<!DOCTYPE html><html lang='tr'><head><meta charset='UTF-8'>"
                + "<style>body{font-family:Arial,sans-serif;background:#f8f9fa}"
                + ".box{max-width:560px;margin:0 auto;background:#fff;"
                + "border-radius:8px;overflow:hidden}"
                + ".hd{background:#0B1E3F;color:#fff;padding:20px 28px}"
                + ".hd h1{margin:0;font-size:20px}"
                + ".hd p{margin:4px 0 0;opacity:.7;font-size:12px}"
                + ".bd{padding:24px 28px}"
                + ".grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}"
                + ".card{border-radius:6px;padding:14px;text-align:center}"
                + ".num{font-size:28px;font-weight:700;margin:0}"
                + ".lbl{font-size:11px;opacity:.7;margin-top:4px}"
                + ".bar-bg{background:#e9ecef;border-radius:20px;height:10px;margin:8px 0}"
                + ".bar{height:10px;border-radius:20px;background:" + rateColor + ";"
                + "width:" + rateFmt + "%}"
                + ".ft{background:#f1f3f5;padding:14px 28px;text-align:center;"
                + "font-size:11px;color:#868e96}</style></head><body>"
                + "<div class='box'>"
                + "<div class='hd'><h1>📊 AFT Compact — Günlük Rapor</h1>"
                + "<p>" + date + " tarihine ait özet</p></div>"
                + "<div class='bd'>"
                + "<div class='grid'>"
                + "<div class='card' style='background:#e9ecef'>"
                + "<p class='num'>" + total + "</p><p class='lbl'>Toplam</p></div>"
                + "<div class='card' style='background:#d4edda'>"
                + "<p class='num' style='color:#22D3A5'>" + success
                + "</p><p class='lbl'>✓ Başarılı</p></div>"
                + "<div class='card' style='background:#f8d7da'>"
                + "<p class='num' style='color:#FF4A6E'>" + fail
                + "</p><p class='lbl'>✗ Başarısız</p></div>"
                + "</div>"
                + "<p style='margin:16px 0 4px;font-size:13px'>"
                + "<b>Başarı Oranı:</b> "
                + "<span style='color:" + rateColor + ";font-weight:700'>%"
                + rateFmt + "</span></p>"
                + "<div class='bar-bg'><div class='bar'></div></div>"
                + (fail > 0
                ? "<p style='margin-top:16px;font-size:13px;color:#856404;"
                  + "background:#fff3cd;padding:10px;border-radius:6px'>"
                  + "⚠️ <b>" + fail + " başarısız koşum</b> tespit edildi.</p>"
                : "<p style='margin-top:16px;font-size:13px;color:#155724;"
                  + "background:#d4edda;padding:10px;border-radius:6px'>"
                  + "🎉 Tüm testler başarılı!</p>")
                + "</div>"
                + "</div></div></body></html>";
    }
}