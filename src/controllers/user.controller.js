import {asyncHandler} from "../utils/asyncHandler.js";
import {apiError} from "../utils/APIerrors.js";
import{User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {apiResponse} from "../utils/apiResponse.js";

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
    throw new apiError("All fields are required",400);
  }
 const existingUser = User.findOne({
    $or:[
      {email},
      {username}
    ]
  })
  if(existingUser){
    throw new apiError("User already exists",409);
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  if(!avatarLocalPath){
    throw new apiError("avatar is required",400);
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if(!avatar){
    throw new apiError("avatar is a required field",400);
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
    throw new apiError("User creation failed",500);
  }

  return res.status(201).json(
    new apiResponse(200,"User registered successfully",createdUser)
  )

});
export {
  registerUser
};