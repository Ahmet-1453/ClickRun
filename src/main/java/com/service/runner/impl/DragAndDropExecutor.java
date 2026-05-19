package com.service.runner.impl;

import com.entity.TestStep;
import com.service.runner.LocatorResolver;
import com.service.runner.StepExecutor;
import lombok.RequiredArgsConstructor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.springframework.stereotype.Component;
import java.time.Duration;

@Component
@RequiredArgsConstructor
public class DragAndDropExecutor implements StepExecutor {

    private final LocatorResolver locatorResolver;

    @Override
    public String supportedAction() { return "dragAndDrop"; }

    @Override
    public void execute(WebDriver driver, TestStep step) {
        if (step.getValue() == null || step.getValue().isBlank())
            throw new IllegalArgumentException("dragAndDrop için value alanına hedef locator girilmeli.");

        var wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        var source = wait.until(ExpectedConditions.visibilityOfElementLocated(locatorResolver.resolve(step.getLocator())));
        var target = wait.until(ExpectedConditions.visibilityOfElementLocated(locatorResolver.resolve(step.getValue())));

        new Actions(driver).dragAndDrop(source, target).perform();
    }
}
