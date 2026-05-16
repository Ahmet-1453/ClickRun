package com.service.runner.impl;

import com.aft.compact.entity.TestStep;
import com.aft.compact.service.runner.StepExecutor;
import lombok.extern.slf4j.Slf4j;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.springframework.stereotype.Component;

import java.util.Base64;

@Component
@Slf4j
public class TakeScreenshotExecutor implements StepExecutor {

    // Thread-safe screenshot aktarımı için ThreadLocal
    public  static  final ThreadLocal<String> LAST_SCREENSHOT = new ThreadLocal<>();

    @Override
    public String supportedAction() { return "takeScreenshot"; }

    @Override
    public void execute(WebDriver driver, TestStep step) {
        try {
            byte[] raw = ((TakesScreenshot) driver).getScreenshotAs(OutputType.BYTES);

            LAST_SCREENSHOT.set(Base64.getEncoder().encodeToString(raw));
            log.info("[SCREENSHOT] Alındı. {} byte", raw.length);
        } catch (Exception e) {
            log.warn("[SCREENSHOT] Alınamadı: {}", e.getMessage());
        }
    }
}
