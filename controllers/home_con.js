import { getFeaturedProducts, getAllCategories, getAllUniversities } from "../model/home_db.js";

export const getHomePageData = async (req, res) => {
  try {

    const [products, categories, universities] = await Promise.all([

      getFeaturedProducts(),
      getAllCategories(),
      getAllUniversities()
    ]);

    res.status(200).json({
      featuredProducts: products,
      categories,
      universities
    });

  } 
  catch (error) {
    
    res.status(500).json({ error: error.message });
  }
};