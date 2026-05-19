package com.controller;

import com.dto.LoginRequest;
import com.dto.RegisterRequest;
import com.entity.Role;
import com.entity.User;
import com.repository.UserRepository;
import com.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(
            @RequestBody LoginRequest request) {
        String token = authService.login(request);
        return ResponseEntity.ok(Map.of("token", token));
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(
            @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.ok(Map.of("message", "Kayıt başarılı."));
    }

    @PutMapping("/update-role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> updateRole(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails adminDetails) {

        String targetEmail = body.get("email");
        String newRoleStr = body.get("role");

        if (targetEmail == null || newRoleStr == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "'email' ve 'role' zorunludur.");
        }

        Role newRole;
        try {
            newRole = Role.valueOf(newRoleStr.toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Geçersiz rol: " + newRoleStr);
        }

        // ADMIN kendini düşüremesin
        if (targetEmail.equals(adminDetails.getUsername())
                && newRole == Role.VIEWER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Kendinizi VIEWER yapanazsınız.");
        }

        User user = userRepository.findByEmail(targetEmail)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Kullanıcı bulunamadı."));

        user.setRole(newRole);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "message", "Rol güncellendi.",
                "email", targetEmail,
                "role", newRole.name()
        ));
    }

    @PatchMapping("/auth/change-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> changePassword(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        String current = body.get("currentPassword");
        String newPass = body.get("newPassword");

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow();

        // Mevcut şifreyi kontrol et
        if (!passwordEncoder.matches(current, user.getPassword())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Mevcut şifre yanlış"));
        }

        // Yeni şifreyi kaydet
        user.setPassword(passwordEncoder.encode(newPass));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Şifre güncellendi"));
    }

}