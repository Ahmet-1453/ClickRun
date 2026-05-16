package com.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table (name = "schedule_configs")
@Getter @Setter
@NoArgsConstructor
public class ScheduleConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    // Hangi seneryo zamanlanıyor
    @ManyToOne (fetch = FetchType.LAZY)
    @JoinColumn(name = "scenario_id", nullable = false)
    private Scenario scenario;

    // Interval ve Daily
    @Column(name = "schedule_mode", nullable = false, length = 20)
    private String scheduleMode;

    // INTERVAL modunda kaç dakikada bir
    @Column(name = "interval_minutes")
    private Integer intervalMinutes;

    // DAILY modunda hangi saatte (0-23)
    @Column(name = "daily_time" , length = 10)
    private String dailyTime;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "last_run_at")
    private LocalDateTime lastRunAt;

    @Column(name = "next_run_at")
    private LocalDateTime nextRunAt;
}
