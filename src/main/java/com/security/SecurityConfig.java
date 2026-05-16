package com.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true) // @PreAuthorize için zorunlu
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s ->
                        s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth

                        // ── Herkese açık ────────────────────────────
                        .requestMatchers(
                                "/api/auth/login",
                                "/api/auth/register",
                                "/",
                                "/Html/**",
                                "/Css/**",
                                "/Js/**",
                                "/favicon.ico",
                                // WebSocket (8-9. hafta)
                                "/ws-chat/**",
                                "/webjars/**",
                                // Self-test
                                "/api/self-test/**"
                        ).permitAll()

                        // ── GET: ADMIN + TESTER + VIEWER ────────────
                        .requestMatchers(HttpMethod.GET, "/api/**")
                        .hasAnyRole("ADMIN", "TESTER", "VIEWER")

                        // ── Senaryo/Step silme: ADMIN + TESTER ──────
                        .requestMatchers(HttpMethod.DELETE, "/api/scenarios/**")
                        .hasAnyRole("ADMIN", "TESTER")
                        .requestMatchers(HttpMethod.DELETE, "/api/steps/**")
                        .hasAnyRole("ADMIN", "TESTER")

                        // ── TestRun silme: Sadece ADMIN ──────────────
                        .requestMatchers(HttpMethod.DELETE, "/api/runs/**")
                        .hasRole("ADMIN")

                        // ── Kullanıcı yönetimi: Sadece ADMIN ────────
                        .requestMatchers("/api/users/**")
                        .hasRole("ADMIN")
                        .requestMatchers("/api/settings/users/**")
                        .hasRole("ADMIN")

                        // ── Rol güncelleme: Sadece ADMIN ─────────────
                        .requestMatchers("/api/auth/update-role")
                        .hasRole("ADMIN")

                        // ── Zamanlama API: ADMIN + TESTER ───────────
                        .requestMatchers("/api/schedules/**")
                        .hasAnyRole("ADMIN", "TESTER")

                        // ── Senaryo oluştur/güncelle: ADMIN + TESTER
                        .requestMatchers(HttpMethod.POST, "/api/scenarios/**")
                        .hasAnyRole("ADMIN", "TESTER")
                        .requestMatchers(HttpMethod.PUT, "/api/scenarios/**")
                        .hasAnyRole("ADMIN", "TESTER")

                        // ── Test başlat: ADMIN + TESTER ──────────────
                        .requestMatchers(HttpMethod.POST, "/api/runs/**")
                        .hasAnyRole("ADMIN", "TESTER")

                        // ── Geri kalan: kimlik doğrulama zorunlu ────
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}