import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected Successfully:", conn.connection.host);
    } catch (error) {
        console.log("Error Connecting To MongoDB:", error);
        process.exit(1); // Status code 1 indicates an error, 0 indicates success
    }
};