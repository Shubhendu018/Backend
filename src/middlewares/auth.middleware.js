import {apiError} from "../utils/APIerrors.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import {User} from "../models/user.model.js";

export const verifyJWT=asyncHandler(async(req,res,next)=>{
  //get token from cookies
  //verify token
 try{
  const token = req.cookies?.accessToken||req.headers?.("authorization")?.replace("Bearer ","")
 
  if(!token){
     throw new apiError(401,"Unauthorized");
   } 
  
   const decodeToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
   if(!decodeToken){
     throw new apiError(401,"Unauthorized");
   }
     const user=await User.findById(decodeToken._id).select("-password -refreshToken");
     if(!user){
       throw new apiError(401,"Unauthorized");
     }
     req.user=user;
     next();
 }catch(error){
   throw new apiError(401,"Unauthorized");
 }
});