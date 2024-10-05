const loadShop = async (req, res) => {
    try {
        let user = null;
        if (req.session.userData) {
            user = await User.findOne({ _id: req.session.userData._id, isBlocked: false });
        }
        
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const skip = (page - 1) * limit;
        const brand = await Category.find({ type: "brand", isListed: true });
        let filter = {};
        
        // Search Filter
        if (req.query.searchQuery) {
            const searchQuery = req.query.searchQuery;
            filter.productName = { $regex: searchQuery, $options: 'i' }; 
        }
  
        // Category Filter
        if (req.query.category) {
            const category = await Category.findOne({ name: req.query.category });
            if (category) {
                if (req.query.type === 'brand') {
                    filter.brand = category._id;
                } else if (req.query.type === 'type') {
                    filter.type = category._id;
                }
            }
        }
  
        // Price Filter
        if (req.query.price) {
            const prices = req.query.price;
            if (!Array.isArray(prices)) {
                req.query.price = [prices];
            }
            const priceFilters = [];
            req.query.price.forEach(price => {
                if (price !== 'all') {
                    const [min, max] = price.split('-').map(Number);
                    priceFilters.push({ price: { $gte: min, $lte: max } });
                }
            });
            if (priceFilters.length > 0) {
                filter.$or = priceFilters;
            }
        }
  
        // Sort Option
        let sortOption = {};
        if (req.query.sortBy === 'priceLowToHigh') {
            sortOption = { price: 1 }; 
        } else if (req.query.sortBy === 'priceHighToLow') {
            sortOption = { price: -1 }; 
        } else if (req.query.sortBy === 'nameAZ') {
            sortOption = { productName: 1 }; 
        } else if (req.query.sortBy === 'nameZA') {
            sortOption = { productName: -1 };
        }
  
        const totalProducts = await Product.countDocuments({ ...filter });
        const products = await Product.find({ ...filter })
            .sort(sortOption) 
            .skip(skip)
            .limit(limit);
  
        const totalPages = Math.ceil(totalProducts / limit);
  
        // Pass sortBy and searchQuery to the EJS template
        res.render('user/shop', {
            products,
            currentPage: page,
            totalPages,
            user,
            brand,
            type,
            sortBy: req.query.sortBy || '', // Pass sortBy
            searchQuery: req.query.searchQuery || '' // Pass searchQuery
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
  };
  