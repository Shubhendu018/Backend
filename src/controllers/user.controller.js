import {asyncHandler} from "../utils/asyncHandler.js";
import {apiError} from "../utils/APIerrors.js";
import{User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {apiResponse} from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import fs from "fs";


const generateAccessAndRefreshTokens=async(userId)=>{
  try{ 
    const user=await User.findById(userId);
    const accessToken=user.generateAccessToken();
    const refreshToken=user.generateRefreshToken();
    user.refreshToken=refreshToken;
    await user.save({validateBeforeSave:false});
    return {accessToken,refreshToken};
      
  }catch(error){
    throw new apiError(500,"Error while generating access and refresh tokens");
  }
}

const cleanupFiles = (...paths) => {
  paths.forEach(path => { if (path && fs.existsSync(path)) fs.unlinkSync(path); });
};
const registerUser=asyncHandler(async(req,res)=>{
  //get user data from req.body
  //validate user data
  //check if the user already exists
  //check for images
  //check for avatar
  //upload images to cloudinary
  //create user object-create entry in db 
  //remove password and referesh token from the response
  //check for user creation
  //return response
  const {username,fullName, email, password} = req.body
  if ([username,fullName, email, password].some(field => field?.trim() === "")) {
    throw new apiError(400,"All fields are required");
  }
 const existingUser = await User.findOne({
    $or:[
      {email},
      {username}
    ]
  })
  if(existingUser){
    throw new apiError(409,"User already exists");
  }
 //
console.log("files:", req.files);
console.log("body:", req.body);
// line 53
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  if(!avatarLocalPath){
    cleanupFiles(coverImageLocalPath);
    throw new apiError(400,"avatar is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if(!avatar){
     cleanupFiles(coverImageLocalPath);
    throw new apiError(400,"avatar is a required field");
  }
  const user=await User.create({
    username:username.toLowerCase(),
    fullName,
    email,
    avatar:avatar.url,
    coverImage:coverImage.url||"",
    password
  })

  const createdUser = await User.findById(user._id).select("-password -refreshToken")
  if(!createdUser){
    throw new apiError(500,"User creation failed");
  }

  return res.status(200).json(
    new apiResponse(200,"User registered successfully",createdUser)
  )

});

const loginUser=asyncHandler(async(req,res)=>{
  //get email and password from req.body
  //validate email and password
  //check if user exists with the given email
  //compare the password
  //generate access token and refresh token
  //save refresh token in db
  //return response with access token and user data
  const {email,username,password}=req.body;
  if([email,password,username].some(field=>field?.trim()==="")){
    throw new apiError(400,"Email, username, and password are required");
  }
  const user=await User.findOne({
    $or:[
      {email},
      {username}
    ]
  })

  if(!user){
    throw new apiError(404,"User not found");
  }

  const isPasswordCorrect=await user.isPasswordCorrect(password);
  if(!isPasswordCorrect){
    throw new apiError(401,"Invalid credentials");
  }
  const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);
  const loggedInUser = await User.findByIdAndUpdate(user._id, { refreshToken }, { new: true, runValidators: false }).select("-password -refreshToken");
 
  const options={
    httpOnly:true,
    secure:process.env.NODE_ENV==="production",}
 
  return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
    new apiResponse(200,{
      user: loggedInUser,
      accessToken,
      refreshToken
    },"User logged in successfully")
  )
});
 const logOutUser=asyncHandler(async(req,res)=>{
  await User.findByIdAndUpdate(req.user._id, { $set: { refreshToken: undefined } }, { new: true, runValidators: false }).select("-password -refreshToken");

  const options={
    httpOnly:true,
    secure:process.env.NODE_ENV==="production",
  }
  return res
  .status(200)
  .cookie("accessToken","",{...options,expires:new Date(0)})
  .cookie("refreshToken","",{
    ...options,expires:new Date(0) 
  }).json(
    new apiResponse(200,"User logged out successfully")
  )  
});

const refreshAccessToken=asyncHandler(async(req,res)=>{
  const incomingRefreshToken=req.cookies.refreshToken||req.body.refreshToken;
  if(!incomingRefreshToken){
    throw new apiError(401,"Refresh token is required");
  }
  try{
    const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
  const user=await User.findById(decodedToken?.userId);
  if(!user){
    throw new apiError(404,"User not found");
  }   
  if(user.refreshToken!==incomingRefreshToken){
    throw new apiError(401,"Invalid refresh token");
  } 
  const options={
    httpOnly:true,
    secure:true
  }
  const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);
  return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newRefreshToken, options).json(
    new apiResponse(200,{
      accessToken,
      refreshToken: newRefreshToken  
    },"Access token refreshed successfully")
  )}catch(error){
    throw new apiError(401,error?.message || "Invalid refresh token");
  }
});

