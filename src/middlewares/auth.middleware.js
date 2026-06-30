import {apiError} from "../utils/APIerrors.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import {User} from "../models/user.model.js";

export const verifyJWT = asyncHandler(async(req, res, next) => {
  try {
    const token = req.cookies?.accessToken || req.headers?.authorization?.replace("Bearer ", "");
    console.log("Token:", token);

    if (!token) {
      throw new apiError(401, "Unauthorized");
    }

    const decodeToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    console.log("Decoded:", decodeToken);

    if (!decodeToken) {
      throw new apiError(401, "Unauthorized");
    }

    const user = await User.findById(decodeToken.userId).select("-password -refreshToken");
    if (!user) {
      throw new apiError(401, "Unauthorized");
    }

    req.user = user;
    next();
  } catch (error) {
    console.log("Auth error:", error.message);
    throw new apiError(401, "Unauthorized");
  }
});