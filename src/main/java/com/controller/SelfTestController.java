package com.controller;

import com.service.SelfTestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

// SecurityConfig'de /api/self-test/** permitAll() var
// Sunum sırasında tarayıcıdan doğrudan çağrılabilir
@RestController
@RequestMapping("/api/self-test")
@RequiredArgsConstructor
public class SelfTestController {

    private final SelfTestService selfTestService;

    @GetMapping("/run")
    public ResponseEntity<Map<String, Object>> run() {
        return ResponseEntity.ok(selfTestService.runSelfTest());
    }
}
