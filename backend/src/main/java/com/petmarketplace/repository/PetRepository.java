package com.petmarketplace.repository;

import com.petmarketplace.entity.Pet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PetRepository extends JpaRepository<Pet, Long> {

    @Query("SELECT p FROM Pet p JOIN FETCH p.seller s WHERE p.availability = true")
    List<Pet> findByAvailabilityTrue();

    List<Pet> findBySeller_UserId(Long sellerId);

    @Query("SELECT p FROM Pet p JOIN FETCH p.seller s WHERE p.availability = true " +
           "AND (:category IS NULL OR LOWER(p.category) = LOWER(:category)) " +
           "AND (:breed IS NULL OR LOWER(p.breed) LIKE LOWER(CONCAT('%', :breed, '%'))) " +
           "AND (:location IS NULL OR LOWER(p.location) LIKE LOWER(CONCAT('%', :location, '%'))) " +
           "AND (:type IS NULL OR p.type = :type)")
    List<Pet> filterPets(
            @Param("category") String category,
            @Param("breed") String breed,
            @Param("location") String location,
            @Param("type") Pet.PetType type
    );
}
