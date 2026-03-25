import { Router } from "express";
import {
  registerUser,
  loginUser,
  googleLogin,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetail, 
} from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";

const router = Router();

router.route("/register").post(upload.none(), registerUser);

router.route("/login").post(loginUser);

router.route("/google-login").post(googleLogin);

router.route("/logout").post(logoutUser);

router.route("/refresh_token").post(refreshAccessToken);

router.route("/change-password").post(verifyJWT, changeCurrentPassword);

router.route("/current-user").post(verifyJWT, getCurrentUser);

router.route("/account-detail").patch(verifyJWT, updateAccountDetail);

export default router;
