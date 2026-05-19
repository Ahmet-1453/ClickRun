package com.service.runner.impl;

import com.entity.TestStep;
import com.service.runner.LocatorResolver;
import com.service.runner.StepExecutor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.springframework.stereotype.Component;
import java.time.Duration;

// Kullanım: locator = element, value = "attribute:beklenenDeger"
// Örnekler:
//   value = "innerText:Stokta Var"   → text içeriği doğrula
//   value = "value:1000"             → input value doğrula
//   value = "class:active"           → class içeriği doğrula
//   value = "href"                   → sadece oku, loga yaz (doğrulama yok)

@Component
@RequiredArgsConstructor
@Slf4j
public class GetAttributeExecutor implements StepExecutor{
    private final LocatorResolver locatorResolver;

    @Override
    public String supportedAction() { return "getAttribute"; }

    @Override
    public void execute(WebDriver driver, TestStep step) {
        WebElement el = new WebDriverWait(driver, Duration.ofSeconds(10))
                .until(ExpectedConditions.presenceOfElementLocated(locatorResolver.resolve(step.getLocator())));

        String val = step.getValue() != null ? step.getValue().trim() : "";

        if (val.contains(":")) {
            // "attribute:beklenenDeger" formatı
            String attrName = val.substring(0, val.indexOf(":")).trim();
            String expected = val.substring(val.indexOf(":") + 1).trim();
            String actualValue = "innerText".equals(attrName)
                    ? el.getText()
                    : el.getAttribute(attrName);

                    log.info("[getAttribute] {} = '{}'", attrName, actualValue);

                    if (actualValue == null || !actualValue.contains(expected)) {
                        throw new AssertionError(
                                "Attribute doğrulaması başarısız. "
                                        + attrName + " beklenen: '" + expected
                                        + "' | bulunan: '" + actualValue + "'");

                    }
        } else if (!val.isBlank()) {
            String attrValue = el.getAttribute(val);
            log.info("[getAttribute] {} = '{}'", val, attrValue);
            
        }
    }
}
