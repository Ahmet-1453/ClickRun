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

// Kullanım: locator = spinner/loading element, value = timeout sn (default 30)
// Banka 3D sayfası, HBYS kayıt spinner'ı, e-ticaret ürün yükleme
@Component
@RequiredArgsConstructor
public class WaitForElementDisappearExecutor implements StepExecutor {

    private final LocatorResolver locatorResolver;

    @Override
    public String supportedAction() { return "waitForElementDisappear"; }

    @Override
    public void execute(WebDriver driver, TestStep step) {
        long timeout = 30;
        try {
            if (step.getValue() != null && !step.getValue().isBlank())
                timeout = Long.parseLong(step.getValue().trim());
        } catch (NumberFormatException ignored) {}

        new WebDriverWait(driver, Duration.ofSeconds(timeout))
                .until(ExpectedConditions.invisibilityOfElementLocated(
                        locatorResolver.resolve(step.getLocator())));
    }
}