package com.petmarketplace.controller;

import com.petmarketplace.dto.request.PetRequest;
import com.petmarketplace.dto.response.MessageResponse;
import com.petmarketplace.dto.response.PetResponse;
import com.petmarketplace.entity.*;
import com.petmarketplace.exception.ResourceNotFoundException;
import com.petmarketplace.repository.*;
import com.petmarketplace.security.UserDetailsImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/pets")
@Tag(name = "Pet Catalog", description = "Pet listing, browsing, and filtering")
@SecurityRequirement(name = "bearerAuth")
public class PetController {

    @Autowired private PetRepository petRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private LicenseRepository licenseRepository;

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
    @Operation(summary = "Add a new pet listing")
    public ResponseEntity<?> addPet(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PetRequest req) {

        User seller = getUser(userDetails);

        // License required for sale pets
        License license = null;
        if (req.getType() == Pet.PetType.SALE) {
            if (req.getLicenseId() == null)
                return ResponseEntity.badRequest().body(new MessageResponse("A valid license is required for selling pets"));
            license = licenseRepository.findById(req.getLicenseId())
                    .orElseThrow(() -> new ResourceNotFoundException("License not found"));
            if (!license.isValid())
                return ResponseEntity.badRequest().body(new MessageResponse("License is expired"));
            if (!license.getSeller().getUserId().equals(seller.getUserId()))
                return ResponseEntity.badRequest().body(new MessageResponse("License does not belong to this seller"));
        }

        Pet pet = Pet.builder()
                .seller(seller)
                .breed(req.getBreed())
                .age(req.getAge())
                .description(req.getDescription())
                .category(req.getCategory())
                .type(req.getType())
                .price(req.getPrice())
                .license(license)
                .location(req.getLocation() != null ? req.getLocation() : seller.getLocation())
                .imageUrl(req.getImageUrl())
                .availability(true)
                .build();

        petRepository.save(pet);
        return ResponseEntity.ok(PetResponse.fromEntity(pet));
    }

    @GetMapping
    @Operation(summary = "Get all available pets")
    public ResponseEntity<List<PetResponse>> getAllPets() {
        List<PetResponse> pets = petRepository.findByAvailabilityTrue()
                .stream().map(PetResponse::fromEntity).collect(Collectors.toList());
        return ResponseEntity.ok(pets);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get pet by ID")
    public ResponseEntity<PetResponse> getPetById(@PathVariable Long id) {
        Pet pet = petRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pet not found with id: " + id));
        return ResponseEntity.ok(PetResponse.fromEntity(pet));
    }

    @GetMapping("/filter")
    @Operation(summary = "Filter pets by category, breed, location, type")
    public ResponseEntity<List<PetResponse>> filterPets(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String breed,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Pet.PetType type) {
        List<PetResponse> results = petRepository.filterPets(category, breed, location, type)
                .stream().map(PetResponse::fromEntity).collect(Collectors.toList());
        return ResponseEntity.ok(results);
    }

    @GetMapping("/my-listings")
    @Operation(summary = "Get all pets listed by the logged-in seller")
    public ResponseEntity<List<PetResponse>> getMyListings(
            @AuthenticationPrincipal UserDetails userDetails) {
        Long sellerId = getUserId(userDetails);
        List<PetResponse> pets = petRepository.findBySeller_UserId(sellerId)
                .stream().map(PetResponse::fromEntity).collect(Collectors.toList());
        return ResponseEntity.ok(pets);
    }

    @DeleteMapping("/{id}")
    @Transactional
    @Operation(summary = "Delete a pet listing")
    public ResponseEntity<?> deletePet(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        Long sellerId = getUserId(userDetails);
        Pet pet = petRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pet not found"));
        if (!pet.getSeller().getUserId().equals(sellerId))
            return ResponseEntity.status(403).body(new MessageResponse("Not authorized"));
        petRepository.delete(pet);
        return ResponseEntity.ok(new MessageResponse("Pet listing removed"));
    }
}
