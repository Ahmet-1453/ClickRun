package com.controller;

import com.aft.compact.entity.Role;
import com.aft.compact.entity.User;
import com.aft.compact.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final UserRepository userRepository;

    // Tüm kullanıcıları listele — sadece ADMIN
    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> listUsers() {
        return ResponseEntity.ok(
                userRepository.findAll().stream()
                        .map(u -> Map.<String, Object>of(
                                "id",              u.getId(),
                                "email",           u.getEmail(),
                                "role",            u.getRole().name(),
                                "theme",           u.getTheme(),
                                "defaultBrowser",  u.getDefaultBrowser(),
                                "autoCloseDriver", u.isAutoCloseDriver()
                        ))
                        .collect(Collectors.toList())
        );
    }

    // Kendi ayarlarını getir
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMe(
            @AuthenticationPrincipal UserDetails ud) {

        User user = findUser(ud.getUsername());
        return ResponseEntity.ok(Map.of(
                "id",              user.getId(),
                "email",           user.getEmail(),
                "role",            user.getRole().name(),
                "theme",           user.getTheme(),
                "defaultBrowser",  user.getDefaultBrowser(),
                "autoCloseDriver", user.isAutoCloseDriver()
        ));
    }

    // Kendi ayarlarını güncelle — tema, browser, autoClose
    @PatchMapping("/me")
    public ResponseEntity<Map<String, Object>> updateMe(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails ud) {

        User user = findUser(ud.getUsername());

        if (body.containsKey("theme")) {
            String t = body.get("theme").toString().toLowerCase();
            if (!t.equals("dark") && !t.equals("light"))
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Geçersiz tema. 'dark' veya 'light' olmalı.");
            user.setTheme(t);
        }
        if (body.containsKey("defaultBrowser")) {
            String b = body.get("defaultBrowser").toString().toLowerCase();
            if (!b.equals("chrome") && !b.equals("firefox"))
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Geçersiz tarayıcı. 'chrome' veya 'firefox' olmalı.");
            user.setDefaultBrowser(b);
        }
        if (body.containsKey("autoCloseDriver")) {
            user.setAutoCloseDriver(Boolean.parseBoolean(
                    body.get("autoCloseDriver").toString()));
        }

        userRepository.save(user);
        return ResponseEntity.ok(Map.of(
                "message",         "Ayarlar güncellendi.",
                "theme",           user.getTheme(),
                "defaultBrowser",  user.getDefaultBrowser(),
                "autoCloseDriver", user.isAutoCloseDriver()
        ));
    }

    // Kullanıcı rolü değiştir — sadece ADMIN
    @PutMapping("/users/{userId}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> changeRole(
            @PathVariable Long userId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails adminUd) {

        String roleStr = body.get("role");
        if (roleStr == null)
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "'role' zorunludur.");

        Role newRole;
        try {
            newRole = Role.valueOf(roleStr.toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Geçersiz rol: " + roleStr);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Kullanıcı bulunamadı."));

        // ADMIN kendini düşüremesin
        if (user.getEmail().equals(adminUd.getUsername())
                && newRole == Role.VIEWER)
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Kendinizi VIEWER yapamazsınız.");

        user.setRole(newRole);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "message", "Rol güncellendi.",
                "userId",  userId,
                "role",    newRole.name()
        ));
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Kullanıcı bulunamadı."));
    }
}