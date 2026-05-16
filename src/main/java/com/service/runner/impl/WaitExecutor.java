package com.service.runner.impl;

import com.aft.compact.entity.TestStep;
import com.aft.compact.service.runner.StepExecutor;
import lombok.extern.slf4j.Slf4j;
import org.openqa.selenium.WebDriver;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class WaitExecutor implements StepExecutor {

    @Override
    public String supportedAction() {return "wait";}

    @Override
    public void execute (WebDriver driver, TestStep step) {
        long ms = 1000;
        try {
            if (step.getValue() != null && !step.getValue().isBlank())
                ms = Long.parseLong(step.getValue().trim());
        } catch (NumberFormatException e) {
            log.warn("wait için geçersiz değer: {}", step.getValue());
        }
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Bekleme kesildi.", e);
        }
    }
}
