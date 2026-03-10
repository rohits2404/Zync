import { getAuth } from "@clerk/express";

export const protectRoute = (req, res, next) => {
    const { userId } = getAuth(req);

    if (!userId) {
        return res.status(401).json({
            message: "Unauthorized - You Must Be Logged In",
        });
    }

    req.auth = { userId }; // attach it so controllers can use it
    next();
};
