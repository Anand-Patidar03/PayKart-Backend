import { Router } from "express";
import {
  createOrder,
  getUserOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder
} from "../controllers/order.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { isAdmin } from "../middlewares/admin.middlewares.js";
const router = Router();

router.route("/").post(verifyJWT, createOrder);
router.route("/").get(verifyJWT, getUserOrders);
router.route("/getAll/").get(verifyJWT, isAdmin, getAllOrders);
router.route("/:orderId").get(verifyJWT, getOrderById);
router.route("/:orderId").patch(verifyJWT, isAdmin, updateOrderStatus);
router.route("/cancel/:orderId").patch(verifyJWT, cancelOrder);

export default router;
