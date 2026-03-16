package com.petmarketplace.controller;

import com.petmarketplace.entity.Order;
import com.petmarketplace.exception.ResourceNotFoundException;
import com.petmarketplace.repository.OrderRepository;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.model.Event;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/payment")
@Tag(name = "Payment", description = "Stripe payment integration")
public class PaymentController {

    @Autowired private OrderRepository orderRepository;

    @Value("${stripe.webhook.secret}")
    private String webhookSecret;

    @PostMapping("/create-checkout-session")
    @Operation(summary = "Create a Stripe checkout session for an order")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> createCheckoutSession(@RequestBody Map<String, Object> body) throws StripeException {
        Long orderId = Long.valueOf(body.get("orderId").toString());
        String successUrl = body.getOrDefault("successUrl", "http://localhost:3000/payment/success").toString();
        String cancelUrl  = body.getOrDefault("cancelUrl",  "http://localhost:3000/payment/cancel").toString();

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        BigDecimal price = order.getRequest().getPet().getPrice();
        if (price == null || price.compareTo(BigDecimal.ZERO) <= 0)
            return ResponseEntity.badRequest().body(Map.of("message", "No payment required for adoption"));

        long amountInCents = price.multiply(BigDecimal.valueOf(100)).longValue();

        SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(successUrl + "?session_id={CHECKOUT_SESSION_ID}")
                .setCancelUrl(cancelUrl)
                .addLineItem(SessionCreateParams.LineItem.builder()
                        .setQuantity(1L)
                        .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                .setCurrency("usd")
                                .setUnitAmount(amountInCents)
                                .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                        .setName(order.getRequest().getPet().getBreed() + " - Pet Purchase")
                                        .setDescription("Order #" + orderId)
                                        .build())
                                .build())
                        .build())
                .putMetadata("orderId", orderId.toString())
                .build();

        Session session = Session.create(params);

        // Save session ID to order
        order.setStripeSessionId(session.getId());
        orderRepository.save(order);

        return ResponseEntity.ok(Map.of(
            "sessionId", session.getId(),
            "checkoutUrl", session.getUrl()
        ));
    }

    @GetMapping("/confirm")
    @Operation(summary = "Confirm payment session status (fallback for development)")
    public ResponseEntity<?> confirmPayment(@RequestParam String session_id) throws StripeException {
        Session session = Session.retrieve(session_id);
        if ("paid".equals(session.getPaymentStatus())) {
            String orderId = session.getMetadata().get("orderId");
            return orderRepository.findById(Long.parseLong(orderId)).map(order -> {
                order.setPaymentStatus(Order.PaymentStatus.PAID);
                order.setStatus(Order.OrderStatus.COMPLETED); // Set to COMPLETED
                order.setStripePaymentIntentId(session.getPaymentIntent());
                orderRepository.save(order);
                return ResponseEntity.ok(Map.of("message", "Payment confirmed", "orderId", orderId));
            }).orElseThrow(() -> new ResourceNotFoundException("Order not found for session"));
        }
        return ResponseEntity.status(400).body(Map.of("message", "Payment not completed"));
    }

    @PostMapping("/webhook")
    @Operation(summary = "Stripe webhook handler")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String payload,
            HttpServletRequest request) {
        String sigHeader = request.getHeader("Stripe-Signature");
        try {
            Event event = Webhook.constructEvent(payload, sigHeader, webhookSecret);

            if ("checkout.session.completed".equals(event.getType())) {
                Session session = (Session) event.getDataObjectDeserializer()
                        .getObject().orElseThrow();
                String orderId = session.getMetadata().get("orderId");
                orderRepository.findById(Long.parseLong(orderId)).ifPresent(order -> {
                    order.setPaymentStatus(Order.PaymentStatus.PAID);
                    order.setStatus(Order.OrderStatus.COMPLETED); // Set to COMPLETED
                    order.setStripePaymentIntentId(session.getPaymentIntent());
                    orderRepository.save(order);
                });
            }

            return ResponseEntity.ok("Webhook handled");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Webhook error: " + e.getMessage());
        }
    }
}
