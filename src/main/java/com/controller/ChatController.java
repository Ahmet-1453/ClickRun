package com.controller;

import com.entity.ChatMessage;
import com.repository.ChatMessageRepository;
import com.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
public class ChatController {

    private final ChatMessageRepository  chatMessageRepository;
    private final UserRepository         userRepository;
    private final SimpMessagingTemplate  messagingTemplate;

    public ChatController(ChatMessageRepository chatMessageRepository,
                          UserRepository userRepository,
                          SimpMessagingTemplate messagingTemplate) {
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    // ── WebSocket: Genel kanal mesajı ───────────────────────
    @MessageMapping("/chat.sendAll")
    public void sendToAll(@Payload ChatMessage message,
                          Principal principal) {
        message.setSender(principal.getName());
        message.setReceiver("ALL");
        chatMessageRepository.save(message);
        messagingTemplate.convertAndSend("/topic/chat.ALL", message);
    }

    // ── WebSocket: Özel mesaj ────────────────────────────────
    @MessageMapping("/chat.sendPrivate")
    public void sendPrivate(@Payload ChatMessage message,
                            Principal principal) {
        message.setSender(principal.getName());
        chatMessageRepository.save(message);
        // Alıcıya gönder
        messagingTemplate.convertAndSendToUser(
                message.getReceiver(), "/queue/messages", message);
        // Gönderene de gönder (kendi ekranında görünsün)
        messagingTemplate.convertAndSendToUser(
                principal.getName(), "/queue/messages", message);
    }

    // ── REST: Genel kanal geçmişi ────────────────────────────
    @GetMapping("/api/chat/history/all")
    public ResponseEntity<List<ChatMessage>> getAllHistory() {
        return ResponseEntity.ok(
                chatMessageRepository
                        .findTop50ByReceiverOrderBySentAtAsc("ALL"));
    }

    // ── REST: Özel konuşma geçmişi ───────────────────────────
    @GetMapping("/api/chat/history/{otherEmail}")
    public ResponseEntity<List<ChatMessage>> getPrivateHistory(
            @PathVariable String otherEmail,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(
                chatMessageRepository.findConversation(
                        ud.getUsername(), otherEmail));
    }

    // ── REST: Aktif kullanıcı listesi ────────────────────────
    @GetMapping("/api/chat/users")
    public ResponseEntity<List<Map<String, Object>>> getUsers(
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(
                userRepository.findAll().stream()
                        .filter(u -> !u.getEmail().equals(ud.getUsername()))
                        .map(u -> Map.<String, Object>of(
                                "email", u.getEmail(),
                                "role",  u.getRole().name()
                        ))
                        .toList()
        );
    }
}