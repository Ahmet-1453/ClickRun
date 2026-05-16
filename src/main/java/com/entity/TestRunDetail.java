package com.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// YENİ EKLENDİ: TestRun'daki ağır verileri izole eden entity.
// errorMessage ve screenshotBase64 artık burada saklanır.
// @OneToOne LAZY — sadece ihtiyaç duyulduğunda yüklenir.
@Entity
@Table ( name = "test_run_details" )
@Getter
@Setter
@NoArgsConstructor
public class TestRunDetail {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Detaylı hata logu — boyut sınırı yok
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    // Olay anı fotoğrafı (Base64) — büyük olabilir
    @Column(name = "screenshot_base64", columnDefinition = "TEXT")
    private String screenshotBase64;

    // Sonsuz JSON döngüsünü önler
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_run_id", nullable = false)
    @JsonIgnore
    private TestRun testRun;
}
