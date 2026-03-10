import { StreamChat } from "stream-chat";

// Singleton with validation
if (!process.env.STREAM_API_KEY || !process.env.STREAM_API_SECRET) {
    throw new Error("Missing Stream API credentials in process.environment variables");
}

const streamClient = StreamChat.getInstance(
    process.env.STREAM_API_KEY, 
    process.env.STREAM_API_SECRET
);

// ─── User Operations ──────────────────────────────────────────────────────────

export const upsertStreamUser = async (userData) => {
    if (!userData?.id) throw new Error("upsertStreamUser: userData.id is required");
    try {
        await streamClient.upsertUser(userData);
        return userData;
    } catch (error) {
        console.error("[Stream] Failed to upsert user:", userData.id, error.message);
        throw error; // let the caller handle it
    }
};

export const deleteStreamUser = async (userId) => {
    if (!userId) throw new Error("deleteStreamUser: userId is required");
    try {
        // "hard" delete removes the user entirely; use "soft" if you want to preserve messages
        await streamClient.deleteUser(userId.toString(), {
            mark_messages_deleted: false,
            hard_delete: false,
        });
    } catch (error) {
        console.error("[Stream] Failed to delete user:", userId, error.message);
        throw error;
    }
};

// ─── Token Generation ─────────────────────────────────────────────────────────

const TOKEN_EXPIRY_SECONDS = 60 * 60; // 1 hour

export const generateStreamToken = (userId) => {
    if (!userId) throw new Error("generateStreamToken: userId is required");
    try {
        const issuedAt = Math.floor(Date.now() / 1000);
        const expiresAt = issuedAt + TOKEN_EXPIRY_SECONDS;
        return streamClient.createToken(userId.toString(), expiresAt, issuedAt);
    } catch (error) {
        console.error("[Stream] Failed to generate token for user:", userId, error.message);
        throw error;
    }
};

// ─── Channel Operations ───────────────────────────────────────────────────────

const CHANNEL_QUERY_LIMIT = 30; // Stream's max per page

export const addUserToPublicChannels = async (userId) => {
    if (!userId) throw new Error("addUserToPublicChannels: userId is required");
    try {
        const channels = await streamClient.queryChannels(
            { type: "messaging", discoverable: true },
            { last_message_at: -1 },
            { limit: CHANNEL_QUERY_LIMIT }
        );
        if (!channels.length) return;
        // Add to all channels in parallel
        await Promise.all(channels.map((channel) => channel.addMembers([userId.toString()])));
    } catch (error) {
        console.error("[Stream] Failed to add user to public channels:", userId, error.message);
        throw error;
    }
};