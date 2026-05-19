package com.service.runner.impl;

import com.entity.TestStep;
import com.service.runner.StepExecutor;
import lombok.extern.slf4j.Slf4j;
import org.openqa.selenium.NoAlertPresentException;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.springframework.stereotype.Component;
import java.time.Duration;

// Kullanım:
//   value = "accept"  (default) → OK / Onayla
//   value = "dismiss"           → İptal
//   value = "text:Beklenen"     → Alert metnini doğrula ve onayla
@Component
@Slf4j
public class AcceptAlertExecutor implements StepExecutor {

    @Override
    public String supportedAction() { return "acceptAlert"; }

    @Override
    public void execute(WebDriver driver, TestStep step) {
        try {
            new WebDriverWait(driver, Duration.ofSeconds(10))
                    .until(ExpectedConditions.alertIsPresent());

            var alert = driver.switchTo().alert();
            String val = step.getValue() != null
                    ? step.getValue().trim() : "accept";

            if (val.startsWith("text:")) {
                String expected = val.substring(5).trim();
                String actual   = alert.getText();
                log.info("[ALERT] Metin: '{}'", actual);
                if (!actual.contains(expected))
                    throw new AssertionError(
                            "Alert metni beklenen: '" + expected
                                    + "' | bulunan: '" + actual + "'");
                alert.accept();
            } else if ("dismiss".equalsIgnoreCase(val)) {
                alert.dismiss();
            } else {
                alert.accept();
            }

        } catch (NoAlertPresentException e) {
            log.warn("[ALERT] Alert bulunamadı, adım atlandı.");
        }
    }
}