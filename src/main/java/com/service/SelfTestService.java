package com.service;

import lombok.extern.slf4j.Slf4j;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.springframework.stereotype.Service;
import java.time.Duration;
import java.util.Map;

@Service
@Slf4j
public class SelfTestService {

    private static final String BASE = "http://localhost:8080";
    private static final String TEST_USER = "hasan.oguz@akgun.com.tr";
    private static final String TEST_PASS = "admin123";

    public Map<String, Object> runSelfTest() {
        long start = System.currentTimeMillis();
        WebDriver driver = null;

        try {
            ChromeOptions opts = new ChromeOptions();
            opts.addArguments("--headless=new");
            opts.addArguments("--no-sandbox");
            opts.addArguments("--disable-dev-shm-usage");
            opts.addArguments("--window-size=1920,1080");
            driver = new ChromeDriver(opts);

            WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(15));

            // 1. Login sayfasına git
            driver.get(BASE + "/Html/login.html");

            // 2. Giriş yap
            wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("email"))).sendKeys(TEST_USER);
            driver.findElement(By.id("password")).sendKeys(TEST_PASS);
            driver.findElement(By.id("loginBtn")).click();

            // 3. Dashboard'a yönlendirilmeyi bekle
            wait.until(ExpectedConditions.urlToBe(BASE + "/dashboard"));

            long duration = System.currentTimeMillis() - start;
            log.info("[SELF-TEST] BAŞARILI — {}ms", duration);

            return Map.of(
                    "success",  true,
                    "message",  "Login → Dashboard akışı başarılı.",
                    "url",      driver.getCurrentUrl(),
                    "durationMs", duration
            );
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - start;
            log.error("[SELF-TEST] HATA — {}ms", duration, e);

            return Map.of(
                    "success",  false,
                    "message",  "Self-test sırasında hata: " + e.getMessage(),
                    "durationMs", duration
            );
        } finally {
            if (driver != null) {
                try {driver.quit();}
                catch (Exception ignored) {}
            }
        }
    }
}
