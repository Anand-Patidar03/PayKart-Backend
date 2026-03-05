import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { Category } from "../models/category.models.js";
import mongoose from "mongoose";

const createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    throw new ApiError(400, "All fields are required");
  }

  const existingCategory = await Category.findOne({
    name: name.trim().toLowerCase(),
  });

  if (existingCategory) {
    if (existingCategory.isActive) {
      throw new ApiError(409, "Category already exists");
    } else {
      
      existingCategory.isActive = true;
      existingCategory.description = description || existingCategory.description;
      existingCategory.createdBy = req.user?._id;
      await existingCategory.save();

      return res
        .status(200) 
        .json(new ApiResponse(200, existingCategory, "Category reactivated successfully"));
    }
  }

  const category = await Category.create({
    name: name.trim().toLowerCase(),
    description,
    createdBy: req.user?._id,
  });

  if (!category) {
    throw new ApiError(400, "Category not created");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, category, "Category created successfully"));
});

const getAllCategory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sort } = req.query;

  const pageNumber = Number(page) || 1;
  const limitNumber = Number(limit) || 10;

  const filter = {
    isActive: true,
  };

  const sortBy = req.query.sort || "-createdAt";

  let category = await Category.find(filter).sort(sort).limit(limitNumber);

  if (req.user?.role === "ADMIN") {
    category = query.populate("createdBy", "fullName email");
  }

  const totalCategory = await Category.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        category,
        totalCategory,
        currentPage: pageNumber,
        totalPages: Math.ceil(totalCategory / limitNumber),
      },
      "All category fetched successfully"
    )
  );
});

const getCategoryById = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new ApiError(400, "Invalid category id");
  }

  const category = await Category.findOne({
    _id: categoryId,
    isActive: true,
  });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, category, "Category fetched successfully"));
});

const updateCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { name, description } = req.body;

  if (!name && !description) {
    throw new ApiError(400, "At least one field is required");
  }

  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new ApiError(400, "Invalid category id");
  }

  const category = await Category.findOne({
    _id: categoryId,
    isActive: true,
  });

  if (!category || !category.isActive) {
    throw new ApiError(404, "Category not found");
  }

  if (name) {
    const existingCategory = await Category.findOne({
      name: name.toLowerCase().trim(),
      _id: { $ne: categoryId },
    });

    if (existingCategory) {
      throw new ApiError(409, "Category already exists");
    }

    category.name = name.toLowerCase().trim();
  }

  if (description) category.description = description;

  await category.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, category, "Category updated successfully"));
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new ApiError(400, "Invalid category id");
  }

  const category = await Category.findOneAndUpdate(
    {
      _id: categoryId,
      isActive: true,
    },
    { $set: { isActive: false } },
    { new: true }
  );

  if (!category) {
    throw new ApiError(404, "Category not found or already deleted");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Category deleted successfully"));
});

export {
  createCategory,
  getAllCategory,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
