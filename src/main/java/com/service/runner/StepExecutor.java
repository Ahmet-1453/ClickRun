package com.service.runner;

import com.aft.compact.entity.TestStep;
import org.openqa.selenium.WebDriver;

// Strategy Pattern sözleşmesi.
// Her aksiyon tipi bu interface'i implemente eder.
public interface StepExecutor {
    String supportedAction();
    void execute(WebDriver driver, TestStep step);
}