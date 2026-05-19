package com.service.runner.impl;

import com.entity.TestStep;
import com.service.runner.LocatorResolver;
import com.service.runner.StepExecutor;
import lombok.RequiredArgsConstructor;
import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.springframework.stereotype.Component;
import java.time.Duration;

@Component
@RequiredArgsConstructor
public class EnterExecutor implements StepExecutor {

    private final LocatorResolver locatorResolver;

    @Override
    public String supportedAction() { return "enter"; }

    @Override
    public void execute(WebDriver driver, TestStep step) {
        if (step.getLocator() != null && !step.getLocator().isBlank()) {
            new WebDriverWait(driver, Duration.ofSeconds(10))
                    .until(ExpectedConditions.visibilityOfElementLocated(
                            locatorResolver.resolve(step.getLocator())))
                    .sendKeys(Keys.ENTER);
        } else {
            driver.findElement(By.tagName("body")).sendKeys(Keys.ENTER);
        }
    }
}
