package com.petmarketplace.repository;

import com.petmarketplace.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findBySeller_UserId(Long sellerId);
    List<Order> findByRequest_Buyer_UserId(Long buyerId);
    Optional<Order> findByStripePaymentIntentId(String paymentIntentId);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM Order o WHERE o.request.buyer.userId = :buyerId AND o.status = :status")
    void deleteByRequest_Buyer_UserIdAndStatus(@Param("buyerId") Long buyerId, @Param("status") Order.OrderStatus status);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM Order o WHERE o.seller.userId = :sellerId AND o.status = :status")
    void deleteBySeller_UserIdAndStatus(@Param("sellerId") Long sellerId, @Param("status") Order.OrderStatus status);
}
