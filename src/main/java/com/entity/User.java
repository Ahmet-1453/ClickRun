package com.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", nullable = false, unique = true, length = 150)
    private String email;

    @JsonIgnore
    @Column(name = "password", nullable = false)
    private String password;

    // GÜNCELLENDİ: String'den enum'a çevrildi
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private Role role;

    // YENİ EKLENDİ: Kullanıcı tercihleri
    @Column(name = "theme", length = 20, columnDefinition = "VARCHAR(20) DEFAULT 'dark'")
    private String theme = "dark";

    @Column(name = "default_browser", length = 30, columnDefinition = "VARCHAR(30) DEFAULT 'chrome'")
    private String defaultBrowser = "chrome";

    // Kural 4 esnetmesi: false ise driver kapatılmaz
    @Column(name = "auto_close_driver", columnDefinition = "BOOLEAN DEFAULT TRUE")
    private boolean autoCloseDriver = true;

}