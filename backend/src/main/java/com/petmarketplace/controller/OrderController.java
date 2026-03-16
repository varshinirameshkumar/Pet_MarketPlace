package com.petmarketplace.controller;

import com.petmarketplace.dto.response.MessageResponse;
import com.petmarketplace.dto.response.OrderResponse;
import com.petmarketplace.entity.*;
import com.petmarketplace.exception.ResourceNotFoundException;
import com.petmarketplace.repository.*;
import com.petmarketplace.security.UserDetailsImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/orders")
@Tag(name = "Orders", description = "Order management for sellers and buyers")
@SecurityRequirement(name = "bearerAuth")
public class OrderController {

    @Autowired private OrderRepository orderRepository;
    @Autowired private UserRepository userRepository;

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

    @GetMapping("/seller/{sellerId}")
    @Operation(summary = "Get all orders for a seller")
    public ResponseEntity<List<OrderResponse>> getSellerOrders(@PathVariable Long sellerId) {
        List<OrderResponse> responses = orderRepository.findBySeller_UserId(sellerId)
                .stream().map(OrderResponse::fromEntity).toList();
        return ResponseEntity.ok(responses);
    }
    
    @GetMapping("/buyer/{buyerId}")
    @Operation(summary = "Get all orders for a buyer")
    public ResponseEntity<List<OrderResponse>> getBuyerOrders(@PathVariable Long buyerId) {
        List<OrderResponse> responses = orderRepository.findByRequest_Buyer_UserId(buyerId)
                .stream().map(OrderResponse::fromEntity).toList();
        return ResponseEntity.ok(responses);
    }

    @PutMapping("/{id}/complete")
    @Operation(summary = "Mark an order as completed (seller action)")
    public ResponseEntity<?> completeOrder(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        Long sellerId = getUserId(userDetails);
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + id));

        if (!order.getSeller().getUserId().equals(sellerId))
            return ResponseEntity.status(403).body(new MessageResponse("Not authorized"));

        order.setStatus(Order.OrderStatus.COMPLETED);
        orderRepository.save(order);
        return ResponseEntity.ok(new MessageResponse("Order marked as completed"));
    }

    @DeleteMapping("/clear-completed")
    @Transactional
    @Operation(summary = "Clear all completed orders for the logged-in buyer")
    public ResponseEntity<?> clearCompletedOrders(@AuthenticationPrincipal UserDetails userDetails) {
        Long buyerId = getUserId(userDetails);
        orderRepository.deleteByRequest_Buyer_UserIdAndStatus(buyerId, Order.OrderStatus.COMPLETED);
        return ResponseEntity.ok(new MessageResponse("Completed orders cleared"));
    }

    @DeleteMapping("/clear-completed-seller")
    @Transactional
    @Operation(summary = "Clear all completed orders for the logged-in seller")
    public ResponseEntity<?> clearCompletedOrdersSeller(@AuthenticationPrincipal UserDetails userDetails) {
        Long sellerId = getUserId(userDetails);
        orderRepository.deleteBySeller_UserIdAndStatus(sellerId, Order.OrderStatus.COMPLETED);
        return ResponseEntity.ok(new MessageResponse("Seller completed orders cleared"));
    }
}
