import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Payment } from "../models/payment.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Order } from "../models/order.models.js";
import crypto from "crypto";
import mongoose from "mongoose";

const initiatePayment = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { paymentProvider = "TEST", currency = "INR" } = req.body;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError(400, "Invalid order id");
  }

  // ALLOWED GATEWAYS
  const supportedGateways = ["RAZORPAY", "STRIPE", "PAYPAL", "PHONEPE", "TEST", "COD"];
  if (!supportedGateways.includes(paymentProvider)) {
    throw new ApiError(400, `Unsupported payment provider. Supported: ${supportedGateways.join(", ")}`);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
    }).session(session);

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    if (order.paymentStatus === "SUCCESS") {
      res.status(200).json(new ApiResponse(200, {}, "Order is already paid"));
      await session.abortTransaction();
      return;
    }

    const existingPayment = await Payment.findOne({ order: order._id }).session(session);
    if (existingPayment) {
      // If pending, return existing.
      if (existingPayment.status === "PENDING") {
        await session.abortTransaction();
        return res.status(200).json(new ApiResponse(200, existingPayment, "Payment already initiated"));
      }
    }

    // Mock Provider ID generation for TEST/COD
    let providerPaymentId = `pay_${crypto.randomBytes(8).toString("hex")}`;

    // In a real app, you would call Razorpay/Stripe API here to get an order ID
    if (paymentProvider === "COD") {
      providerPaymentId = `cod_${orderId}`;
    }

    const payment = await Payment.create([{
      user: req.user._id,
      order: order._id,
      amount: order.totalAmount,
      status: paymentProvider === "COD" ? "PENDING" : "PENDING",
      providerPaymentId: providerPaymentId,
      paymentProvider,
      currency,
    }], { session });

    order.paymentStatus = "PENDING";
    await order.save({ session });

    await session.commitTransaction();

    return res
      .status(201)
      .json(new ApiResponse(201, payment[0], "Payment initiated successfully"));

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { providerPaymentId, providerOrderId, signature } = req.body;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError(400, "Invalid order id");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payment = await Payment.findOne({
      order: orderId,
      user: req.user._id,
    }).session(session);

    if (!payment) {
      throw new ApiError(404, "Payment record not found");
    }

    if (payment.status === "SUCCESS") {
      await session.abortTransaction();
      return res.status(200).json(new ApiResponse(200, payment, "Payment already verified"));
    }

    let isValid = false;

    if (payment.paymentProvider === "TEST") {
      isValid = signature === "test_secret_key";
      if (!isValid) throw new ApiError(400, "Invalid Test Signature (use 'test_secret_key')");

    } else if (payment.paymentProvider === "COD") {

      isValid = true;

    } else {
      let secretKey;

      if (payment.paymentProvider === "RAZORPAY") {
        secretKey = process.env.RAZORPAY_KEY_SECRET;

      }

      else {
        throw new ApiError(400, "Unsupported payment provider for verification");
      }

      if (!secretKey) {
        throw new ApiError(500, "Payment secret key not configured");
      }

      const body = `${providerOrderId}|${providerPaymentId}`;
      const expectedSignature = crypto
        .createHmac("sha256", secretKey)
        .update(body)
        .digest("hex");

      isValid = expectedSignature === signature;
    }

    if (!isValid) {
      payment.status = "FAILED";
      await payment.save({ session });
      await session.commitTransaction();
      throw new ApiError(400, "Payment verification failed");
    }


    payment.status = "SUCCESS";
    await payment.save({ session });

    const order = await Order.findById(orderId).session(session);
    order.paymentStatus = "SUCCESS";
    order.isPaid = true;
    order.paidAt = new Date();
    await order.save({ session });

    await session.commitTransaction();

    return res
      .status(200)
      .json(new ApiResponse(200, payment, "Payment verified successfully"));

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }
});

const getPaymentStatus = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    throw new ApiError(400, "Invalid payment id");
  }

  const payment = await Payment.findOne({
    _id: paymentId,
    user: req.user._id,
  });

  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { status: payment.status, provider: payment.paymentProvider },
        "Payment status fetched successfully"
      )
    );
});

export { initiatePayment, verifyPayment, getPaymentStatus };
