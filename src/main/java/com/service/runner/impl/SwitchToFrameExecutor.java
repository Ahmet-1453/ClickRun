package com.service.runner.impl;

import com.entity.TestStep;
import com.service.runner.LocatorResolver;
import com.service.runner.StepExecutor;
import lombok.RequiredArgsConstructor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.springframework.stereotype.Component;
import java.time.Duration;

// Kullanım:
//   locator = frame locator   → o frame'e geç
//   value = "default"         → ana sayfaya dön
//   value = "parent"          → bir üst frame'e çık
// Banka 3D sayfası, iyzico, PayTR ödeme formları için zorunlu
@Component
@RequiredArgsConstructor
public class SwitchToFrameExecutor implements StepExecutor {

    private final LocatorResolver locatorResolver;

    @Override
    public String supportedAction() { return "switchToFrame"; }

    @Override
    public void execute(WebDriver driver, TestStep step) {
        String val = step.getValue() != null
                ? step.getValue().trim() : "";

        if ("default".equalsIgnoreCase(val)) {
            driver.switchTo().defaultContent();
            return;
        }
        if ("parent".equalsIgnoreCase(val)) {
            driver.switchTo().parentFrame();
            return;
        }

        // Frame'e locator ile geç
        var frameEl = new WebDriverWait(driver, Duration.ofSeconds(10))
                .until(ExpectedConditions.presenceOfElementLocated(
                        locatorResolver.resolve(step.getLocator())));
        driver.switchTo().frame(frameEl);
    }
}