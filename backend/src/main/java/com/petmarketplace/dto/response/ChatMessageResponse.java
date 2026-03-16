package com.petmarketplace.dto.response;

import com.petmarketplace.entity.ChatMessage;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ChatMessageResponse {
    private Long chatId;
    private Long requestId;
    private UserInfo sender;
    private UserInfo receiver;
    private String message;
    private LocalDateTime timestamp;

    @Data
    public static class UserInfo {
        private Long userId;
        private String username;
    }

    public static ChatMessageResponse fromEntity(ChatMessage msg) {
        ChatMessageResponse r = new ChatMessageResponse();
        r.setChatId(msg.getChatId());
        r.setRequestId(msg.getRequest().getRequestId());
        
        UserInfo s = new UserInfo();
        s.setUserId(msg.getSender().getUserId());
        s.setUsername(msg.getSender().getUsername());
        r.setSender(s);
        
        UserInfo rec = new UserInfo();
        rec.setUserId(msg.getReceiver().getUserId());
        rec.setUsername(msg.getReceiver().getUsername());
        r.setReceiver(rec);
        
        r.setMessage(msg.getMessage());
        r.setTimestamp(msg.getTimestamp());
        return r;
    }
}