const changeCurrentUserPassword=asyncHandler(async(req,res)=>{
  const {currentPassword, newPassword}=req.body;
  const user=await User.findById(req.user._id);
  const isPasswordCorrect=await user.isPasswordCorrect(currentPassword);

  if(!isPasswordCorrect){
    throw new apiError(401,"Current password is incorrect");
  }

  user.password=newPassword;
  await user.save({validateBeforeSave:false});

  return res.status(200).json(
    new apiResponse(200,"Password changed successfully")
  )
});

const getCurrentUser=asyncHandler(async(req,res)=>{
  res.status(200).json(
    new apiResponse(200,"User details fetched successfully",req.user)
  )
});

const updateAccountDetails=asyncHandler(async(req,res)=>{
  const {fullName,email}=req.body;
  if([fullName,email].some(field=>field?.trim()==="")){
    throw new apiError(400,"Full name and email are required");
  }
  const user=await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName,
        email
       }
    },
    { new: true, runValidators: false }
  ).select("-password");

  return res.status(200).json(
    new apiResponse(200,"Account details updated successfully",user)
  )
});

const updateUserAvatar=asyncHandler(async(req,res)=>{
  const avatarLocalPath = req.file?.path;
  if(!avatarLocalPath){
    throw new apiError(400,"Avatar image is required");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if(!avatar.url){
    throw new apiError(500,"Error while uploading avatar");
  }
  const user=await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar:avatar.url
      }
    },
    { new: true, runValidators: false }
  ).select("-password");

  return res.status(200).json(
    new apiResponse(200,"Avatar updated successfully",user)
  )
});

const updateCoverImage=asyncHandler(async(req,res)=>{
  const coverImageLocalPath=req.file?.path;
  if(!coverImageLocalPath){
    throw new apiError(400,"cover Image is missing");
  }
  const coverImage=await uploadOnCloudinary(coverImageLocalPath);
  if(!coverImage.url){
    throw new apiError(500,"Error While uploading the file")
    }
  
    const user=await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set:{
          coverImage:coverImage.url
        }
      },{new:true,runValidators:false}
    ).select("-password");

    return res.status(200).json(
      new apiResponse(200,"coverImage updated successfully",user)
    )
  
});

const getUserChannelProfile =asyncHandler(async(req,res)=>{
  const {username}=req.params

  if(!username?.trim()){
    throw new apiError(400,"username is missing")
  }

const channel= await User.aggregate([
  {
    $match:{
      username: username?.toLowerCase()
    }
  },
  {
    $lookup:{
      from:"Subscription",
      localField:"_id",
      foreignField:"channel",
      as:"subscribers"
    
    }
  },
  {
    $lookup:{
      from:"Subscription",
      localField:"_id",
      foreignField:"subscriber",
      as:"subscribedTo"
    }
  },
  {
     $addFields:{
      subscriberCount:{
        $size:"subscribers"
     },
     channelsSubscribedToCount:{
      $size:"subscribedTo"
     },
     isSubscribed:{
      $cond:{
        if:{$in:[req.user?._id,"$subscriber.subscriber"]},
        then:true,
        else:false
      }
     }
     }
  },
  {
    $project:{
      fullName: 1,
      username:1,
      subscriberCount:1,
      channelsSubscribedToCount:1,
      isSubscribed:1,
      avatar:1,
      coverImage:1,
      email:1
    }
  }

]);
if(!channel?.length){
  throw new apiError(404,"channel does not exist")
}
return res
.status(200)
.json(
  new apiResponse(200,channel[0],"User channel fetched successfully")
)      

});

const getWatchHistory= asyncHandler(async(req,res)=>{
  const user=await User.aggregate([
    {
      $match:{
        _id:new mongoose.Types.ObjectId(req.user._id)
      }
    },{
      $lookup:{
        from:"Videos",
        localField:"watchHistory",
        foreignField:"_id",
        as:"watchHistory",
        pipeline:[{
          $lookup:{
            from:"Users",
            localField:"owner",
            forgienField:"_id",
            as:"owner",
            pipeline:[{
              $project:{
                fullName:1,
                username:1,
                avatar:1
              }
            }]


          }
        },{
          $addfield:{
            owner:{
              $first:"$owner"
            }
          }
        }
      ]
      }
    }
  ])
 res
 .status(200)
 .json(

  new apiResponse(200,user[0].watchHistory,"watch history fetched successfully")
 )
})

export {
  registerUser,
  loginUser,
  refreshAccessToken,
  logOutUser,
  changeCurrentUserPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory
};
 