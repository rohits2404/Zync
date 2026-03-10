export const protectRoute = (req, res, next) => {
    const { userId } = req.auth;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized - You Must Be Logged In" });
    }
    next();
};