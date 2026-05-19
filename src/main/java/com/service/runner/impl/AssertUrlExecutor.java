package com.service.runner.impl;

import com.entity.TestStep;
import com.service.runner.StepExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.springframework.stereotype.Component;
import java.time.Duration;

// Kullanım: value = beklenen URL (tam veya kısmi içerik)
// Tam eşleşme: "https://..." → URL'nin tam olarak bu olmasını bekler
// Kısmi: "contains:sepet" → URL içinde "sepet" geçmesini bekler
@Component
public class AssertUrlExecutor implements StepExecutor {

    @Override
    public String supportedAction() { return "assertUrl"; }

    @Override
    public void execute(WebDriver driver, TestStep step) {
        String expected = step.getValue();
        if (expected == null || expected.isBlank())
            throw new IllegalArgumentException("assertUrl için value zorunludur.");

        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        if (expected.startsWith("contains:")) {
            String fragment = expected.substring(9).trim();
            wait.until(ExpectedConditions.urlContains(fragment));
        } else {
            wait.until(ExpectedConditions.urlToBe(expected.trim()));
        }

        String actual = driver.getCurrentUrl();
        if (!actual.contains(expected.replace("contains:", "").trim())) {
            throw new AssertionError(
                    "URL doğrulaması başarısız. Beklenen: '"
                            + expected + "' | Gerçek: '" + actual + "'");
        }
    }
}