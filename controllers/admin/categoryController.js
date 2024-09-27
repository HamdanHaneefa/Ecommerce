const Brand = require('../../models/brandSchema');




const categoryInfo = async (req,res) =>{
    try {
        if(req.session.admin){
            const userData = await Brand.find({})
            res.render('category', { categories: userData ,url:req.originalUrl});
        }else{
            res.redirect('/admin/login')
        }
       
    } catch (error) {
        console.log('error occured in category Info',error)
        res.redirect('/admin/')
    }
}

const addBrand = async (req,res) =>{
        const {brandName,isActive} = req.body;
        try {
            const existingBrand = await Brand.findOne({ name: { $regex: new RegExp(`^${brandName}$`, 'i') } });            if(existingBrand){
                req.flash("error_msg", "Category Already exists");
                return res.redirect("/admin/category");
            }
            const newBrand = new Brand({
                name:brandName,
                isActive: isActive === 'true' 
            });
            await newBrand.save();
            res.redirect('/admin/category')
        } catch (error) {
            console.log("error occured in add Brand",error)
        }
}

const changeStatus = async (req,res) =>{
    try {
        const {id,isActive} = req.body;
        await Brand.findByIdAndUpdate(
            id,
            { isActive: isActive === 'true' }
    )        
    res.redirect('/admin/category')

    } catch (error) {
        console.log("error in changeStatus")
    }
}
 

const editBrand = async (req, res) => {
    try {
        const { id, name, isActive } = req.body;
        const existingBrand = await Brand.findOne({name:brandName})
        if(existingBrand){
            req.flash("error_msg", "Category Already exists");
            return res.redirect("/admin/category");
        }

        await Brand.findByIdAndUpdate(
            id,
            { name: name, isActive: isActive === 'true' }
        );
        res.redirect('/admin/category');
    } catch (error) {
        console.error("Error happened in editBrand:", error);
        res.status(500).send("Server Error");
    }
};


const deleteBrand = async (req,res) =>{
    try {
        const {id } = req.body
        await Brand.findByIdAndDelete(id);
        return res.redirect('/admin/category')
    } catch (error) {
        console.log("Error happened in delete Brand",error)
        res.redirect('/admin/category')
    }
}

module.exports ={
    categoryInfo,
    addBrand,
    changeStatus,
    editBrand,
    deleteBrand
}