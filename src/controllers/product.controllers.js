import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Category } from "../models/category.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

import { Product } from "../models/product.models.js";

const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, stock, images, categoryId, specs } = req.body;
  if (!name || !description || !price || !categoryId || !stock) {
    throw new ApiError(400, "All fields are required");
  }

  const category = await Category.findById(categoryId);

  if (!category || !category.isActive) {
    throw new ApiError(400, "Invalid or inactive category");
  }

  if (!Array.isArray(images) || images.length === 0) {
    throw new ApiError(400, "At least one product image is required");
  }

  const product = await Product.create({
    name,
    description,
    price,
    category: category._id,
    stock,
    images,
    specs: specs || [],
    createdBy: req.user?._id,
  });

  if (!product) {
    throw new ApiError(400, "Product not created");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, product, "Product created successfully"));
});

const getAllProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sort, categoryId, priceRange, search } = req.query;

  const pageNumber = Number(page) || 1;
  const limitNumber = Number(limit) || 10;

  const filter = {
    isActive: true,
  };

  if (search) {
    const searchRegex = new RegExp(search, "i");
    filter.$or = [
      { name: searchRegex },
      { description: searchRegex },
    ];
  }

  if (priceRange) {
    const [minPrice, maxPrice] = priceRange.split("-");

    filter.price = {
      $gte: Number(minPrice),
      $lte: Number(maxPrice),
    };
  }

  if (req.query.rating) {
    const minRating = Number(req.query.rating);
    if (!isNaN(minRating)) {
      filter.avgRating = { $gte: minRating };
    }
  }

  if (categoryId) {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      throw new ApiError(400, "Invalid category id");
    }
    filter.category = new mongoose.Types.ObjectId(categoryId);
  }

  const sortBy = req.query.sort || "-createdAt";

  let product = await Product.find(filter)
    .sort(sortBy)
    .limit(limitNumber)
    .populate("category", "name");

  if (req.user?.role === "ADMIN") {
    product = product.populate("createdBy", "fullName email");
  }

  const products = await product;
  const totalProducts = await Product.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        products,
        totalProducts,
        currentPage: pageNumber,
        totalPages: Math.ceil(totalProducts / limitNumber),
      },
      "All products fetched successfully"
    )
  );
});

import { Rating } from "../models/rating.models.js";

const getProductById = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, "Invalid product id");
  }

  let products = await Product.findById(productId)
    .populate("category", "name")
    .populate("createdBy", "fullName email");

  if (!products) {
    throw new ApiError(404, "Product not found");
  }

  // Self-Healing: If ratings are 0, check if we missed any reviews
  if (products.ratingCnt === 0) {
    const reviewCount = await Rating.countDocuments({ product: productId });
    if (reviewCount > 0) {
      const stats = await Rating.aggregate([
        { $match: { product: new mongoose.Types.ObjectId(productId) } },
        {
          $group: {
            _id: "$product",
            avgRating: { $avg: "$rating" },
            ratingCnt: { $sum: 1 },
          },
        },
      ]);

      if (stats.length > 0) {
        products.avgRating = stats[0].avgRating;
        products.ratingCnt = stats[0].ratingCnt;
        await products.save();
      }
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, products, "Product fetched successfully"));
});

const updateProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { name, description, price, images, categoryId, stock, specs } = req.body;

  if (!name && !description && !price && !images && !categoryId && !stock && !specs) {
    throw new ApiError(400, "At least one field is required");
  }


  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, "Invalid product id");
  }

  const product = await Product.findById(productId);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (categoryId) {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      throw new ApiError(400, "Invalid category id");
    }

    const category = await Category.findById(categoryId);
    if (!category || !category.isActive) {
      throw new ApiError(400, "Invalid or inactive category");
    }

    product.category = categoryId;
  }

  if (name) product.name = name;
  if (description) product.description = description;
  if (price) product.price = price;
  if (stock) product.stock = stock;
  if (specs) product.specs = specs;

  if (images) {
    if (!Array.isArray(images) || images.length === 0) {
      throw new ApiError(400, "Images must be a non-empty array");
    }
    product.images = images;
  }

  await product.save();

  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product updated successfully"));
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, "Invalid product id");
  }

  const product = await Product.findByIdAndUpdate(
    productId,
    { $set: { isActive: false } },
    { new: true }
  );

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product deleted successfully"));
});

export {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
