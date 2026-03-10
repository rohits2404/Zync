import { Inngest } from "inngest";
import { connectDB } from "./db.js";
import { User } from "../models/User.js";
import { addUserToPublicChannels, deleteStreamUser, upsertStreamUser } from "./stream.js";

export const inngest = new Inngest({ id: "slack-clone" });

// ─── User Created ─────────────────────────────────────────────────────────────

const syncUser = inngest.createFunction(
    {
        id: "sync-user-on-created",
        retries: 3,
        onFailure: async ({ error, event }) => {
            console.error("[Inngest] syncUser permanently failed:", event.data?.id, error.message);
        },
    },
    { event: "clerk/user.created" },
    async ({ event, step }) => {
        const { id, email_addresses, first_name, last_name, image_url } = event.data;

        // Validate required fields before doing any work
        if (!id || !email_addresses?.[0]?.email_address) {
            throw new Error(`syncUser: missing required fields for clerk user ${id}`);
        }

        const userData = {
            clerkId: id,
            email: email_addresses[0].email_address,
            name: `${first_name || ""} ${last_name || ""}`.trim(),
            image: image_url || "",
        };

        // Each step is retried independently and only runs once on success
        await step.run("create-db-user", async () => {
            await connectDB();
            await User.create(userData);
        });

        await step.run("upsert-stream-user", async () => {
            await upsertStreamUser({
                id: userData.clerkId,
                name: userData.name,
                image: userData.image,
            });
        });

        await step.run("add-to-public-channels", async () => {
            await addUserToPublicChannels(userData.clerkId);
        });

        return { success: true, clerkId: id };
    }
);

// ─── User Deleted ─────────────────────────────────────────────────────────────

const deleteUserFromDB = inngest.createFunction(
    {
        id: "delete-user-on-deleted",
        retries: 3,
        onFailure: async ({ error, event }) => {
            console.error("[Inngest] deleteUser permanently failed:", event.data?.id, error.message);
        },
    },
    { event: "clerk/user.deleted" },
    async ({ event, step }) => {
        const { id } = event.data;

        if (!id) throw new Error("deleteUser: missing user id in event payload");

        await step.run("delete-db-user", async () => {
            await connectDB();
            await User.deleteOne({ clerkId: id });
        });

        await step.run("delete-stream-user", async () => {
            await deleteStreamUser(id.toString());
        });

        return { success: true, clerkId: id };
    }
);

export const functions = [syncUser, deleteUserFromDB];