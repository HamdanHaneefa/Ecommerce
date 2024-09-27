const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const Varient = require('../../models/varientSchema')

const productInfo = async (req, res) => {
  try {
    const products = await Product.find({});
    const brands = await Brand.find();
    res.render("product", { products: products, url: req.originalUrl, brand: brands });
  } catch (error) {
    console.log("Error in ProductInfo ", error);
  }
};

const getProductAddPage = async (req, res) => {
  try {
    const brand = await Brand.find({ isActive: true });
    res.render("product-add", { brand: brand, url: req.originalUrl });
  } catch (error) {
    console.log("Error occured in Product add ", error);
    res.redirect("/pageError");
  }
};


const addProducts = async (req, res) => {
  try {
    const { name, brand, type, connectionType, description } = req.body;

    if (!name || !brand || !type || !connectionType || !description) {
      req.flash('error_msg', 'Missing required product details');
      return res.redirect('/admin/addProducts');
    }

    const productExist = await Product.findOne({ productName: name });
    
    if (productExist) {
      req.flash('error_msg', 'Product Already Exists');
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

      const uploadDir = path.join(__dirname,'../../public/uploads/product-images');

      // Ensure the upload directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Save the file to disk manually after validation
      const filePath = path.join(uploadDir, resizedImageFilename);
      console.log("Saving file to:", filePath);
      fs.writeFileSync(filePath, file.buffer);
    }

    // Save product details to the database
    const newProduct = new Product({
      productName: name,
      brand,
      type,
      connectionType,
      description,
      ProductImage: resizedImageFilename, 
    });

    const savedProduct = await newProduct.save();

    return res.status(200).redirect('/admin/product')
  } catch (error) {
    console.error("Error saving product:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while saving the product.",
    });
  }
};

const productBlocked = async (req,res) =>{
  try {
    let id = req.query.id;
    await Product.updateOne({_id:id},{$set:{isActive:true}})
    res.redirect("/admin/product")
} catch (error) {
    console.log("Error in customerBlocked ",error)
    res.redirect("/pageError")
}
}

const productUnblocked = async (req,res) =>{
  try {
    let id = req.query.id;
    await Product.updateOne({_id:id},{$set:{isActive:false}})
    res.redirect("/admin/product")
} catch (error) {
    console.log("Error in customerUnblocked ",error)
    res.redirect("/pageError")
}
}

const deleteProduct = async (req,res) =>{
  try {
    const productId = req.params.id;
    await Product.findByIdAndDelete(productId);
    return res.redirect('/admin/product')
  } catch (error) {
    console.log("Error happened in delete Product",error)
    res.redirect('/admin/product')
  }
}


const productUpdate = async (req,res) =>{
  try {
    const { productName, brand, type, connectionType, description } = req.body;
    await Product.findByIdAndUpdate(req.params.id, {
        productName,
        brand,
        type,
        connectionType,
        description,
    });
    res.redirect('/admin/product');
  } catch (error) {
    console.log("Error happened in update Product",error)
    res.redirect('/admin/product')
  }
}
// Load Variant
const loadVarient = async (req, res) => {
  try {
    
      const productId = req.params.id;
      const product = await Product.findOne({ _id: productId, isActive: true });
      const variants = await Product.find({ productId: productId });
      res.render('product-varient', {
          product: product,
          variants: variants,
          url: req.originalUrl
      });
  } catch (error) {
      res.json("Error occurred", error);
  }
};

// Add Variant
// const addVarient = async (req, res) => {
//   try {
//     console.log("ADD VARIANT");
   
//   } catch (error) {
//       console.log("Error occurred in addVariant", error);
//       res.redirect('/admin/product')
//   }
// };


const addVarient = async (req, res) => {
    try {
        console.log("ADD VARIANT");

        // Access other form data
        const { color, price, stock, productId } = req.body;
        const uploadedImages = []; // Array to hold image file paths

        // Process uploaded images
        if (req.files) {
            const uploadDir = path.join(__dirname, '../../public/uploads/variant-images');

            // Ensure the upload directory exists
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            for (const file of req.files) {
                const filePath = path.join(uploadDir, file.originalname);
                console.log("Saving file to:", filePath);
                
                // Write the file buffer to disk
                fs.writeFileSync(filePath, file.buffer);
                
                // Store the path or filename in the array
                uploadedImages.push(file.originalname); // or filePath if you want the full path
            }
        }

        // Create a new variant instance
        const newVariant = new Variant({
            productId, // Ensure this comes from your form data
            color,
            image: uploadedImages, // Store the image array
            stock,
            price,
        });

        // Save the new variant to the database
        await newVariant.save();
        console.log("Variant saved successfully!");

        res.status(201).json({ message: 'Variant added successfully!', variant: newVariant });
    } catch (error) {
        console.error("Error occurred in addVariant", error);
        res.status(500).json({ message: 'Error adding variant.' });
    }
};




module.exports = {
  productInfo,
  getProductAddPage,
  addProducts,
  productBlocked,
  productUnblocked,
  deleteProduct,
  productUpdate,
  loadVarient,
  addVarient
};
