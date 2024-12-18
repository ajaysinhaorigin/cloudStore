import { asyncHandler } from "../../../../lib/utils/asyncHandler";
import { verifyJWT } from "../../../../lib/middlewares/verifyJwt";
import { utils } from "../../../../lib/utils/server-utils";
import connectDB from "../../../../lib/dbConnection";
import File from "../../../../lib/models/file.model";
import mongoose from "mongoose";

export const GET = asyncHandler(async (req, _) => {
  try {
    await connectDB();

    // Aggregation to optimize performance
    const totalSpace = await File.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId("674f3a9d2c6ac148d91c13c6"),
        },
      },
      {
        $group: {
          _id: "$type",
          totalSize: { $sum: "$size" },
          latestDate: { $max: "$updatedAt" },
        },
      },
    ]);

    const formattedSpace = {
      image: { size: 0, latestDate: "" },
      document: { size: 0, latestDate: "" },
      video: { size: 0, latestDate: "" },
      audio: { size: 0, latestDate: "" },
      other: { size: 0, latestDate: "" },
      used: 0,
      all: 1 * 1024 * 1024 * 1024,
    };

    totalSpace.forEach(({ _id, totalSize, latestDate }) => {
      formattedSpace[_id] = { size: totalSize, latestDate };
      formattedSpace.used += totalSize;
    });

    return utils.responseHandler({
      message: "Total space fetched successfully",
      data: { totalSpace: formattedSpace },
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
});
