import { generateStreamToken } from "../config/stream.js";

export const getStreamToken = async (req, res) => {
    try {
        const { userId } = req.auth; 
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized - You Must be logged in" });
        }
        const token = generateStreamToken(userId);
        return res.status(200).json({ token });
    } catch (error) {
        console.error("[Stream] Failed to Generate Token:", error.message);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};