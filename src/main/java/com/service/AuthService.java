package com.service;

import com.dto.LoginRequest;
import com.dto.RegisterRequest;
import com.entity.Role;
import com.entity.User;
import com.repository.UserRepository;
import com.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    // YENİ EKLENDİ: Brute Force koruması — DB'ye dokunmaz, saf memory
    private final ConcurrentHashMap<String, LoginAttempt> loginAttemptMap
            = new ConcurrentHashMap<>();

    private static final int    MAX_ATTEMPTS         = 5;
    private static final long   LOCK_DURATION_SEC    = 15 * 60L; // 15 dakika

    // İç sınıf: deneme sayacı
    private static class LoginAttempt {
        int     count      = 0;
        Instant lockedUntil = null;
    }

    // ── Login ────────────────────────────────────────────────
    public String login(LoginRequest request) {
        String email = request.getEmail().toLowerCase().trim();

        // 1. Kilit kontrolü
        checkLock(email);

        // 2. Kullanıcı ara
        User user = userRepository.findByEmail(email).orElseThrow(() -> {
            recordFail(email);
            return new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Geçersiz e-posta veya şifre.");
        });

        // 3. Şifre kontrolü
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            recordFail(email);
            checkLock(email); // kilitlendiyse anında hata fırlat
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Geçersiz e-posta veya şifre.");
        }

        // 4. Başarılı → sayacı sıfırla
        loginAttemptMap.remove(email);
        log.info("[AUTH] Başarılı giriş: {}", email);

        return jwtTokenProvider.generateToken(user.getEmail(), user.getRole().name());
    }

    // ── Register ─────────────────────────────────────────────
    public void register(RegisterRequest request) {
        String email = request.getEmail().toLowerCase().trim();

        if (userRepository.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Bu e-posta zaten kayıtlı.");
        }

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        // Yeni kayıtlar varsayılan VIEWER — ADMIN DataSeeder ile atanır
        user.setRole(Role.VIEWER);
        userRepository.save(user);
    }

    // ── Yardımcılar ──────────────────────────────────────────
    private void checkLock(String email) {
        LoginAttempt a = loginAttemptMap.get(email);
        if (a == null) return;

        if (a.lockedUntil != null && Instant.now().isBefore(a.lockedUntil)) {
            long kalan = (a.lockedUntil.getEpochSecond() - Instant.now().getEpochSecond()) / 60 + 1;
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Hesabınız kilitlendi. Kalan süre: ~" + kalan + " dakika.");
        }

        // Süre dolduysa temizle
        if (a.lockedUntil != null && Instant.now().isAfter(a.lockedUntil)) {
            loginAttemptMap.remove(email);
        }
    }

    private void recordFail(String email) {
        loginAttemptMap.compute(email, (k, a) -> {
            if (a == null) a = new LoginAttempt();
            // Süresi dolmuş kilit varsa sıfırla
            if (a.lockedUntil != null && Instant.now().isAfter(a.lockedUntil)) {
                a.count = 0;
                a.lockedUntil = null;
            }
            a.count++;
            if (a.count >= MAX_ATTEMPTS) {
                a.lockedUntil = Instant.now().plusSeconds(LOCK_DURATION_SEC);
                log.warn("[AUTH] Hesap kilitlendi: {}", email);
            }
            return a;
        });
    }
}