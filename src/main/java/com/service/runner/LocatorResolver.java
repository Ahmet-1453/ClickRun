package com.service.runner;

import org.openqa.selenium.By;
import org.springframework.stereotype.Component;

// Tüm executor'ların ortak locator çözümleme noktası.
// "//" veya "(" → XPath
// "#"           → ID
// "."           → className
// diğerleri     → name
@Component
public class LocatorResolver {

    public By resolve(String locator) {
        if (locator == null || locator.isBlank()) {
            throw new IllegalArgumentException("Locator boş olamaz.");
        }
        String t = locator.trim();
        if (t.startsWith("//") || t.startsWith("(")) return By.xpath(t);
        if (t.startsWith("#"))  return By.id(t.substring(1));
        if (t.startsWith("."))  return By.className(t.substring(1));
        return By.name(t);
    }
}