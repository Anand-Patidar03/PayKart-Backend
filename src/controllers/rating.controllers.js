import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Rating } from "../models/rating.models.js";
import { Product } from "../models/product.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

const addReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { rating, review } = req.body;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, "Invalid product id");
  }

  if (!rating || !review) {
    throw new ApiError(400, "All fields are required");
  }

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const existingReview = await Rating.findOne({
    user: req.user._id,
    product: productId,
  });

  if (existingReview) {
    throw new ApiError(400, "You have already reviewed this product");
  }

  const reviewProduct = await Rating.create({
    user: req.user._id,
    product: productId,
    rating,
    review,
  });

  if (!reviewProduct) {
    throw new ApiError(400, "product review not created");
  }

  const stats = await Rating.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(productId),
      },
    },
    {
      $group: {
        _id: "$product",
        avgRating: { $avg: "$rating" },
        ratingCnt: { $sum: 1 },
      },
    },
  ]);

  console.log("DEBUG STATS for Product:", productId);
  console.log("Stats Result:", JSON.stringify(stats, null, 2));

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      avgRating: stats[0].avgRating,
      ratingCnt: stats[0].ratingCnt,
    });
    console.log("Updated Product with stats:", stats[0]);
  } else {
    
    await Product.findByIdAndUpdate(productId, {
      avgRating: rating,
      ratingCnt: 1,
    });
    console.log("Updated Product with initial stats");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, reviewProduct, "review added successfully"));
});

const updateReview = asyncHandler(async (req, res) => {
  const { ratingId } = req.params;
  const { rating, review } = req.body;

  if (!mongoose.Types.ObjectId.isValid(ratingId)) {
    throw new ApiError(400, "Invalid  or ratingId");
  }

  if (!rating && !review) {
    throw new ApiError(400, "atleast one field is required");
  }

  const reviewProduct = await Rating.findOne({
    _id: ratingId,
    user: req.user._id,
  });

  if (!reviewProduct) {
    throw new ApiError(404, "Product review not found");
  }

  if (rating) reviewProduct.rating = rating;
  if (review) reviewProduct.review = review;

  await reviewProduct.save();

  const stats = await Rating.aggregate([
    {
      $match: {
        product: reviewProduct.product,
      },
    },
    {
      $group: {
        _id: "$product",
        avgRating: { $avg: "$rating" },
        ratingCnt: { $sum: 1 },
      },
    },
  ]);

  await Product.findByIdAndUpdate(reviewProduct.product, {
    avgRating: stats[0]?.avgRating || 0,
    ratingCnt: stats[0]?.ratingCnt || 0,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, reviewProduct, "review updated successfully"));
});

const deleteReview = asyncHandler(async (req, res) => {
  const { ratingId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(ratingId)) {
    throw new ApiError(400, "Invalid  or ratingId");
  }

  const reviewProduct = await Rating.findOneAndDelete({
    _id: ratingId,
    user: req.user._id,
  });

  if (!reviewProduct) {
    throw new ApiError(404, "Product review not found");
  }

  const stats = await Rating.aggregate([
    {
      $match: {
        product: reviewProduct.product,
      },
    },
    {
      $group: {
        _id: "$product",
        avgRating: { $avg: "$rating" },
        ratingCnt: { $sum: 1 },
      },
    },
  ]);

  await Product.findByIdAndUpdate(reviewProduct.product, {
    avgRating: stats[0]?.avgRating || 0,
    ratingCnt: stats[0]?.ratingCnt || 0,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, reviewProduct, "review deleted successfully"));
});

const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, "Invalid  or productId");
  }

  const product = await Product.findById(productId);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const reviews = await Rating.find({ product: productId })
    .populate("user", "fullName email") 
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(200, reviews, "Product reviews fetched successfully")
    );
});

export {
  addReview,
  updateReview,
  deleteReview,
  getProductReviews,
};
