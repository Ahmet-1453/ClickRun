package com.service.runner;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class LogStreamHub {

    private final Map<Long, SseEmitter> emitters =
            new ConcurrentHashMap<>();

    private static final DateTimeFormatter T =
            DateTimeFormatter.ofPattern("HH:mm:ss");

    public SseEmitter register(Long runId) {
        SseEmitter old = emitters.remove(runId);
        if (old != null) old.complete();

        SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);
        emitter.onCompletion(() -> emitters.remove(runId));
        emitter.onTimeout(()    -> emitters.remove(runId));
        emitter.onError(e      -> emitters.remove(runId));

        emitters.put(runId, emitter);
        publish(runId, "CONNECTED",
                "Bağlantı kuruldu, test başlatılıyor...", "info");
        return emitter;
    }

    public void publish(Long runId, String event,
                        String message, String type) {
        SseEmitter emitter = emitters.get(runId);
        if (emitter == null) return;

        try {
            String payload = String.format(
                    "{\"time\":\"%s\",\"event\":\"%s\"," +
                            "\"message\":\"%s\",\"type\":\"%s\"}",
                    LocalDateTime.now().format(T),
                    escape(event), escape(message), type);

            emitter.send(SseEmitter.event()
                    .name(event).data(payload));
        } catch (IOException e) {
            emitters.remove(runId);
        }
    }

    public void complete(Long runId, boolean success) {
        SseEmitter emitter = emitters.remove(runId);
        if (emitter == null) return;
        try {
            String msg = success
                    ? "✓ Test başarıyla tamamlandı."
                    : "✗ Test başarısız sonuçlandı.";
            publish(runId, "COMPLETED", msg,
                    success ? "success" : "error");
            emitter.complete();
        } catch (Exception e) {
            emitter.completeWithError(e);
        }
    }

    public boolean hasListener(Long runId) {
        return emitters.containsKey(runId);
    }

    private String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n");
    }
}