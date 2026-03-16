package com.petmarketplace.controller;

import com.petmarketplace.dto.response.CartItemResponse;
import com.petmarketplace.dto.response.MessageResponse;
import com.petmarketplace.entity.*;
import com.petmarketplace.exception.ResourceNotFoundException;
import com.petmarketplace.repository.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import com.petmarketplace.security.UserDetailsImpl;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/cart")
@Tag(name = "Cart", description = "Buyer cart management")
@SecurityRequirement(name = "bearerAuth")
public class CartController {

    @Autowired private CartItemRepository cartItemRepository;
    @Autowired private PetRepository petRepository;
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

    @PostMapping("/add")
    @Transactional
    @Operation(summary = "Add a pet to cart")
    public ResponseEntity<?> addToCart(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Long> body) {
        Long buyerId = getUserId(userDetails);
        Long petId = body.get("petId");
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new ResourceNotFoundException("Pet not found: " + petId));

        if (!pet.getAvailability())
            return ResponseEntity.badRequest().body(new MessageResponse("Pet is no longer available"));

        if (cartItemRepository.findByBuyer_UserIdAndPet_PetId(buyerId, petId).isPresent())
            return ResponseEntity.badRequest().body(new MessageResponse("Pet already in cart"));

        CartItem item = CartItem.builder()
                .buyer(User.builder().userId(buyerId).build())
                .pet(pet)
                .build();
        cartItemRepository.save(item);
        return ResponseEntity.ok(new MessageResponse("Added to cart"));
    }

    @GetMapping("/{buyerId}")
    @Operation(summary = "View cart items for a buyer")
    public ResponseEntity<List<CartItemResponse>> getCart(@PathVariable Long buyerId) {
        List<CartItemResponse> responses = cartItemRepository.findByBuyer_UserId(buyerId)
                .stream().map(CartItemResponse::fromEntity).toList();
        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/remove/{itemId}")
    @Transactional
    @Operation(summary = "Remove item from cart")
    public ResponseEntity<?> removeFromCart(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long itemId) {
        Long buyerId = getUserId(userDetails);
        CartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found"));
        if (!item.getBuyer().getUserId().equals(buyerId))
            return ResponseEntity.status(403).body(new MessageResponse("Not authorized"));
        cartItemRepository.delete(item);
        return ResponseEntity.ok(new MessageResponse("Item removed from cart"));
    }

    @PostMapping("/checkout")
    @Transactional
    @Operation(summary = "Checkout cart - converts cart items to requests")
    public ResponseEntity<?> checkout(@AuthenticationPrincipal UserDetails userDetails) {
        Long buyerId = getUserId(userDetails);
        List<CartItem> items = cartItemRepository.findByBuyer_UserId(buyerId);
        if (items.isEmpty())
            return ResponseEntity.badRequest().body(new MessageResponse("Cart is empty"));

        cartItemRepository.deleteByBuyer_UserId(buyerId);
        return ResponseEntity.ok(Map.of(
            "message", "Checkout successful. Submit requests for each pet.",
            "petIds", items.stream().map(i -> i.getPet().getPetId()).toList()
        ));
    }
}
