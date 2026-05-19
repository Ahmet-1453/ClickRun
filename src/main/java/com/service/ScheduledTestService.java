package com.service;

import com.entity.ScheduleConfig;
import com.repository.ScheduleConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledTestService {

    private final ScheduleConfigRepository scheduleConfigRepository;
    private final TestRunnerService        testRunnerService;

    // Her 60 saniyede bir çalışır — süresi gelen senaryoları tetikler
    @Scheduled(fixedRate = 60_000)
    @Transactional
    public void checkAndRunScheduledTests() {
        List<ScheduleConfig> dueConfigs =
                scheduleConfigRepository.findByActiveTrueAndNextRunAtBefore(
                        LocalDateTime.now());

        for (ScheduleConfig config : dueConfigs) {
            try {
                Long scenarioId = config.getScenario().getId();
                log.info("[SCHEDULER] Senaryo {} tetikleniyor (mod: {})",
                        scenarioId, config.getScheduleMode());

                testRunnerService.runScenerioWithTrigger(
                        scenarioId, "OTOMATIK");

                config.setLastRunAt(LocalDateTime.now());
                config.setNextRunAt(calculateNextRun(config));
                scheduleConfigRepository.save(config);

            } catch (Exception e) {
                log.error("[SCHEDULER] Hata — senaryo {}: {}",
                        config.getScenario().getId(), e.getMessage());
            }
        }
    }

    // Bir sonraki çalışma zamanını hesapla
    public LocalDateTime calculateNextRun(ScheduleConfig config) {
        return switch (config.getScheduleMode().toUpperCase()) {
            case "INTERVAL" -> LocalDateTime.now()
                    .plusMinutes(config.getIntervalMinutes() != null
                            ? config.getIntervalMinutes() : 60);
            case "DAILY" -> {
                // Yarın aynı saatte
                LocalTime t = LocalTime.parse(
                        config.getDailyTime() != null
                                ? config.getDailyTime() : "08:00");
                yield LocalDateTime.now()
                        .plusDays(1)
                        .withHour(t.getHour())
                        .withMinute(t.getMinute())
                        .withSecond(0)
                        .withNano(0);
            }
            default -> LocalDateTime.now().plusHours(1);
        };
    }
}