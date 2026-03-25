import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateAccessandRefreshToken = async function (userID) {
  try {
    const user = await User.findById(userID);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something error occured while generating access and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { email, fullName, password } = req.body;

  if ([fullName, email, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All field are required");
  }

  const existedUser = await User.findOne({
    email,
  });

  if (existedUser) {
    throw new ApiError(409, "User with email already exists");
  }

  const user = await User.create({
    fullName,
    email,
    password,
  });

  const isPresent = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!isPresent) {
    throw new ApiError(500, "Cannot register due to some problem !!");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, isPresent, "User registered successfully !!"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const isUserThere = await User.findOne({ email }).select("+password");

  if (!isUserThere) {
    throw new ApiError(404, "User does not exist");
  }

  const checkpwd = await isUserThere.isPwdCorrect(password);

  if (!checkpwd) {
    throw new ApiError(401, "Password is incorrect");
  }

  const { accessToken, refreshToken } = await generateAccessandRefreshToken(
    isUserThere._id
  );

  const loggedInUser = await User.findById(isUserThere._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User successfully logged in"
      )
    );
});

const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    throw new ApiError(400, "Google credential is required");
  }

  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const { email, name, email_verified } = payload;

  if (!email_verified) {
    throw new ApiError(400, "Google email is not verified");
  }

  let user = await User.findOne({ email }).select("+password");

  if (!user) {
    const randomPassword = crypto.randomBytes(16).toString("hex");
    user = await User.create({
      fullName: name,
      email,
      password: randomPassword,
      isEmailVerified: true,
    });
  }

  const { accessToken, refreshToken } = await generateAccessandRefreshToken(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User successfully logged in with Google"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
  
  if (token) {
    try {
      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      await User.findByIdAndUpdate(
        decodedToken._id,
        {
          $set: {
            refreshToken: undefined,
          },
        },
        {
          new: true,
        }
      );
    } catch (error) {
      // Ignore token verification or user update errors on logout
    }
  }

  const options = {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }
  let decodeToken;
  try {
    decodeToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
  } catch (error) {
    throw new ApiError(401, "Invalid or malformed refresh token");
  }

  const user = await User.findById(decodeToken?._id);

  if (!user) {
    throw new ApiError(401, "refresh token not found it is invalid");
  }

  if (incomingRefreshToken !== user?.refreshToken) {
    throw new ApiError(401, "Refresh Token is expired");
  }

  const options = {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  };

  const { accessToken, newRefreshToken } = await generateAccessandRefreshToken(
    user?._id
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          accessToken,
          refreshToken: newRefreshToken,
        },
        "refresh token now renewed"
      )
    );
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password")

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!req.user.isEmailVerified) {
    throw new ApiError(403, "Please verify your email to continue");
  }

  const ispasswordCorrect = await user.isPwdCorrect(oldPassword);

  if (!ispasswordCorrect) {
    throw new ApiError(401, "Your old password is invalid");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "new password does not match confirm password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password is changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const updateAccountDetail = asyncHandler(async (req, res) => {
  const { fullName } = req.body;
  if (!fullName) {
    throw new ApiError(400, "Full name is requires");
  }

  if (!req.user.isEmailVerified) {
    throw new ApiError(403, "Please verify your email to continue");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account detail updated successfully"));
});

export {
  registerUser,
  loginUser,
  googleLogin,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetail,
};