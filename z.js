const Cart = require('./cartSchema');
const Product = require('./productSchema');

// Populate the cart with productId and variantId
Cart.find({ userId: someUserId })
    .populate('items.productId') // Populate the product
    .then(carts => {
        carts.forEach(cart => {
            cart.items.forEach(item => {
                // Now, `productId` is populated
                const product = item.productId; 

                // Find the variant inside the product
                const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());

                // Assign the variant to the cart item
                item.variant = variant; // You can now access the full variant details in `item.variant`
            });
        });

        // Now you can return the carts with fully populated variants
        
    })
    .catch(err => console.log(err));
