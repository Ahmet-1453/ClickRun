package com.repository;

import com.aft.compact.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long>{

    List<ChatMessage> findTop50ByReceiverOrderBySentAtAsc(String receiver);

    @Query("SELECT m FROM ChatMessage m " +
            "WHERE (m.sender = :a AND m.receiver = :b) " +
            "   OR (m.sender = :b AND m.receiver = :a) " +
            "ORDER BY m.sentAt ASC")
    List<ChatMessage> findConversation(@Param("a") String userA, @Param("b") String userB);
}
