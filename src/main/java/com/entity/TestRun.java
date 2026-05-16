package com.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "test_runs")
@Getter
@Setter
@NoArgsConstructor
public class TestRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "is_success")
    private Boolean isSuccess;

    @Column(name = "duration_in_seconds")
    private Long durationInSeconds;

    @Column(name = "run_date")
    private LocalDateTime runDate;

    // GÜNCELLENDİ: Ağır alanlar TestRunDetail'e taşındı.
    // Buraya sadece 500 karakterlik özet yazılır.
    @Column(name = "error_summary", length = 500)
    private String errorSummary;

    @Column(name = "triggered_by")
    private String triggeredBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scenario_id")
    @JsonIgnore
    private Scenario scenario;

    // YENİ EKLENDİ: Ağır verilere LAZY köprü
    @OneToOne(mappedBy = "testRun", fetch = FetchType.LAZY,
            cascade = CascadeType.ALL, orphanRemoval = true)
    private TestRunDetail detail;
}