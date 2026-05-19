package com.service.runner.impl;

import com.entity.TestStep;
import com.service.runner.LocatorResolver;
import com.service.runner.StepExecutor;
import lombok.RequiredArgsConstructor;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.springframework.stereotype.Component;
import java.time.Duration;

@Component
@RequiredArgsConstructor
public class ScrollToExecutor implements StepExecutor {

    private final LocatorResolver locatorResolver;

    @Override
    public String supportedAction() { return "scrollTo"; }

    @Override
    public void execute(WebDriver driver, TestStep step) {
        var el = new WebDriverWait(driver, Duration.ofSeconds(10))
                .until(ExpectedConditions.presenceOfElementLocated(
                        locatorResolver.resolve(step.getLocator())));
        ((JavascriptExecutor) driver)
                .executeScript("arguments[0].scrollIntoView({behavior:'smooth',block:'center'});", el);
    }
}
