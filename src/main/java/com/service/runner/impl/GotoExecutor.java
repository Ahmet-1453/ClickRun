package com.service.runner.impl;

import com.entity.TestStep;
import com.service.runner.StepExecutor;
import org.openqa.selenium.WebDriver;
import org.springframework.stereotype.Component;

@Component
public class GotoExecutor implements StepExecutor {

    @Override
    public String supportedAction() { return "goto"; }

    @Override
    public void execute(WebDriver driver, TestStep step) {
        String url = step.getValue();
        if (url == null || url.isBlank())
            throw new IllegalArgumentException("goto için URL zorunludur.");
        driver.get(url.trim());
    }
}