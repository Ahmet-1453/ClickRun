package com.controller;

import com.entity.ScheduleConfig;
import com.entity.Scenario;
import com.repository.ScenarioRepository;
import com.repository.ScheduleConfigRepository;
import com.service.ScheduledTestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleConfigRepository scheduleConfigRepository;
    private final ScenarioRepository       scenarioRepository;
    private final ScheduledTestService     scheduledTestService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TESTER')")
    public ResponseEntity<List<ScheduleConfig>> getAll() {
        return ResponseEntity.ok(scheduleConfigRepository.findAll());
    }

    @GetMapping("/scenario/{scenarioId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TESTER')")
    public ResponseEntity<List<ScheduleConfig>> getByScenario(
            @PathVariable Long scenarioId) {
        return ResponseEntity.ok(
                scheduleConfigRepository.findByScenarioId(scenarioId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TESTER')")
    public ResponseEntity<ScheduleConfig> create(
            @RequestBody Map<String, Object> body) {

        // Null kontrol
        if (body.get("scenarioId") == null
                || body.get("scheduleMode") == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "scenarioId ve scheduleMode zorunludur.");

        Long scenarioId = Long.valueOf(
                body.get("scenarioId").toString());

        Scenario scenario = scenarioRepository.findById(scenarioId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Senaryo bulunamadı."));

        ScheduleConfig config = new ScheduleConfig();
        config.setScenario(scenario);
        config.setScheduleMode(body.get("scheduleMode").toString());
        config.setActive(true);

        if ("INTERVAL".equals(config.getScheduleMode())) {
            if (body.get("intervalMinutes") == null)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "INTERVAL modunda intervalMinutes zorunludur.");
            config.setIntervalMinutes(Integer.parseInt(
                    body.get("intervalMinutes").toString()));
            config.setNextRunAt(LocalDateTime.now()
                    .plusMinutes(config.getIntervalMinutes()));
        } else {
            if (body.get("dailyTime") == null)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "DAILY modunda dailyTime zorunludur.");
            String dailyTime = body.get("dailyTime").toString();
            config.setDailyTime(dailyTime);
            LocalTime t = LocalTime.parse(dailyTime);
            config.setNextRunAt(LocalDateTime.now()
                    .withHour(t.getHour()).withMinute(t.getMinute())
                    .withSecond(0).withNano(0));
        }

        return ResponseEntity.ok(
                scheduleConfigRepository.save(config));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TESTER')")
    public ResponseEntity<ScheduleConfig> update(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {

        ScheduleConfig config = scheduleConfigRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Zamanlama bulunamadı."));

        if (body.containsKey("scheduleMode"))
            config.setScheduleMode(body.get("scheduleMode").toString());
        if (body.containsKey("intervalMinutes"))
            config.setIntervalMinutes(Integer.parseInt(
                    body.get("intervalMinutes").toString()));
        if (body.containsKey("dailyTime"))
            config.setDailyTime(body.get("dailyTime").toString());
        if (body.containsKey("active"))
            config.setActive(Boolean.parseBoolean(
                    body.get("active").toString()));

        config.setNextRunAt(
                scheduledTestService.calculateNextRun(config));

        return ResponseEntity.ok(
                scheduleConfigRepository.save(config));
    }

    @PatchMapping("/{id}/toggle")
    @PreAuthorize("hasAnyRole('ADMIN', 'TESTER')")
    public ResponseEntity<Map<String, Object>> toggle(
            @PathVariable Long id) {

        ScheduleConfig config = scheduleConfigRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Zamanlama bulunamadı."));

        config.setActive(!config.isActive());
        scheduleConfigRepository.save(config);

        return ResponseEntity.ok(Map.of(
                "id",     id,
                "active", config.isActive()
        ));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TESTER')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        scheduleConfigRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}