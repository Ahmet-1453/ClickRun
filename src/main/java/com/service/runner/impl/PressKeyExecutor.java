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
import java.util.Map;

// Kullanım: value = tuş adı (ESCAPE, TAB, F5, ENTER, ARROW_DOWN vb.)
//           locator = opsiyonel (boşsa body'e gönderir)
@Component
@RequiredArgsConstructor
public class PressKeyExecutor implements StepExecutor {

    private final LocatorResolver locatorResolver;

    // Desteklenen tuşlar
    private static final Map<String, Keys> KEY_MAP = Map.ofEntries(
            Map.entry("ESCAPE",      Keys.ESCAPE),
            Map.entry("TAB",         Keys.TAB),
            Map.entry("ENTER",       Keys.ENTER),
            Map.entry("F5",          Keys.F5),
            Map.entry("F1",          Keys.F1),
            Map.entry("F12",         Keys.F12),
            Map.entry("BACKSPACE",   Keys.BACK_SPACE),
            Map.entry("DELETE",      Keys.DELETE),
            Map.entry("ARROW_UP",    Keys.ARROW_UP),
            Map.entry("ARROW_DOWN",  Keys.ARROW_DOWN),
            Map.entry("ARROW_LEFT",  Keys.ARROW_LEFT),
            Map.entry("ARROW_RIGHT", Keys.ARROW_RIGHT),
            Map.entry("PAGE_UP",     Keys.PAGE_UP),
            Map.entry("PAGE_DOWN",   Keys.PAGE_DOWN),
            Map.entry("HOME",        Keys.HOME),
            Map.entry("END",         Keys.END),
            Map.entry("SPACE",       Keys.SPACE)
    );

    @Override
    public String supportedAction() { return "pressKey"; }

    @Override
    public void execute(WebDriver driver, TestStep step) {
        String keyName = step.getValue() != null
                ? step.getValue().trim().toUpperCase() : "ENTER";

        Keys key = KEY_MAP.get(keyName);
        if (key == null)
            throw new IllegalArgumentException(
                    "Desteklenmeyen tuş: '" + keyName
                            + "'. Geçerli tuşlar: " + KEY_MAP.keySet());

        if (step.getLocator() != null && !step.getLocator().isBlank()) {
            new WebDriverWait(driver, Duration.ofSeconds(10))
                    .until(ExpectedConditions.visibilityOfElementLocated(
                            locatorResolver.resolve(step.getLocator())))
                    .sendKeys(key);
        } else {
            driver.findElement(By.tagName("body")).sendKeys(key);
        }
    }
}