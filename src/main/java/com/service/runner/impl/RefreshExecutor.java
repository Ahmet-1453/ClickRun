package com.service.runner.impl;

import com.aft.compact.entity.TestStep;
import com.aft.compact.service.runner.StepExecutor;
import org.openqa.selenium.WebDriver;
import org.springframework.stereotype.Component;

@Component
public class RefreshExecutor implements StepExecutor {

    @Override
    public String supportedAction() {return "refresh";}

    @Override
    public void execute(WebDriver driver, TestStep step) {
        driver.navigate().refresh();
    }
}
