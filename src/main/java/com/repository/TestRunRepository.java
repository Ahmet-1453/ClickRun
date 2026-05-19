package com.repository;

import com.entity.TestRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TestRunRepository extends JpaRepository<TestRun, Long> {

    // Tüm koşumlar — tarihe göre azalan
    List<TestRun> findAllByOrderByRunDateDesc();

    // Tarih aralığı — DailyReportService için
    List<TestRun> findByRunDateBetween(
            LocalDateTime start, LocalDateTime end);

    // Senaryo bazında koşumlar
    List<TestRun> findByScenarioIdOrderByRunDateDesc(Long scenarioId);

    // Dashboard istatistik — ScenarioController için
    long countByIsSuccess(boolean isSuccess);

    // Başarılı/Başarısız toplam — Analytics için
    @Query("SELECT r.isSuccess, COUNT(r) FROM TestRun r " +
            "WHERE r.isSuccess IS NOT NULL " +
            "GROUP BY r.isSuccess")
    List<Object[]> countBySuccessStatus();

    // Son 7 gün — gün bazında gruplu (native SQL)
    @Query(value =
            "SELECT DATE(r.run_date), r.is_success, COUNT(*) " +
                    "FROM test_run r " +
                    "WHERE r.run_date >= CURRENT_DATE - INTERVAL '6 days' " +
                    "  AND r.is_success IS NOT NULL " +
                    "GROUP BY DATE(r.run_date), r.is_success " +
                    "ORDER BY DATE(r.run_date) ASC",
            nativeQuery = true)
    List<Object[]> countByDayLast7Days();

    // Senaryo bazında başarı oranı
    // GÜNCELLENDİ: title → scenarioName (Scenario entity ile uyumlu)
    @Query("SELECT r.scenario.id, r.scenario.scenarioName, " +
            "SUM(CASE WHEN r.isSuccess = true THEN 1 ELSE 0 END), " +
            "SUM(CASE WHEN r.isSuccess = false THEN 1 ELSE 0 END) " +
            "FROM TestRun r WHERE r.isSuccess IS NOT NULL " +
            "GROUP BY r.scenario.id, r.scenario.scenarioName")
    List<Object[]> successRateByScenario();
}