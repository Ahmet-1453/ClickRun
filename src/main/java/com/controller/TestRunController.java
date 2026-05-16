package com.controller;

import com.aft.compact.entity.TestRun;
import com.aft.compact.repository.TestRunRepository;
import com.aft.compact.service.TestRunnerService;
import com.aft.compact.service.runner.LogStreamHub;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/runs")
@RequiredArgsConstructor
@Slf4j
public class TestRunController {

    private final TestRunnerService testRunnerService;
    private final TestRunRepository testRunRepository;
    private final LogStreamHub logStreamHub;

    @GetMapping
    public ResponseEntity<List<TestRun>> getAll() {
        return ResponseEntity.ok(testRunRepository.findAllByOrderByRunDateDesc());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TestRun> getById(@PathVariable Long id) {
        return testRunRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/scenario/{scenarioId}")
    public ResponseEntity<List<TestRun>> getByScenario(
            @PathVariable Long scenarioId) {
        return ResponseEntity.ok(
                testRunRepository
                        .findByScenarioIdOrderByRunDateDesc(scenarioId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!testRunRepository.existsById(id))
            return ResponseEntity.notFound().build();
        testRunRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ── YENİ EKLENDİ: Test başlat ───────────────────────────
    @PostMapping("/run/{scenarioId}")
    public ResponseEntity<Map<String, Object>> startRun(
            @PathVariable Long scenarioId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails != null
                ? userDetails.getUsername() : "system";
        testRunnerService.runScenerio(scenarioId, email);

        return ResponseEntity.accepted().body(Map.of(
                "message",    "Test koşumu başlatıldı.",
                "scenarioId", scenarioId
                ));
    }

    // ── YENİ EKLENDİ: SSE canlı log akışı ──────────────────
    // EventSource header gönderemez → ?access_token= query param
    // JwtAuthFilter bu param'ı da okuyor (Kısım 1'de eklendi)
    @GetMapping(value = "/stream/{runId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamLogs(@PathVariable Long runId) {
        return logStreamHub.register(runId);
    }
}