package com.petmarketplace.dto.response;

import com.petmarketplace.entity.Request;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class RequestResponse {
    private Long requestId;
    private PetResponse pet;
    private String status;
    private String description;
    private LocalDateTime createdAt;
    private BuyerInfo buyer;

    @Data
    public static class BuyerInfo {
        private Long userId;
        private String username;
    }

    public static RequestResponse fromEntity(Request req) {
        RequestResponse r = new RequestResponse();
        r.setRequestId(req.getRequestId());
        r.setPet(PetResponse.fromEntity(req.getPet()));
        r.setStatus(req.getStatus().toString());
        r.setDescription(req.getDescription());
        r.setCreatedAt(req.getCreatedAt());
        
        BuyerInfo bi = new BuyerInfo();
        bi.setUserId(req.getBuyer().getUserId());
        bi.setUsername(req.getBuyer().getUsername());
        r.setBuyer(bi);
        
        return r;
    }
}
