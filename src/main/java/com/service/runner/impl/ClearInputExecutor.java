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

// Kullanım: locator = temizlenecek input
@Component
@RequiredArgsConstructor
public class ClearInputExecutor implements StepExecutor {

    private final LocatorResolver locatorResolver;

    @Override
    public String supportedAction() { return "clearInput"; }

    @Override
    public void execute(WebDriver driver, TestStep step) {
        new WebDriverWait(driver, Duration.ofSeconds(10))
                .until(ExpectedConditions.visibilityOfElementLocated(
                        locatorResolver.resolve(step.getLocator())))
                .clear();
    }
}