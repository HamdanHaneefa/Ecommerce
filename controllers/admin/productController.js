const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const Cart = require('../../models/cartSchema');
const fs = require("fs");
const path = require("path");
const { error } = require("console");


// Product Information
const productInfo = async (req, res) => {
  try {
    const products = await Product.find({});
    const brands = await Brand.find();
    res.render("product", { products: products, url: req.originalUrl, brand: brands });
  } catch (error) {
    console.log("Error in ProductInfo", error);
  }
};

// Get Add Product Page
const getProductAddPage = async (req, res) => {
  try {
    const brand = await Brand.find({ isActive: true });
    res.render("product-add", { brand: brand, url: req.originalUrl });
  } catch (error) {
    console.log("Error occurred in Product add", error);
    res.redirect("/pageError");
  }
};

// Add Products
const addProducts = async (req, res) => {
  try {
    const { name, brand, type, connectionType, price, stock, description} = req.body;

    if (!name || !brand || !type || !connectionType || !price || !stock || !description ) {
      req.flash('error_msg', 'Missing required product details');
      return res.redirect('/admin/addProducts');
    }

    const productExist = await Product.findOne({ productName: name });
    
    if (productExist) {
      req.flash('error_msg', 'Product Already Exists');
      return res.redirect('/admin/addProducts');
    }

    if (isNaN(price) || Number(price) <= 0) {
      req.flash('error_msg', 'Price must be a number greater than zero.');
      return res.redirect('/admin/addProducts');
    }

    if (isNaN(stock) || Number(stock) <= 0) {
      req.flash('error_msg', 'Stock must be a number greater than zero.');
      return res.redirect('/admin/addProducts');
    }

    if (!req.files || req.files.length === 0 || req.files[0].size === 0) {
      console.error("No valid file found in request");
      return res.status(400).json({ success: false, error: "No image file uploaded or file is empty" });
    }

    let resizedImageFilename = "";
    if (req.files && req.files.length > 0) {
      const file = req.files[0];
      const originalName = path.parse(file.originalname);
      const fileExtension = originalName.ext;
      resizedImageFilename = `${originalName.name.replace(/\s+/g, '-')}-${Date.now()}${fileExtension}`;

      const uploadDir = path.join(__dirname, '../../public/uploads/product-images');

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, resizedImageFilename);
      console.log("Saving file to:", filePath);
      fs.writeFileSync(filePath, file.buffer);
    }

    const newProduct = new Product({
      productName: name,
      brand,
      type,
      connectionType,
      price,
      stock,
      description,
      ProductImage: resizedImageFilename, 
    });

    await newProduct.save();

    return res.status(200).redirect('/admin/product');
  } catch (error) {
    console.error("Error saving product:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while saving the product.",
    });
  }
};

// Block Product
const productBlocked = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isActive: true } });
    res.redirect("/admin/product");
  } catch (error) {
    console.log("Error in customerBlocked", error);
    res.redirect("/pageError");
  }
};

// Unblock Product
const productUnblocked = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isActive: false } });
    res.redirect("/admin/product");
  } catch (error) {
    console.log("Error in customerUnblocked", error);
    res.redirect("/pageError");
  }
};


// Update Product
const productUpdate = async (req, res) => {
  try {
    const { productName, brand, type, connectionType, price, stock, description } = req.body;

    if (!productName || !brand || !type || !connectionType || !price || !stock || !description) {
      req.flash('error_msg', 'All fields are required.');
      return res.redirect(`/admin/editProduct/${req.params.id}`);
    }

    if (isNaN(price) || Number(price) <= 0) {
      req.flash('error_msg', 'Price must be a number greater than zero.');
      return res.redirect(`/admin/editProduct/${req.params.id}`);
    }

    if (isNaN(stock) || Number(stock) <= 0) {
      req.flash('error_msg', 'Stock must be a number greater than zero.');
      return res.redirect(`/admin/editProduct/${req.params.id}`);
    }

    await Product.findByIdAndUpdate(req.params.id, {
      productName,
      brand,
      type,
      connectionType,
      price,
      stock,
      description,
    });

    req.flash('success_msg', 'Product updated successfully.');
    res.redirect('/admin/product');

  } catch (error) {
    console.log("Error occurred while updating the product:", error);
    req.flash('error_msg', 'An error occurred while updating the product.');
    res.redirect('/admin/product');
  }
};


// Load Variant
const loadVariant = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) {
      return res.status(404).send('Product not found or inactive');
    }
    res.render('product-varient', {
      product: product,
      variants: product.variants, 
      url: req.originalUrl,
    });
  } catch (error) {
    console.error("Error occurred in loadVariant:", error);
    res.status(500).json({ message: 'Error loading variant.' });
  }
};

