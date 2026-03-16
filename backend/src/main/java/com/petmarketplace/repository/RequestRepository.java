package com.petmarketplace.repository;

import com.petmarketplace.entity.Request;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Repository
public interface RequestRepository extends JpaRepository<Request, Long> {
    List<Request> findByBuyer_UserId(Long buyerId);
    List<Request> findByPet_Seller_UserId(Long sellerId);
    List<Request> findByBuyer_UserIdAndStatus(Long buyerId, Request.RequestStatus status);
 
    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("DELETE FROM Request r WHERE r.buyer.userId = :buyerId AND r.status = :status")
    void deleteByBuyer_UserIdAndStatus(@Param("buyerId") Long buyerId, @Param("status") Request.RequestStatus status);
}
