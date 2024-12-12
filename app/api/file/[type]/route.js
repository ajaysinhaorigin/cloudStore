import { verifyJWT } from "../../../../lib/middlewares/verifyJwt";
import { asyncHandler } from "../../../../lib/utils/asyncHandler";
import { utils } from "../../../../lib/utils/server-utils";
import connectDB from "../../../../lib/dbConnection";
import File from "../../../../lib/models/file.model";
import mongoose from "mongoose";

export const GET = asyncHandler(
  verifyJWT(async (req, { params }) => {
    try {
      await connectDB();

      const typeParam = (await params)?.type || [];
      const { searchParams } = new URL(req.url);
      const searchText = searchParams.get("searchText");
      const sort = searchParams.get("sort");

      const sortOrder = sort === "desc" ? -1 : 1;
      const searchPattern = new RegExp(searchText.trim(), "i");

      const query = {
        $or: [
          { owner: new mongoose.Types.ObjectId(req.user._id) },
          { users: { $in: [req.user.email] } },
        ],
      };

      if (typeParam) {
        const typeArray = typeParam.split(",").filter((t) => t.trim() !== "");
        if (typeArray.length > 0 && typeArray[0] !== "all") {
          query.type = { $in: typeArray };
        }
      }

      if (searchPattern) {
        query.$and = [
          {
            $or: [
              { name: { $regex: searchPattern } },
              { type: { $regex: searchPattern } },
            ],
          },
        ];
      }

      const files = await File.aggregate([
        {
          $match: query,
        },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
            pipeline: [
              {
                $project: {
                  fullName: 1,
                  email: 1,
                  avatar: 1,
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "users",
            foreignField: "email",
            as: "users",
            pipeline: [
              {
                $project: {
                  fullName: 1,
                  email: 1,
                  avatar: 1,
                },
              },
            ],
          },
        },
        {
          $addFields: {
            owner: {
              $first: "$owner",
            },
          },
        },
        {
          $addFields: {
            users: {
              $map: {
                input: "$users",
                as: "user",
                in: {
                  email: "$$user.email",
                  fullName: "$$user.fullName",
                  avatar: "$$user.avatar",
                },
              },
            },
          },
        },
        {
          $sort: {
            createdAt: sortOrder,
          },
        },
        {
          $project: {
            __v: 0,
          },
        },
      ]);

      return utils.responseHandler({
        message: "files fetched successfully",
        data: {
          total: files.length,
          files: files,
        },
        status: 200,
        success: true,
      });
    } catch (error) {
      return utils.responseHandler({
        message: error.message || "Internal Server Error while fetching files",
        status: error.status || 500,
        success: false,
      });
    }
  })
);
