import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Cart } from "../models/cart.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Order } from "../models/order.models.js";
import { Product } from "../models/product.models.js";
import mongoose from "mongoose";

const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod } = req.body;

  const cart = await Cart.findOne({ user: req.user._id })
    .populate("items.product");


  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  if (!shippingAddress || !paymentMethod) {
    throw new ApiError(400, "All fields are required");
  }

  const orderItems = [];
  const validItems = [];

  for (const item of cart.items) {
    if (!item.product) {
    
      continue;
    }
    if (item.product.stock < item.quantity) {
      throw new ApiError(400, `Insufficient stock for ${item.product.name}`);
    }

    orderItems.push({
      product: item.product._id,
      quantity: item.quantity,
      priceAtThatTime: item.priceAtThatTime,
    });
    validItems.push(item);
  }

  if (orderItems.length === 0) {
    throw new ApiError(400, "No valid items in cart to order");
  }

  const order = await Order.create({
    user: req.user._id,
    orderItems,
    shippingAddress,
    paymentMethod,
    paymentStatus: "PENDING",
    totalAmount: cart.totalPrice,
    paidAt: new Date(),
    orderStatus: "PENDING",
    deliveredAt: null,
  });

  if (!order) {
    throw new ApiError(400, "Order not created");
  }

  for (const item of validItems) {
    item.product.stock -= item.quantity;
    await item.product.save();
  }

  await Cart.findOneAndDelete({ user: req.user._id });

  return res
    .status(201)
    .json(new ApiResponse(201, order, "Order created successfully"));
});

const getUserOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).populate(
    "orderItems.product"
  );

  if (!orders) {
    throw new ApiError(404, "Orders not found");
  }

  if (orders.length === 0) {
    return res.status(200).json(new ApiResponse(200, [], "No orders found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, orders, "Orders fetched successfully"));
});

const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError(400, "Invalid order id");
  }

  const order = await Order.findOne({
    _id: orderId,
    user: req.user._id,
  }).populate("orderItems.product");

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order fetched successfully"));
});

const getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sort } = req.query;

  const pageNumber = Number(page) || 1;
  const limitNumber = Number(limit) || 10;
  const skip = (pageNumber - 1) * limitNumber;

  const order = await Order.find()
    .sort(sort)
    .skip(skip)
    .limit(limitNumber)
    .populate("user", "fullName email")
    .populate("orderItems.product");

  if (order.length === 0) {
    throw new ApiError(404, "Orders not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Orders fetched successfully"));
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { orderStatus } = req.body;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError(400, "Invalid order id");
  }

  const order = await Order.findOne({
    _id: orderId,
    user: req.user._id,
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  order.orderStatus = orderStatus;

  if (orderStatus === "DELIVERED") {
    order.deliveredAt = new Date();
  }

  await order.save();

  return res
    .status(200)
    .json(new ApiResponse(200, order, "order status updated successfully"));
});


const cancelOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError(400, "Invalid order id");
  }

  const order = await Order.findOne({
    _id: orderId,
    user: req.user._id,
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (["DELIVERED", "CANCELLED"].includes(order.orderStatus)) {
    throw new ApiError(400, "Order cannot be CANCELLED");
  }

  order.orderStatus = "CANCELLED";
  order.cancelledAt = new Date();

  await order.save();

  
  for (const item of order.orderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity },
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order cancelled successfully"));
});

export {
  createOrder,
  getUserOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
};
