package com.service.runner.impl;

import com.aft.compact.entity.TestStep;
import com.aft.compact.service.runner.LocatorResolver;
import com.aft.compact.service.runner.StepExecutor;
import lombok.RequiredArgsConstructor;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.springframework.stereotype.Component;
import java.time.Duration;

// Kullanım: locator = element
// Normal click tutmadığında kullan:
// - Overlay arkasındaki butonlar
// - Lazy-load ile gelen elementler
// - Cookie banner arkasındaki elementler
@Component
@RequiredArgsConstructor
public class JsClickExecutor implements StepExecutor {

    private final LocatorResolver locatorResolver;

    @Override
    public String supportedAction() { return "jsClick"; }

    @Override
    public void execute(WebDriver driver, TestStep step) {
        WebElement el = new WebDriverWait(driver, Duration.ofSeconds(10))
                .until(ExpectedConditions.presenceOfElementLocated(
                        locatorResolver.resolve(step.getLocator())));
        ((JavascriptExecutor) driver)
                .executeScript("arguments[0].click();", el);
    }
}