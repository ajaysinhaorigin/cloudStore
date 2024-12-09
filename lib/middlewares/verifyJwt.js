import jwt from "jsonwebtoken";
import User from "../models/user.model";
import { mongodbConfig } from "../dbConnection/config";
import { utils } from "../utils/server-utils";
import { cookies } from "next/headers";

export const verifyJWT = (cb) => async (req, res) => {
  const cookieStore = await cookies();

  try {
    const token =
      req.cookies?.get("accessToken")?.value ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return utils.responseHandler({
        message: "Authorization header is missing",
        status: 401,
        success: false,
      });
    }

    const decodedToken = jwt.verify(token, mongodbConfig.accessTokenSecret);

    const user = await User.findById(decodedToken._id).select(
      "-password -emailVerificationToken -emailVerificationExpiry -isEmailVerified -refreshToken -createdAt -updatedAt -__v"
    );

    if (!user) {
      utils.clearCookies(cookieStore);
      return utils.responseHandler({
        message: "Invalid token",
        status: 401,
        success: false,
      });
    }

    req.user = user; // Attach user to the request
    return await cb(req, res);
  } catch (error) {
    return utils.responseHandler({
      message: "Something went wrong while verifying token",
      status: 401,
      success: false,
    });
  }
};
