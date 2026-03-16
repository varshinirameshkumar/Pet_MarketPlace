package com.petmarketplace.controller;

import com.petmarketplace.dto.response.ChatMessageResponse;
import com.petmarketplace.entity.*;
import com.petmarketplace.exception.ResourceNotFoundException;
import com.petmarketplace.repository.*;
import com.petmarketplace.security.UserDetailsImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/chat")
@Tag(name = "Chat", description = "Live chat between buyers and sellers (REST history + WebSocket)")
@SecurityRequirement(name = "bearerAuth")
public class ChatController {

    @Autowired private ChatMessageRepository chatMessageRepository;
    @Autowired private RequestRepository requestRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private SimpMessagingTemplate messagingTemplate;

    private User getUser(UserDetails ud) {
        if (ud instanceof UserDetailsImpl) {
            return userRepository.findById(((UserDetailsImpl) ud).getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        }
        return userRepository.findByUsername(ud.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Long getUserId(UserDetails ud) {
        if (ud instanceof UserDetailsImpl) {
            return ((UserDetailsImpl) ud).getUserId();
        }
        return getUser(ud).getUserId();
    }

    @GetMapping("/{requestId}/history")
    @Operation(summary = "Get chat history for a request")
    public ResponseEntity<List<ChatMessageResponse>> getChatHistory(@PathVariable Long requestId) {
        List<ChatMessageResponse> responses = chatMessageRepository.findByRequest_RequestIdOrderByTimestampAsc(requestId)
                .stream().map(ChatMessageResponse::fromEntity).toList();
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/{requestId}/send")
    @Operation(summary = "Send a chat message via REST (fallback)")
    public ResponseEntity<?> sendMessage(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long requestId,
            @RequestBody Map<String, Object> body) {

        Long senderId = getUserId(userDetails);
        Request request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found: " + requestId));

        if (request.getStatus() != Request.RequestStatus.ACCEPTED)
            return ResponseEntity.badRequest().body(Map.of("message", "Chat is only available for accepted requests"));

        Long receiverId = Long.valueOf(body.get("receiverId").toString());
        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new ResourceNotFoundException("Receiver not found: " + receiverId));

        ChatMessage msg = ChatMessage.builder()
                .request(request)
                .sender(User.builder().userId(senderId).build())
                .receiver(receiver)
                .message(body.get("message").toString())
                .build();

        chatMessageRepository.save(msg);
        ChatMessageResponse response = ChatMessageResponse.fromEntity(msg);

        // Push via WebSocket
        messagingTemplate.convertAndSend("/topic/chat/" + requestId, response);

        return ResponseEntity.ok(response);
    }

    @MessageMapping("/chat/{requestId}")
    public void handleWebSocketMessage(@DestinationVariable Long requestId, Map<String, Object> body) {
        Request request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        if (request.getStatus() != Request.RequestStatus.ACCEPTED) return;

        Long senderId = Long.valueOf(body.get("senderId").toString());
        Long receiverId = Long.valueOf(body.get("receiverId").toString());
        
        User sender = userRepository.findById(senderId).orElseThrow();
        User receiver = userRepository.findById(receiverId).orElseThrow();

        ChatMessage msg = ChatMessage.builder()
                .request(request)
                .sender(sender)
                .receiver(receiver)
                .message(body.get("message").toString())
                .build();

        chatMessageRepository.save(msg);
        
        messagingTemplate.convertAndSend("/topic/chat/" + requestId, ChatMessageResponse.fromEntity(msg));
    }
}