// Add Variant
const addVarient = async (req, res) => {
  try {
    const { color, price, stock ,description} = req.body;
    const productId = req.params.id;
    if (!color || !price || !stock || !productId) {
      return res.status(400).json({ message: 'Missing required variant details' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      req.flash('error_msg', 'Missing required product details');
      return res.redirect('/admin/product-varient/' + productId)
    }

    if (isNaN(price) || Number(price) <= 0) {
      console.log("PRICE ERROR")
      req.flash('error_msg', 'Price must be a number greater than zero.');
      return res.redirect('/admin/product-varient/' + productId);
    }

    if (isNaN(stock) || Number(stock) < 0) {
      console.log("STOCK ERROR")
      req.flash('error_msg', 'Stock must be a non-negative number.');
      return res.redirect('/admin/product-varient/' + productId);
    }
    
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      const uploadDir = path.join(__dirname, '../../public/uploads/variant-images');

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      for (const file of req.files) {
        if (file.size === 0) {
          console.error("Empty file found, skipping...");
          continue;
        }

        const originalName = path.parse(file.originalname);
        const fileExtension = originalName.ext;
        const resizedImageFilename = `${originalName.name.replace(/\s+/g, '-')}-${Date.now()}${fileExtension}`;
        const filePath = path.join(uploadDir, resizedImageFilename);

        console.log("Saving file to:", filePath);
        fs.writeFileSync(filePath, file.buffer);
        uploadedImages.push(resizedImageFilename);
      }
    }

    product.variants.push({
      color,
      images: uploadedImages,
      stock,
      price,
      salePrice:price,
      description
    });
    await product.save();
    console.log("Variant Saved to product succefully")
    return res.redirect(`/admin/product-varient/${productId}`);
  } catch (error) {
    console.error("Error occurred in addVariant", error);
    return res.status(500).json({ message: 'Error adding variant.',error:error });
  }
};

// TOGLE VARIENT 
const toggleVariant = async (req, res) => {
  try {
    const variantId = req.params.id; 
    const productId = req.query.productId;  
    const isActive = req.query.isActive === 'true'; 

    const product = await Product.findOne({ _id: productId, 'variants._id': variantId });

    if (!product) {
      return res.redirect('/admin/product');
    }

    await Product.updateOne(
      { _id: productId, 'variants._id': variantId },
      { $set: { 'variants.$.isActive': isActive } } 
    );

    res.redirect(`/admin/product-varient/${productId}`);
  } catch (error) {
    console.error('Error occurred in toggleVariant:', error);
    res.redirect('/admin/product');
  }
};


// Delete Variant
const deleteVariant = async (req, res) => {
  try {
    const variantId = req.params.id;
    const productId = req.query.productId;

    const updatedProduct = await Product.findOneAndUpdate(
      { _id: productId },
      { $pull: { variants: { _id: variantId } } }
    );

    if (!updatedProduct) {
      return res.status(404).send("Product not found");
    }

    res.redirect(`/admin/product-varient/${productId}`);
  } catch (error) {
    console.error("Error occurred in deleteVariant:", error);
    res.redirect('/admin/product');
  }
};


const editVariant = async (req, res) => {
  const { variantId, productId, color, price, stock, isActive } = req.body;
  try {
    if (!variantId || !productId || !color || !price || stock === undefined || isActive === undefined) {
      req.flash('error_msg', 'Missing required fields');
      return res.redirect(`/admin/product-varient/${productId}`);
    }
    const product = await Product.findOne({ _id: productId, 'variants._id': variantId });
    
    if (!product) {
      req.flash('error_msg', 'Product or variant not found');
      return res.redirect(`/admin/product-varient/${productId}`);
    }

    
    if (isNaN(price) || Number(price) <= 0) {
      console.log("PRICE ERROR")
      req.flash('error_msg', 'Price must be a number greater than zero.');
      return res.redirect('/admin/product-varient/' + productId);
    }

    if (isNaN(stock) || Number(stock) < 0) {
      console.log("STOCK ERROR")
      req.flash('error_msg', 'Stock must be a non-negative number.');
      return res.redirect('/admin/product-varient/' + productId);
    }

    let salePrice = product.offerPercentage ? (price * product.offerPercentage ) / 100 : price
  
    await Product.updateOne(
      { _id: productId, 'variants._id': variantId },
      {
        $set: {
          'variants.$.color': color,
          'variants.$.price': price,
          'variants.$.salePrice': salePrice,
          'variants.$.stock': stock,
          'variants.$.isActive': isActive === 'true',
        },
      }
    );

    await Cart.updateMany(
      { 'items.variantId': variantId },
      {
        $set: {
          'items.$[elem].price': price, 
          'items.$[elem].stock': stock,
        },
      },
      {
        arrayFilters: [{ 'elem.variantId': variantId }],
      }
    );

    res.redirect(`/admin/product-varient/${productId}`);
  } catch (error) {
    console.error('Error occurred in editVariant:', error);
    res.redirect(`/admin/product/${productId}?error=Unable to update variant`);
  }
};


module.exports = {
  productInfo,
  getProductAddPage,
  addProducts,
  productBlocked,
  productUnblocked,
  productUpdate,
  loadVariant,
  addVarient,
  toggleVariant,
  deleteVariant,
  editVariant
};
