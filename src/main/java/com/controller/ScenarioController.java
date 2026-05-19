package com.controller;

import com.entity.Scenario;
import com.entity.TestStep;
import com.repository.ScenarioRepository;
import com.repository.TestRunRepository;
import com.service.TestRunnerService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/scenarios")
@RequiredArgsConstructor
public class ScenarioController {

    @PersistenceContext
    private EntityManager entityManager;

    private final TestRunRepository  testRunRepository;
    private final ScenarioRepository scenarioRepository;
    private final TestRunnerService  testRunnerService;



    @PostMapping("/create")
    public ResponseEntity<?> createScenario(
            @RequestBody Scenario scenario) {
        try {
            scenarioRepository.save(scenario);
            return ResponseEntity.ok("Senaryo başarıyla kaydedildi!");
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Hata: " + e.getMessage());
        }
    }

    @GetMapping("/list")
    public ResponseEntity<?> getAllScenarios() {
        try {
            return ResponseEntity.ok(scenarioRepository.findAll());
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Hata: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return scenarioRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @DeleteMapping("/delete/{id}")
    @Transactional
    public ResponseEntity<?> deleteScenario(@PathVariable Long id) {
        try {
            Optional<Scenario> opt = scenarioRepository.findById(id);
            if (opt.isEmpty())
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("Senaryo bulunamadı!");

            entityManager.createQuery(
                            "DELETE FROM TestRun tr WHERE tr.scenario.id = :id")
                    .setParameter("id", id)
                    .executeUpdate();

            scenarioRepository.delete(opt.get());
            return ResponseEntity.ok("Senaryo silindi!");
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Hata: " + e.getMessage());
        }
    }

    // GÜNCELLENDİ: artık void döndürüyor, triggeredBy eklendi
    @PostMapping("/run/{id}")
    public ResponseEntity<?> runScenario(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            String email = userDetails != null
                    ? userDetails.getUsername() : "system";
            testRunnerService.runScenerio(id, email);
            return ResponseEntity.accepted()
                    .body("Test koşumu başlatıldı.");
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Test Motoru Hatası: " + e.getMessage());
        }
    }

    @GetMapping("/dashboard-stats")
    public ResponseEntity<?> getDashboardStats() {
        long totalScenarios  = scenarioRepository.count();
        long successfulRuns  = testRunRepository.countByIsSuccess(true);
        long failedRuns      = testRunRepository.countByIsSuccess(false);
        List<Scenario> recent = scenarioRepository
                .findTop5ByOrderByIdDesc();

        Map<String, Object> resp = new HashMap<>();
        resp.put("totalScenarios", totalScenarios);
        resp.put("successfulRuns", successfulRuns);
        resp.put("failedRuns",     failedRuns);

        List<Map<String, Object>> recentList = new ArrayList<>();
        for (Scenario s : recent) {
            Map<String, Object> m = new HashMap<>();
            m.put("id",           s.getId());
            m.put("scenarioName", s.getScenarioName());
            m.put("stepCount",    s.getSteps().size());
            recentList.add(m);
        }
        resp.put("recentScenarios", recentList);
        return ResponseEntity.ok(resp);
    }

    @PutMapping("/{id}/steps")
    public ResponseEntity<?> updateSteps(
            @PathVariable Long id,
            @RequestBody List<TestStep> updatedSteps) {
        try {
            Optional<Scenario> opt = scenarioRepository.findById(id);
            if (opt.isEmpty())
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("Senaryo bulunamadı!");

            Scenario scenario = opt.get();
            scenario.getSteps().clear();
            scenario.getSteps().addAll(updatedSteps);
            scenarioRepository.save(scenario);
            return ResponseEntity.ok("Adımlar kaydedildi!");
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Hata: " + e.getMessage());
        }
    }
}