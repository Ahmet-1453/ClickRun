package com.service.runner.impl;

import com.aft.compact.entity.TestStep;
import com.aft.compact.service.runner.LocatorResolver;
import com.aft.compact.service.runner.StepExecutor;
import lombok.RequiredArgsConstructor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.springframework.stereotype.Component;
import java.time.Duration;

@Component
@RequiredArgsConstructor
public class ClickExecutor implements StepExecutor{

    private final LocatorResolver locatorResolver;

    @Override
    public String supportedAction() {return "click";}

    @Override
    public void execute(WebDriver driver, TestStep step) {
        new WebDriverWait(driver, Duration.ofSeconds(10))
                .until(ExpectedConditions.elementToBeClickable(locatorResolver.resolve(step.getLocator())))
                .click();
    }
}
