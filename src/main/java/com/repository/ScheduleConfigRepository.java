package com.repository;

import com.aft.compact.entity.ScheduleConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ScheduleConfigRepository extends JpaRepository<ScheduleConfig, Long> {

    // Aktif ve süresi gelmiş zamanlamaları bul
    List<ScheduleConfig> findByActiveTrueAndNextRunAtBefore(LocalDateTime now);

    // Senaryo bazında zamanlama getir
    List<ScheduleConfig> findByScenarioId(Long scenarioId);
}
