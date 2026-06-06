import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET  
});  

const uploadOnCloudinary =async (localFilePath) => {
  try{
    if(!localFilePath)return null;  
    const cloudinaryResponse = await cloudinary.uploader.upload(localFilePath,{resource_type:"auto"});
   // console.log("File is uploaded on Cloudinary successfully", cloudinaryResponse.url);
   fs.unlinkSync(localFilePath);
    return cloudinaryResponse;
  } catch(error) {
  console.error("Cloudinary upload error:", error.message); // ADD THIS
  fs.unlinkSync(localFilePath);
  return null;
}

}
export {uploadOnCloudinary};