package com.service;

import com.entity.Scenario;
import com.entity.TestRun;
import com.entity.TestRunDetail;
import com.entity.TestStep;
import com.repository.ScenarioRepository;
import com.repository.TestRunDetailRepository;
import com.repository.TestRunRepository;
import com.service.runner.StepExecutor;
import com.service.runner.impl.TakeScreenshotExecutor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.StaleElementReferenceException;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TestRunnerService {

    private final ScenarioRepository      scenarioRepository;
    private final TestRunRepository        testRunRepository;
    private final TestRunDetailRepository  testRunDetailRepository;
    private final List<StepExecutor>       stepExecutors;

    private static final int MAX_RETRY = 3;

    // Lazy init — ilk çağrıda map'e dönüştür
    private Map<String, StepExecutor> executorMap;

    private Map<String, StepExecutor> getExecutorMap() {
        if (executorMap == null) {
            executorMap = stepExecutors.stream()
                    .collect(Collectors.toMap(
                            StepExecutor::supportedAction,
                            Function.identity()));
        }
        return executorMap;
    }

    // ── Kural 1: @Async — Selenium ana thread'i bloke etmez ──
    @Async("testExecutorPool")
    public void runScenerio(Long scenarioId, String triggeredBy) {
        Scenario scenario = scenarioRepository.findById(scenarioId)
                .orElseThrow(() ->
                        new RuntimeException("Senaryo bulunamadı: " + scenarioId));

        // Kural 2: Lazy Loading kopmasına karşı hemen kopyala
        List<TestStep> steps = new ArrayList<>(scenario.getSteps());

        TakeScreenshotExecutor.LAST_SCREENSHOT.remove();

        WebDriver driver        = null;
        boolean   success       = false;
        String    errorMessage  = null;
        String    screenshotB64 = null;
        long      startTime     = System.currentTimeMillis();

        try {
            ChromeOptions opts = new ChromeOptions();
            opts.addArguments("--headless");
            opts.addArguments("--disable-blink-features=AutomationControlled");
            opts.addArguments("--no-sandbox");
            opts.addArguments("--disable-dev-shm-usage");
            opts.addArguments("--window-size=1920,1080");
            driver = new ChromeDriver(opts);

            for (TestStep step : steps) {
                executeWithRetry(driver, step);

                // takeScreenshot adımından gelen veriyi al
                String mid = TakeScreenshotExecutor.LAST_SCREENSHOT.get();
                if (mid != null) {
                    screenshotB64 = mid;
                    TakeScreenshotExecutor.LAST_SCREENSHOT.remove();
                }
            }
            success = true;
            log.info("[RUNNER] Senaryo {} başarıyla tamamlandı.", scenarioId);

        } catch (Exception e) {
            errorMessage = "[" + e.getClass().getSimpleName() + "] " + e.getMessage();
            log.error("[RUNNER] Senaryo {} başarısız: {}", scenarioId, e.getMessage());

            // Hata anı screenshot
            if (screenshotB64 == null && driver != null) {
                try {
                    screenshotB64 = Base64.getEncoder().encodeToString(
                            ((TakesScreenshot) driver).getScreenshotAs(OutputType.BYTES));
                } catch (Exception ex) {
                    log.warn("[RUNNER] Screenshot alınamadı.");
                }
            }
        } finally {
            // Kural 4: Driver her durumda kapatılır
            if (driver != null) {
                try { driver.quit(); }
                catch (Exception ex) {
                    log.warn("[RUNNER] Driver kapatılırken hata: {}", ex.getMessage());
                }
            }
            TakeScreenshotExecutor.LAST_SCREENSHOT.remove();
        }

        long durationSec = (System.currentTimeMillis() - startTime) / 1000;
        // Kural 1: DB kayıt ayrı @Transactional metodunda
        saveResult(scenario, triggeredBy, success,
                errorMessage, screenshotB64, durationSec);
    }

    // Overload: zamanlayıcı (8. hafta) buradan çağırır
    @Async("testExecutorPool")
    public void runScenerioWithTrigger(Long scenarioId, String trigger) {
        runScenerio(scenarioId, trigger);
    }

    // ── Kural 1: Ayrı @Transactional ─────────────────────────
    @Transactional
    public void saveResult(Scenario scenario,
                           String triggeredBy,
                           boolean success,
                           String errorMessage,
                           String screenshotB64,
                           long durationSec) {
        TestRun run = new TestRun();
        run.setScenario(scenario);
        run.setTriggeredBy(triggeredBy);
        run.setIsSuccess(success);
        run.setDurationInSeconds(durationSec);
        run.setRunDate(LocalDateTime.now());

        if (errorMessage != null) {
            run.setErrorSummary(errorMessage.length() > 500
                    ? errorMessage.substring(0, 500)
                    : errorMessage);
        }

        TestRun saved = testRunRepository.save(run);

        if (errorMessage != null || screenshotB64 != null) {
            TestRunDetail detail = new TestRunDetail();
            detail.setTestRun(saved);
            detail.setErrorMessage(errorMessage);
            detail.setScreenshotBase64(screenshotB64);
            testRunDetailRepository.save(detail);
        }
    }

    // ── StaleElement için 3x retry ────────────────────────────
    private void executeWithRetry(WebDriver driver, TestStep step) {
        StepExecutor executor = getExecutorMap().get(step.getAction());
        if (executor == null)
            throw new IllegalArgumentException(
                    "Bilinmeyen aksiyon: '" + step.getAction() + "'");

        int attempt = 0;
        while (true) {
            try {
                executor.execute(driver, step);
                return;
            } catch (StaleElementReferenceException e) {
                if (++attempt >= MAX_RETRY)
                    throw new RuntimeException(
                            "'" + step.getAction() + "' "
                                    + MAX_RETRY + " denemede başarısız.", e);
                try { Thread.sleep(500L * attempt); }
                catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Retry kesildi.", ie);
                }
            }
        }
    }
}