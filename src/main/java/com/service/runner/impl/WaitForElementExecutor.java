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

// Kullanım: locator = element, value = timeout saniye (opsiyonel, default 15)
@Component
@RequiredArgsConstructor
public class WaitForElementExecutor implements StepExecutor {

    private final LocatorResolver locatorResolver;

    @Override
    public String supportedAction() { return "waitForElement"; }

    @Override
    public void execute(WebDriver driver, TestStep step) {
        long timeout = 15;
        try {
            if (step.getValue() != null && !step.getValue().isBlank())
                timeout = Long.parseLong(step.getValue().trim());
        } catch (NumberFormatException ignored) {}

        new WebDriverWait(driver, Duration.ofSeconds(timeout))
                .until(ExpectedConditions.visibilityOfElementLocated(
                        locatorResolver.resolve(step.getLocator())));
    }
}