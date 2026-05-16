package com.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "test_steps")
@Getter
@Setter
@NoArgsConstructor
public class TestStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Kural 3: Adım sırası — @OrderBy("stepOrder ASC") Scenario'da var
    @Column(name = "step_order")
    private Integer stepOrder;

    // Aksiyon tipi: click, type, goto, wait vb.
    @Column(name = "action", length = 50)
    private String action;

    // Element locator: XPath, ID, class, name
    @Column(name = "locator", length = 500)
    private String locator;

    // Yazılacak değer veya doğrulanacak metin
    @Column(name = "value", length = 500)
    private String value;

    // Senaryo ile ilişki
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scenario_id")
    @JsonIgnore
    private Scenario scenario;
}