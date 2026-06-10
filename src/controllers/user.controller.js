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

export {
  registerUser,
  loginUser,
  refreshAccessToken,
  logOutUser
};