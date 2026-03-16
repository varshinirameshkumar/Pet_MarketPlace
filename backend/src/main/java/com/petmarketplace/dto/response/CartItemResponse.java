package com.petmarketplace.dto.response;

import com.petmarketplace.entity.CartItem;
import lombok.Data;

@Data
public class CartItemResponse {
    private Long cartItemId;
    private PetResponse pet;

    public static CartItemResponse fromEntity(CartItem item) {
        CartItemResponse r = new CartItemResponse();
        r.setCartItemId(item.getCartId());
        r.setPet(PetResponse.fromEntity(item.getPet()));
        return r;
    }
}
