package com.petmarketplace.dto.response;

import com.petmarketplace.entity.Order;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class OrderResponse {
    private Long orderId;
    private RequestInfo request;
    private String status;
    private String paymentStatus;
    private Long sellerId;
    private String sellerUsername;
    private LocalDateTime createdAt;

    @Data
    public static class RequestInfo {
        private Long requestId;
        private PetResponse pet;
        private RequestResponse.BuyerInfo buyer;
    }

    public static OrderResponse fromEntity(Order order) {
        OrderResponse r = new OrderResponse();
        r.setOrderId(order.getOrderId());
        
        RequestInfo ri = new RequestInfo();
        ri.setRequestId(order.getRequest().getRequestId());
        ri.setPet(PetResponse.fromEntity(order.getRequest().getPet()));
        
        RequestResponse.BuyerInfo bi = new RequestResponse.BuyerInfo();
        bi.setUserId(order.getRequest().getBuyer().getUserId());
        bi.setUsername(order.getRequest().getBuyer().getUsername());
        ri.setBuyer(bi);
        
        r.setRequest(ri);
        
        r.setStatus(order.getStatus().toString());
        r.setPaymentStatus(order.getPaymentStatus().toString());
        r.setSellerId(order.getSeller().getUserId());
        r.setSellerUsername(order.getSeller().getUsername());
        r.setCreatedAt(order.getCreatedAt());
        return r;
    }
}
