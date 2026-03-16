package com.petmarketplace.controller;

import com.petmarketplace.dto.response.MessageResponse;
import com.petmarketplace.dto.response.RequestResponse;
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
import java.util.Map;

@RestController
@RequestMapping("/requests")
@Tag(name = "Requests", description = "Buyer requests and seller approval workflow")
@SecurityRequirement(name = "bearerAuth")
public class RequestController {

    @Autowired private RequestRepository requestRepository;
    @Autowired private PetRepository petRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private OrderRepository orderRepository;

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

    @PostMapping("/add")
    @Transactional
    @Operation(summary = "Submit a request for a pet")
    public ResponseEntity<?> submitRequest(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Object> body) {
        Long buyerId = getUserId(userDetails);
        Long petId = Long.valueOf(body.get("petId").toString());
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new ResourceNotFoundException("Pet not found: " + petId));

        if (!pet.getAvailability())
            return ResponseEntity.badRequest().body(new MessageResponse("Pet is no longer available"));

        Request request = Request.builder()
                .buyer(User.builder().userId(buyerId).build())
                .pet(pet)
                .description(body.getOrDefault("description", "").toString())
                .status(Request.RequestStatus.PENDING)
                .build();

        requestRepository.save(request);
        return ResponseEntity.ok(RequestResponse.fromEntity(request));
    }
    
    @GetMapping("/buyer/{buyerId}")
    @Operation(summary = "Get all requests by buyer ID")
    public ResponseEntity<List<RequestResponse>> getBuyerRequests(@PathVariable Long buyerId) {
        List<RequestResponse> responses = requestRepository.findByBuyer_UserId(buyerId)
                .stream().map(RequestResponse::fromEntity).toList();
        return ResponseEntity.ok(responses);
    }
    
    @GetMapping("/seller")
    @Operation(summary = "Get all requests for the logged-in seller's pets")
    public ResponseEntity<List<RequestResponse>> getSellerRequests(@AuthenticationPrincipal UserDetails userDetails) {
        Long sellerId = getUserId(userDetails);
        List<RequestResponse> responses = requestRepository.findByPet_Seller_UserId(sellerId)
                .stream().map(RequestResponse::fromEntity).toList();
        return ResponseEntity.ok(responses);
    }

    @PutMapping("/{id}/approve")
    @Transactional
    @Operation(summary = "Approve a buyer request (seller action)")
    public ResponseEntity<?> approveRequest(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        User seller = getUser(userDetails);
        Request request = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found: " + id));

        if (!request.getPet().getSeller().getUserId().equals(seller.getUserId()))
            return ResponseEntity.status(403).body(new MessageResponse("Not authorized"));

        if (request.getStatus() != Request.RequestStatus.PENDING)
            return ResponseEntity.badRequest().body(new MessageResponse("Request is not pending"));

        request.setStatus(Request.RequestStatus.ACCEPTED);
        requestRepository.save(request);

        // Mark pet as unavailable
        Pet pet = request.getPet();
        pet.setAvailability(false);
        petRepository.save(pet);

        // Auto-create order
        Order order = Order.builder()
                .request(request)
                .seller(seller)
                .status(Order.OrderStatus.PROCESSING)
                .paymentStatus(Order.PaymentStatus.PENDING)
                .build();
        orderRepository.save(order);

        return ResponseEntity.ok(Map.of("message", "Request approved", "orderId", order.getOrderId()));
    }

    @PutMapping("/{id}/reject")
    @Transactional
    @Operation(summary = "Reject a buyer request (seller action)")
    public ResponseEntity<?> rejectRequest(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        User seller = getUser(userDetails);
        Request request = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found: " + id));

        if (!request.getPet().getSeller().getUserId().equals(seller.getUserId()))
            return ResponseEntity.status(403).body(new MessageResponse("Not authorized"));

        request.setStatus(Request.RequestStatus.REJECTED);
        requestRepository.save(request);
        return ResponseEntity.ok(new MessageResponse("Request rejected"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a single request by ID")
    public ResponseEntity<RequestResponse> getRequest(@PathVariable Long id) {
        return ResponseEntity.ok(requestRepository.findById(id)
                .map(RequestResponse::fromEntity)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found: " + id)));
    }
 
    @DeleteMapping("/clear-rejected")
    @Transactional
    @Operation(summary = "Clear all rejected requests for the logged-in buyer")
    public ResponseEntity<?> clearRejectedRequests(@AuthenticationPrincipal UserDetails userDetails) {
        Long buyerId = getUserId(userDetails);
        requestRepository.deleteByBuyer_UserIdAndStatus(buyerId, Request.RequestStatus.REJECTED);
        return ResponseEntity.ok(new MessageResponse("Rejected requests cleared"));
    }
}
